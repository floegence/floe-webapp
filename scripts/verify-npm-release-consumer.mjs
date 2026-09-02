#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const packageNames = [
  '@floegence/floe-webapp-core',
  '@floegence/floe-webapp-boot',
  '@floegence/floe-webapp-protocol',
  '@floegence/floe-webapp-init',
];
const version = JSON.parse(readFileSync('packages/core/package.json', 'utf8')).version;
const root = mkdtempSync(join(tmpdir(), 'floe-webapp-release-consumer-'));
process.once('exit', () => rmSync(root, { recursive: true, force: true }));
const packageSpecs = process.argv.includes('--packed')
  ? [
      ['@floegence/floe-webapp-core', 'packages/core'],
      ['@floegence/floe-webapp-boot', 'packages/boot'],
      ['@floegence/floe-webapp-protocol', 'packages/protocol'],
      ['@floegence/floe-webapp-init', 'packages/init'],
    ].map(([name, directory]) => {
      const packed = JSON.parse(
        execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', root], {
          cwd: directory,
          encoding: 'utf8',
        })
      );
      const filename = packed[0]?.filename;
      if (typeof filename !== 'string') throw new Error(`npm pack did not produce ${name}`);
      return join(root, filename);
    })
  : packageNames.map((name) => `${name}@${version}`);
writeFileSync(
  join(root, 'package.json'),
  JSON.stringify({ name: 'floe-webapp-release-consumer', private: true }, null, 2)
);
execFileSync(
  'npm',
  [
    'install',
    '--prefix',
    root,
    '--no-audit',
    '--no-fund',
    '--ignore-scripts',
    ...packageSpecs,
    'solid-js@1.9.11',
  ],
  { stdio: 'inherit' }
);

execFileSync(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    [
      `import.meta.resolve('${packageNames[0]}')`,
      `const boot = await import('${packageNames[1]}')`,
      `for (const name of ['createPrivateLoopbackControlplaneArtifactSource', 'createPrivateLoopbackDirectConnectionConfig']) if (typeof boot[name] !== 'function') throw new Error('missing Boot private-loopback export: ' + name)`,
      `await import('${packageNames[2]}')`,
    ].join(';'),
  ],
  { cwd: root, stdio: 'inherit' }
);

execFileSync('node', [join(root, 'node_modules', '.bin', 'floe-webapp-init'), '--help'], {
  cwd: root,
  stdio: 'inherit',
});

const runtimeSmoke = join(root, 'verify-runtime-consumer.mjs');
copyFileSync(new URL('./verify-npm-release-runtime-consumer.mjs', import.meta.url), runtimeSmoke);
execFileSync(process.execPath, [runtimeSmoke], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    FLOE_FLOWERSEC_SMOKE_PEER_DIR: fileURLToPath(
      new URL('./flowersec-smoke-peer/', import.meta.url)
    ),
  },
});

const coreManifests = [];
function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) walk(path);
    else if (
      entry === 'package.json' &&
      path.endsWith(join('@floegence', 'flowersec-core', 'package.json'))
    )
      coreManifests.push(path);
  }
}
walk(join(root, 'node_modules'));
if (coreManifests.length !== 1)
  throw new Error(`expected one Flowersec core package, found ${coreManifests.length}`);
const flowersecManifest = JSON.parse(readFileSync(coreManifests[0], 'utf8'));
if (flowersecManifest.version !== '5.0.0')
  throw new Error(`expected Flowersec 5.0.0, found ${flowersecManifest.version}`);
console.log(
  `verified clean consumer ${version} with one Flowersec core ${flowersecManifest.version}`
);
