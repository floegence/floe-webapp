import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inspectInputClasses, inspectInputCSS } from './input-focus-policy.mjs';

function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) return [];
    const child = join(path, entry.name);
    return entry.isDirectory() ? files(child) : [child];
  });
}
const paths = ['packages', 'apps'].flatMap(files);
const classes = new Set();
const violations = [];
// Immutable design evidence includes the historical focus treatment. It is never
// imported by production components; refuse any change before excluding it.
const referenceRoot = 'apps/demo/public/workbench-reference/';
const referenceManifest = JSON.parse(readFileSync(`${referenceRoot}manifest.json`, 'utf8'));
const referenceCSS = new Set(
  ['demo.css', 'baseline.css', 'composition.css'].map((name) => {
    const path = referenceRoot + name;
    const hash = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (hash !== referenceManifest.files[name])
      throw new Error(`Frozen reference changed: ${path}`);
    return path;
  })
);
for (const path of paths.filter((path) => path.endsWith('.tsx'))) {
  const result = inspectInputClasses(readFileSync(path, 'utf8'), path);
  result.inputClasses.forEach((name) => classes.add(name));
  violations.push(...result.violations);
}
for (const path of paths.filter((path) => path.endsWith('.css') && !referenceCSS.has(path))) {
  violations.push(...inspectInputCSS(readFileSync(path, 'utf8'), classes, path));
}
if (violations.length) throw new Error(violations.join('\n'));
console.log('Input focus source policy passed.');
