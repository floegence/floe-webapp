import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const patch = 'patches/picomatch@4.0.7.patch';
const expiry = '2026-12-02T00:00:00Z';
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function pnpmJson(args, advisoryExit = false) {
  const run = spawnSync('pnpm', [...args, '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (run.error) throw run.error;
  assert(run.status === 0 || (advisoryExit && run.status === 1), `${args.join(' ')} failed: ${run.stderr || run.stdout}`);
  return { status: run.status, data: JSON.parse(run.stdout) };
}

function installations(tree) {
  const paths = new Set();
  function visit(node) {
    if (node.from === 'picomatch') {
      assert.equal(node.version, '4.0.7');
      paths.add(node.path);
    }
    for (const key of ['dependencies', 'optionalDependencies', 'devDependencies']) {
      for (const child of Object.values(node[key] ?? {})) visit(child);
    }
  }
  assert(Array.isArray(tree) && tree.length > 0);
  tree.forEach(visit);
  return paths;
}

export function checkException({ now, production, installed, patchHash, parserHashes, report }) {
  assert(now < Date.parse(expiry), `picomatch exception expired at ${expiry}`);
  assert.equal(installations(production).size, 0, 'picomatch reached a production dependency');
  assert(installations(installed).size > 0, 'expected a build-time picomatch installation');
  assert.equal(patchHash, 'f47199b4e6ec04b7bacd1c8ad3fa6a1f19712f749faf23e15b8f944b00e5c8e2');
  for (const path of installations(installed)) {
    assert.equal(parserHashes.get(path), '5573fab5244f4b5ac16c8380e49260f010cb291c9a68bc630726ae98758936f8');
  }
  assert(!report.error && report.advisories && report.metadata?.vulnerabilities, 'missing complete audit report');
  const advisories = Object.values(report.advisories);
  assert.equal(advisories.length, 1, 'review the changed advisory set');
  const [entry] = advisories;
  assert.equal(entry.github_advisory_id, 'GHSA-fc5q-39xc-vjpf');
  assert.deepEqual(entry.cves, ['CVE-2026-112366']);
  assert.equal(entry.module_name, 'picomatch');
  assert.equal(entry.patched_versions, '<0.0.0', 'upgrade to the official fix');
  assert(entry.findings.length > 0 && entry.findings.every(record => record.version === '4.0.7'));
  assert.deepEqual(report.metadata.vulnerabilities, { info: 0, low: 0, moderate: 0, high: 1, critical: 0 });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const audit = pnpmJson(['audit', '--audit-level=low'], true);
  console.log(JSON.stringify(audit.data.metadata ?? audit.data));
  if (audit.status !== 0) {
    const list = ['-r', 'list', '--depth', 'Infinity', 'picomatch'];
    const installed = pnpmJson(list).data;
    try {
      checkException({ now: Date.now(), production: pnpmJson([...list, '--prod']).data, installed,
        patchHash: digest(patch), parserHashes: new Map([...installations(installed)].map(path => [path, digest(join(path, 'lib/parse.js'))])), report: audit.data });
    } catch (error) {
      console.error(JSON.stringify(audit.data.advisories ?? audit.data));
      throw error;
    }
    console.log(`Accepted patched build-only picomatch for GHSA-fc5q-39xc-vjpf until ${expiry}`);
  } else {
    assert.fail('Audit changed: review and remove the temporary picomatch patch and exception');
  }
}
