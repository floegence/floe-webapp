#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const packages = [
  '@floegence/floe-webapp-core',
  '@floegence/floe-webapp-boot',
  '@floegence/floe-webapp-protocol',
  '@floegence/floe-webapp-init',
];
const attempts = 12;
const delayMs = 5_000;

const packageVersions = new Map(packages.map((name) => {
  const packagePath = name.split('/').at(-1);
  const manifest = JSON.parse(readFileSync(`packages/${packagePath === 'floe-webapp-core' ? 'core' : packagePath === 'floe-webapp-boot' ? 'boot' : packagePath === 'floe-webapp-protocol' ? 'protocol' : 'init'}/package.json`, 'utf8'));
  return [name, manifest.version];
}));

for (const name of packages) {
  const version = packageVersions.get(name);
  const metadata = await retry(async () => {
    const response = await globalThis.fetch(`https://registry.npmjs.org/${encodeURIComponent(name).replace('%2F', '/')}/${version}`);
    if (!response.ok) throw new Error(`registry returned ${response.status}`);
    return await response.json();
  });
  if (metadata.version !== version || typeof metadata.dist?.tarball !== 'string' || typeof metadata.dist?.integrity !== 'string') {
    throw new Error(`registry metadata mismatch for ${name}@${version}`);
  }
  const tarballResponse = await globalThis.fetch(metadata.dist.tarball);
  if (!tarballResponse.ok) throw new Error(`tarball readback failed for ${name}@${version}`);
  const bytes = new Uint8Array(await tarballResponse.arrayBuffer());
  const digest = createHash('sha512').update(bytes).digest('base64');
  if (metadata.dist.integrity !== `sha512-${digest}`) throw new Error(`tarball integrity mismatch for ${name}@${version}`);
  console.log(`verified ${name}@${version}`);
}

async function retry(operation) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
    if (attempt < attempts) await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
