#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseTomlString(contents, key) {
  const match = contents.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"\\s*$`, 'm'));
  return match?.[1] ?? null;
}

function run(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('exit', (code) => {
      if (code === 0) resolvePromise(undefined);
      else rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

function main() {
  const wranglerTomlPath = resolve(process.cwd(), 'wrangler.toml');
  const wranglerToml = readFileSync(wranglerTomlPath, 'utf-8');

  const projectName = parseTomlString(wranglerToml, 'name');
  const outputDir = parseTomlString(wranglerToml, 'pages_build_output_dir');

  if (!projectName) {
    throw new Error('Missing `name` in wrangler.toml (required for Pages project name).');
  }
  if (!outputDir) {
    throw new Error('Missing `pages_build_output_dir` in wrangler.toml (required for Pages output directory).');
  }

  const args = [
    'dlx',
    'wrangler@^4',
    'pages',
    'deploy',
    outputDir,
    '--project-name',
    projectName,
  ];

  // Attach CI metadata when available (useful in Cloudflare build logs).
  if (process.env.CF_PAGES_BRANCH) args.push('--branch', process.env.CF_PAGES_BRANCH);
  if (process.env.CF_PAGES_COMMIT_SHA) args.push('--commit-hash', process.env.CF_PAGES_COMMIT_SHA);

  return run('pnpm', args);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
