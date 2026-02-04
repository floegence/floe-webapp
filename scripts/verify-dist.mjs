#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

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

function walkFiles(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const abs = join(dir, entry);
      const st = statSync(abs);
      if (st.isDirectory()) {
        stack.push(abs);
      } else {
        out.push(abs);
      }
    }
  }
  return out;
}

function assertInitTemplates() {
  const templatesRoot = resolve(process.cwd(), 'packages/init/templates');
  assert(existsSync(templatesRoot), 'Missing init templates folder: packages/init/templates');

  const files = walkFiles(templatesRoot).filter((f) => /\.(ts|tsx)$/i.test(f));
  const violations = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    // Historical drift: templates used `commands[].handler`, but core expects `execute(ctx)`.
    if (/\bhandler\s*:/.test(content) || /\bsetActive\b/.test(content)) {
      violations.push(file);
    }
  }

  assert(
    violations.length === 0,
    `Init templates contain legacy command API usage (handler/setActive). Fix templates: ${violations
      .map((f) => f.replace(`${process.cwd()}/`, ''))
      .join(', ')}`
  );

  const cssFiles = walkFiles(templatesRoot).filter((f) => /\.css$/i.test(f));
  const cssViolations = [];

  for (const file of cssFiles) {
    const content = readFileSync(file, 'utf-8');
    if (content.includes('@floegence/floe-webapp-core/styles')) cssViolations.push(file);
    if (content.includes('@floegence/floe-webapp-core/tailwind')) continue;
    // Only enforce index.css (templates may add other plain CSS files later).
    if (file.endsWith('/src/index.css') || file.endsWith('\\src\\index.css')) cssViolations.push(file);
  }

  assert(
    cssViolations.length === 0,
    `Init templates must use @floegence/floe-webapp-core/tailwind (not /styles). Fix templates: ${cssViolations
      .map((f) => f.replace(`${process.cwd()}/`, ''))
      .join(', ')}`
  );
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
  assertFile('packages/core/dist/app.js');
  assertFile('packages/core/dist/app.d.ts');
  assertFile('packages/core/dist/full.js');
  assertFile('packages/core/dist/full.d.ts');
  assertFile('packages/core/dist/layout.js');
  assertFile('packages/core/dist/layout.d.ts');
  assertFile('packages/core/dist/deck.js');
  assertFile('packages/core/dist/deck.d.ts');
  assertFile('packages/core/dist/ui.js');
  assertFile('packages/core/dist/ui.d.ts');
  assertFile('packages/core/dist/icons.js');
  assertFile('packages/core/dist/icons.d.ts');
  assertFile('packages/core/dist/loading.js');
  assertFile('packages/core/dist/loading.d.ts');
  assertFile('packages/core/dist/launchpad.js');
  assertFile('packages/core/dist/launchpad.d.ts');
  assertFile('packages/core/dist/file-browser.js');
  assertFile('packages/core/dist/file-browser.d.ts');
  assertFile('packages/core/dist/chat.js');
  assertFile('packages/core/dist/chat.d.ts');
  assertFile('packages/core/dist/widgets.js');
  assertFile('packages/core/dist/widgets.d.ts');
  assertFile('packages/core/dist/styles.css');
  assertFile('packages/core/dist/tailwind.css');
  assertFile('packages/core/dist/floe.css');
  assertFile('packages/core/dist/themes/light.css');
  assertFile('packages/core/dist/themes/dark.css');
  assertFile('packages/protocol/dist/index.js');
  assertFile('packages/protocol/dist/index.d.ts');
  assertFile('packages/init/dist/index.mjs');

  // Package entrypoints must point to dist
  const corePkg = readJson('packages/core/package.json');
  const protocolPkg = readJson('packages/protocol/package.json');
  const initPkg = readJson('packages/init/package.json');

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
    corePkg.exports?.['./tailwind'] === './dist/tailwind.css',
    '@floegence/floe-webapp-core exports["./tailwind"] must be ./dist/tailwind.css'
  );

  const coreSubpaths = [
    'app',
    'full',
    'layout',
    'deck',
    'ui',
    'icons',
    'loading',
    'launchpad',
    'file-browser',
    'chat',
    'widgets',
  ];
  for (const key of coreSubpaths) {
    assert(
      corePkg.exports?.[`./${key}`]?.import === `./dist/${key}.js`,
      `@floegence/floe-webapp-core exports["./${key}"].import must be ./dist/${key}.js`
    );
    assert(
      corePkg.exports?.[`./${key}`]?.types === `./dist/${key}.d.ts`,
      `@floegence/floe-webapp-core exports["./${key}"].types must be ./dist/${key}.d.ts`
    );
  }

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

  assert(initPkg.name === '@floegence/floe-webapp-init', '@floegence/floe-webapp-init package name mismatch');
  assert(initPkg.main?.startsWith('./dist/'), '@floegence/floe-webapp-init main must point to ./dist/*');
  assert(initPkg.bin?.['floe-webapp-init']?.startsWith('./dist/'), '@floegence/floe-webapp-init bin must point to ./dist/*');
  assert(initPkg.files?.includes('templates'), '@floegence/floe-webapp-init must include templates in files');

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

  const tailwind = readFileSync(resolve(process.cwd(), 'packages/core/dist/tailwind.css'), 'utf-8');
  assert(tailwind.length > 0, 'Expected @floegence/floe-webapp-core tailwind.css to be non-empty');
  assert(
    !/^\s*@import\s+['"]tailwindcss['"]\s*;/m.test(tailwind),
    'Expected tailwind.css to not import tailwindcss'
  );
  assert(tailwind.includes('@source'), 'Expected tailwind.css to include @source for scanning dist JS');

  // Starter templates must stay aligned with public APIs.
  assertInitTemplates();
}

try {
  main();
  console.log('verify: ok');
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
