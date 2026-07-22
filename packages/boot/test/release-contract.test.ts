import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

function repoRoot(): string {
  let dir = __dirname;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'pnpm-lock.yaml'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  throw new Error('Could not find repository root');
}

function readText(path: string): string {
  return readFileSync(join(repoRoot(), path), 'utf-8');
}

function readJson<T>(path: string): T {
  return JSON.parse(readText(path)) as T;
}

type PackageJson = {
  version?: string;
  engines?: Record<string, string>;
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
};

describe('release dependency and runtime contract', () => {
  it('keeps Node engine, CI, release, and build targets aligned on Node 24', () => {
    const rootPkg = readJson<PackageJson>('package.json');
    const initPkg = readJson<PackageJson>('packages/init/package.json');
    const corePkg = readJson<PackageJson>('packages/core/package.json');
    const bootPkg = readJson<PackageJson>('packages/boot/package.json');
    const protocolPkg = readJson<PackageJson>('packages/protocol/package.json');
    const ci = readText('.github/workflows/ci.yml');
    const release = readText('.github/workflows/release.yml');
    const nodeVersion = readText('.node-version').trim();
    const initBuild = readText('packages/init/build.config.ts');

    expect(rootPkg.engines?.node).toBe('>=24.0.0');
    expect(corePkg.engines?.node).toBe('>=24.0.0');
    expect(bootPkg.engines?.node).toBe('>=24.0.0');
    expect(protocolPkg.engines?.node).toBe('>=24.0.0');
    expect(initPkg.engines?.node).toBe('>=24.0.0');
    expect(ci).toContain('node-version: 24');
    expect(release).toContain('node-version: 24');
    expect(nodeVersion).toBe('24');
    expect(initBuild).toContain("target: 'node24'");
  });

  it('keeps all published package versions aligned', () => {
    const corePkg = readJson<PackageJson>('packages/core/package.json');
    const bootPkg = readJson<PackageJson>('packages/boot/package.json');
    const protocolPkg = readJson<PackageJson>('packages/protocol/package.json');
    const initPkg = readJson<PackageJson>('packages/init/package.json');

    expect(corePkg.version).toBe('0.39.3');
    expect(bootPkg.version).toBe(corePkg.version);
    expect(protocolPkg.version).toBe(corePkg.version);
    expect(initPkg.version).toBe(corePkg.version);
  });

  it('builds the demo and all of its workspace dependencies for Pages', () => {
    const rootPkg = readJson<PackageJson>('package.json');

    expect(rootPkg.scripts?.['build:demo']).toBe(
      "NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter '@floegence/floe-webapp-demo...' build"
    );
  });

  it('uses the published flowersec-core release without local dependency shortcuts', () => {
    const bootPkg = readJson<PackageJson>('packages/boot/package.json');
    const protocolPkg = readJson<PackageJson>('packages/protocol/package.json');
    const lockfile = readText('pnpm-lock.yaml');

    expect(bootPkg.dependencies?.['@floegence/flowersec-core']).toBe('^0.27.0');
    expect(protocolPkg.dependencies?.['@floegence/flowersec-core']).toBe('^0.27.0');
    expect(lockfile).toContain("'@floegence/flowersec-core@0.27.0':");
    expect(lockfile).toContain("engines: {node: '>=24.0.0'}");

    const manifests = [bootPkg, protocolPkg];
    for (const pkg of manifests) {
      const spec = pkg.dependencies?.['@floegence/flowersec-core'] ?? '';
      expect(spec).not.toMatch(/^(?:file|link|workspace):/u);
      expect(spec).not.toContain('../');
    }
    expect(lockfile).not.toContain("'@floegence/flowersec-core':\n        specifier: workspace:");
    expect(lockfile).not.toContain("'@floegence/flowersec-core':\n        specifier: file:");
    expect(lockfile).not.toContain("'@floegence/flowersec-core':\n        specifier: link:");
    expect(lockfile).not.toContain(
      "'@floegence/flowersec-core':\n        specifier: ^0.27.0\n        version: link:"
    );
    expect(lockfile).not.toMatch(/(?:@floegence\/flowersec-core|@floegence\+flowersec-core)@0\.(?:25|26)\./u);
  });

  it('validates the frozen dependency graph before running the local quality gate', () => {
    const makefile = readText('Makefile');

    expect(makefile).toMatch(/^check: install lint typecheck test build verify$/mu);
    expect(makefile).toMatch(/^install:\n\tpnpm install --frozen-lockfile$/mu);
  });
});
