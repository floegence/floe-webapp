#!/usr/bin/env node
import { spawn } from 'node:child_process';

const CORE_CLIENT_TEST_ROOT_PATHS = [
  'packages/core/test/deck-pointer-session.test.tsx',
  'packages/core/test/dialog-surface-scope.test.tsx',
  'packages/core/test/dropdown-surface-scope.test.tsx',
  'packages/core/test/file-context-menu-surface-scope.test.tsx',
  'packages/core/test/pointer-session.test.ts',
  'packages/core/test/infinite-canvas-wheel-routing.test.tsx',
  'packages/core/test/notes-overlay.test.tsx',
  'packages/core/test/overlay-mask-hotkeys.test.tsx',
  'packages/core/test/tabs-slider-geometry.test.tsx',
  'packages/core/test/workbench-projected-surface.test.tsx',
  'packages/core/test/workbench-navigation-center.test.ts',
  'packages/core/test/workbench-context-menu.test.tsx',
  'packages/core/test/workbench-widget-interaction.test.tsx',
  'packages/core/test/workbench-widget-instance-identity.test.tsx',
  'packages/core/test/workbench-filter-bar-pointer-session.test.tsx',
  'packages/core/test/workbench-surface-wheel-selection.test.tsx',
  'packages/core/test/workbench-surface-api.test.tsx',
];

function isFlag(arg) {
  return arg.startsWith('-');
}

function isCoreClientTestPath(arg) {
  return CORE_CLIENT_TEST_ROOT_PATHS.some(
    (path) => arg.includes(path) || arg.endsWith(path.replace(/^packages\/core\//, ''))
  );
}

function normalizePackagePath(arg) {
  return arg.replace(/^packages\/core\//, '');
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

const rawArgs = process.argv.slice(2);
const flags = rawArgs.filter(isFlag);
const positional = rawArgs.filter((arg) => !isFlag(arg));
const coreClientTestArgs = positional.filter(isCoreClientTestPath);
const otherArgs = positional.filter((arg) => !isCoreClientTestPath(arg));
const normalizedFlags = flags.includes('--run') ? flags : ['--run', ...flags];

const shouldRunRootSuite = positional.length === 0 || otherArgs.length > 0;
const shouldRunCoreClientSuite = positional.length === 0 || coreClientTestArgs.length > 0;

if (shouldRunRootSuite) {
  await run('pnpm', [
    'exec',
    'vitest',
    ...normalizedFlags,
    ...otherArgs,
    ...CORE_CLIENT_TEST_ROOT_PATHS.flatMap((path) => ['--exclude', path]),
  ]);
}

if (shouldRunCoreClientSuite) {
  const packagePaths =
    coreClientTestArgs.length > 0
      ? coreClientTestArgs.map(normalizePackagePath)
      : CORE_CLIENT_TEST_ROOT_PATHS.map(normalizePackagePath);

  await run('pnpm', [
    '--dir',
    'packages/core',
    'exec',
    'vitest',
    ...normalizedFlags,
    ...packagePaths,
  ]);
}
