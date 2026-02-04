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

// Ensure workspace dependencies are installed and in sync with pnpm-lock.yaml.
// This prevents confusing build-time missing-module errors when node_modules is stale.
await runOnce('pnpm', ['install', '--frozen-lockfile']);

const useDist = process.argv.includes('--dist');

if (useDist) {
  // Dist mode: demo consumes packages via dist outputs (same shape as downstream apps).
  // Keep dist outputs in watch mode (core/protocol dev scripts).
  await Promise.all([
    runOnce('pnpm', ['--filter', '@floegence/floe-webapp-core', 'build']),
    runOnce('pnpm', ['--filter', '@floegence/floe-webapp-protocol', 'build']),
  ]);
}

const children = [
  ...(useDist
    ? [
        run('pnpm', ['--filter', '@floegence/floe-webapp-core', 'dev']),
        run('pnpm', ['--filter', '@floegence/floe-webapp-protocol', 'dev']),
        run('pnpm', ['--filter', '@floegence/floe-webapp-demo', 'dev'], {
          env: { ...process.env, FLOE_DEMO_DEV_MODE: 'dist' },
        }),
      ]
    : [
        // Workspace mode (default): demo imports packages/* sources directly for instant HMR.
        run('pnpm', ['--filter', '@floegence/floe-webapp-demo', 'dev'], {
          env: { ...process.env, FLOE_DEMO_DEV_MODE: 'workspace' },
        }),
      ]),
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
