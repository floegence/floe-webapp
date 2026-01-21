#!/usr/bin/env node
import { spawn } from 'node:child_process';

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  return child;
}

function runOnce(command, args) {
  return new Promise((resolve, reject) => {
    const child = run(command, args);
    child.on('exit', (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

await Promise.all([
  runOnce('pnpm', ['--filter', '@floegence/floe-webapp-core', 'build']),
  runOnce('pnpm', ['--filter', '@floegence/floe-webapp-protocol', 'build']),
]);

const children = [
  run('pnpm', ['--filter', '@floegence/floe-webapp-core', 'dev']),
  run('pnpm', ['--filter', '@floegence/floe-webapp-protocol', 'dev']),
  run('pnpm', ['--filter', '@floegence/floe-webapp-demo', 'dev']),
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
