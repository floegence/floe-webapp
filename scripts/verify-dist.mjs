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

  assert(corePkg.name === '@floegence/floe-webapp-core', '@floegence/floe-webapp-core package name mismatch');
  assert(corePkg.main?.startsWith('./dist/'), '@floegence/floe-webapp-core main must point to ./dist/*');
  assert(corePkg.types?.startsWith('./dist/'), '@floegence/floe-webapp-core types must point to ./dist/*');
  assert(
    corePkg.exports?.['.']?.import?.startsWith('./dist/'),
    '@floegence/floe-webapp-core exports["."].import must point to ./dist/*'
  );
  assert(
    corePkg.exports?.['.']?.types?.startsWith('./dist/'),
    '@floegence/floe-webapp-core exports["."].types must point to ./dist/*'
  );
  assert(
    corePkg.exports?.['./styles'] === './dist/styles.css',
    '@floegence/floe-webapp-core exports["./styles"] must be ./dist/styles.css'
  );

  assert(
    protocolPkg.name === '@floegence/floe-webapp-protocol',
    '@floegence/floe-webapp-protocol package name mismatch'
  );
  assert(protocolPkg.main?.startsWith('./dist/'), '@floegence/floe-webapp-protocol main must point to ./dist/*');
  assert(protocolPkg.types?.startsWith('./dist/'), '@floegence/floe-webapp-protocol types must point to ./dist/*');
  assert(
    protocolPkg.exports?.['.']?.import?.startsWith('./dist/'),
    '@floegence/floe-webapp-protocol exports["."].import must point to ./dist/*'
  );
  assert(
    protocolPkg.exports?.['.']?.types?.startsWith('./dist/'),
    '@floegence/floe-webapp-protocol exports["."].types must point to ./dist/*'
  );

  // Repo rule: hidden markdown should never be committed
  const gitignore = readFileSync(resolve(process.cwd(), '.gitignore'), 'utf-8');
  assert(
    gitignore.split('\n').some((line) => line.trim() === '.*.md'),
    'Expected .gitignore to include `.*.md` to ignore dotfile markdown'
  );

  assertNoTrackedDotMarkdown();

  const styles = readFileSync(resolve(process.cwd(), 'packages/core/dist/styles.css'), 'utf-8');
  assert(styles.length > 0, 'Expected @floegence/floe-webapp-core styles.css to be non-empty');
  assert(styles.includes('--background'), 'Expected @floegence/floe-webapp-core styles.css to include theme variables');
}

try {
  main();
  console.log('verify: ok');
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
