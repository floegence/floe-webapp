#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function fileExists(path) {
  return existsSync(resolve(process.cwd(), path));
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf-8'));
}

function assertFile(path) {
  assert(fileExists(path), `Missing build output: ${path}`);
}

function assertNoTrackedDotMarkdown() {
  const trackedFiles = execSync('git ls-files', { encoding: 'utf-8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const trackedDotMarkdown = trackedFiles.filter((file) => /^\..*\.md$/i.test(file));
  assert(
    trackedDotMarkdown.length === 0,
    `Dotfile markdown must not be committed: ${trackedDotMarkdown.join(', ')}`
  );
}

function main() {
  // Build outputs
  assertFile('packages/core/dist/index.js');
  assertFile('packages/core/dist/index.d.ts');
  assertFile('packages/core/dist/styles.css');
  assertFile('packages/protocol/dist/index.js');
  assertFile('packages/protocol/dist/index.d.ts');

  // Package entrypoints must point to dist
  const corePkg = readJson('packages/core/package.json');
  const protocolPkg = readJson('packages/protocol/package.json');

  assert(corePkg.main?.startsWith('./dist/'), '@floe/core main must point to ./dist/*');
  assert(corePkg.types?.startsWith('./dist/'), '@floe/core types must point to ./dist/*');
  assert(corePkg.exports?.['.']?.import?.startsWith('./dist/'), '@floe/core exports["."].import must point to ./dist/*');
  assert(corePkg.exports?.['.']?.types?.startsWith('./dist/'), '@floe/core exports["."].types must point to ./dist/*');
  assert(corePkg.exports?.['./styles'] === './dist/styles.css', '@floe/core exports["./styles"] must be ./dist/styles.css');

  assert(protocolPkg.main?.startsWith('./dist/'), '@floe/protocol main must point to ./dist/*');
  assert(protocolPkg.types?.startsWith('./dist/'), '@floe/protocol types must point to ./dist/*');
  assert(
    protocolPkg.exports?.['.']?.import?.startsWith('./dist/'),
    '@floe/protocol exports["."].import must point to ./dist/*'
  );
  assert(
    protocolPkg.exports?.['.']?.types?.startsWith('./dist/'),
    '@floe/protocol exports["."].types must point to ./dist/*'
  );

  // Repo rule: hidden markdown should never be committed
  const gitignore = readFileSync(resolve(process.cwd(), '.gitignore'), 'utf-8');
  assert(
    gitignore.split('\n').some((line) => line.trim() === '.*.md'),
    'Expected .gitignore to include `.*.md` to ignore dotfile markdown'
  );

  assertNoTrackedDotMarkdown();

  const styles = readFileSync(resolve(process.cwd(), 'packages/core/dist/styles.css'), 'utf-8');
  assert(styles.length > 0, 'Expected @floe/core styles.css to be non-empty');
  assert(styles.includes('--background'), 'Expected @floe/core styles.css to include theme variables');
}

try {
  main();
  console.log('verify: ok');
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
