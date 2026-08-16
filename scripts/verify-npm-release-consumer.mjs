#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';

const packageNames = [
  '@floegence/floe-webapp-core',
  '@floegence/floe-webapp-boot',
  '@floegence/floe-webapp-protocol',
  '@floegence/floe-webapp-init',
];
const version = JSON.parse(readFileSync('packages/core/package.json', 'utf8')).version;
const root = mkdtempSync(join(tmpdir(), 'floe-webapp-release-consumer-'));
writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'floe-webapp-release-consumer', private: true }, null, 2));
execFileSync('npm', [
  'install', '--prefix', root, '--no-audit', '--no-fund', '--ignore-scripts',
  ...packageNames.map((name) => `${name}@${version}`),
  'solid-js@1.9.11',
], { stdio: 'inherit' });

execFileSync(process.execPath, ['--input-type=module', '-e', [
  `import.meta.resolve('${packageNames[0]}')`,
  `await import('${packageNames[1]}')`,
  `await import('${packageNames[2]}')`,
].join(';')], { cwd: root, stdio: 'inherit' });

execFileSync('node', [join(root, 'node_modules', '.bin', 'floe-webapp-init'), '--help'], { cwd: root, stdio: 'inherit' });

const runtimeSmoke = join(root, 'verify-runtime-consumer.mjs');
copyFileSync(new URL('./verify-npm-release-runtime-consumer.mjs', import.meta.url), runtimeSmoke);
execFileSync(process.execPath, [runtimeSmoke], { cwd: root, stdio: 'inherit' });

const coreManifests = [];
function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) walk(path);
    else if (entry === 'package.json' && path.endsWith(join('@floegence', 'flowersec-core', 'package.json'))) coreManifests.push(path);
  }
}
walk(join(root, 'node_modules'));
if (coreManifests.length !== 1) throw new Error(`expected one Flowersec core package, found ${coreManifests.length}`);
const flowersecManifest = JSON.parse(readFileSync(coreManifests[0], 'utf8'));
if (flowersecManifest.version !== '2.5.1') throw new Error(`expected Flowersec 2.5.1, found ${flowersecManifest.version}`);
console.log(`verified clean consumer ${version} with one Flowersec core ${flowersecManifest.version}`);
