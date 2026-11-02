import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const entries = ['index', 'ui', 'app'];
const files = entries.map((name) => 'packages/core/dist/' + name + '.d.ts');
const program = ts.createProgram(files, {
  skipLibCheck: true,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
});
const checker = program.getTypeChecker();
const snapshot = Object.fromEntries(
  entries.map((name, index) => {
    const source = program.getSourceFile(files[index]);
    assert(source, 'Build declarations before checking the public API');
    const symbol = checker.getSymbolAtLocation(source);
    return [
      name,
      checker
        .getExportsOfModule(symbol)
        .map((value) => value.name)
        .sort(),
    ];
  })
);
const path = 'packages/core/test/public-api.json';
if (process.argv.includes('--update')) {
  writeFileSync(path, JSON.stringify(snapshot, null, 2) + '\n');
  console.log('Updated the reviewable public export inventory');
} else {
  assert.deepEqual(
    snapshot,
    JSON.parse(readFileSync(path, 'utf8')),
    'Public exports changed: review compatibility and update the inventory explicitly'
  );
  console.log('Public export inventory matches built declarations');
}
