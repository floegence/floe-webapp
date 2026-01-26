#!/usr/bin/env node
import { spawn } from 'node:child_process';

function run(command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return child;
}

const children = [
  run('node', ['scripts/copy-style-assets.mjs', '--watch']),
  run('vite', ['build', '--watch']),
  run('vite', ['build', '--watch', '-c', 'vite.styles.config.ts']),
];

const shutdown = (signal) => {
  for (const child of children) {
    if (child.exitCode !== null) continue;
    child.kill(signal);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const exitCodes = await Promise.all(
  children.map(
    (child) =>
      new Promise((resolve) => {
        child.on('exit', (code) => resolve(code ?? 0));
      })
  )
);

process.exit(exitCodes.some((code) => code !== 0) ? 1 : 0);
