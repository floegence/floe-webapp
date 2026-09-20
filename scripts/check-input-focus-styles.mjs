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
for (const path of paths.filter((path) => path.endsWith('.tsx'))) {
  const result = inspectInputClasses(readFileSync(path, 'utf8'), path);
  result.inputClasses.forEach((name) => classes.add(name));
  violations.push(...result.violations);
}
for (const path of paths.filter((path) => path.endsWith('.css'))) {
  violations.push(...inspectInputCSS(readFileSync(path, 'utf8'), classes, path));
}
if (violations.length) throw new Error(violations.join('\n'));
console.log('Input focus source policy passed.');
