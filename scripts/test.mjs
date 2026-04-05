#!/usr/bin/env node
import { spawn } from 'node:child_process';

const NOTES_OVERLAY_ROOT_PATH = 'packages/core/test/notes-overlay.test.tsx';
const NOTES_OVERLAY_PACKAGE_PATH = 'test/notes-overlay.test.tsx';

function isFlag(arg) {
  return arg.startsWith('-');
}

function isNotesOverlayPath(arg) {
  return arg.includes('notes-overlay.test.tsx');
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
const notesOverlayArgs = positional.filter(isNotesOverlayPath);
const otherArgs = positional.filter((arg) => !isNotesOverlayPath(arg));
const normalizedFlags = flags.includes('--run') ? flags : ['--run', ...flags];

const shouldRunRootSuite = positional.length === 0 || otherArgs.length > 0;
const shouldRunNotesOverlaySuite = positional.length === 0 || notesOverlayArgs.length > 0;

if (shouldRunRootSuite) {
  await run('pnpm', [
    'exec',
    'vitest',
    ...normalizedFlags,
    ...otherArgs,
    '--exclude',
    NOTES_OVERLAY_ROOT_PATH,
  ]);
}

if (shouldRunNotesOverlaySuite) {
  const packagePaths = notesOverlayArgs.length > 0
    ? notesOverlayArgs.map(normalizePackagePath)
    : [NOTES_OVERLAY_PACKAGE_PATH];

  await run('pnpm', [
    '--dir',
    'packages/core',
    'exec',
    'vitest',
    'run',
    ...packagePaths,
  ]);
}
