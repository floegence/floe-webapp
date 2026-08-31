import { execFileSync } from 'node:child_process';
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
  license?: string;
  engines?: Record<string, string>;
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
};

describe('release dependency and runtime contract', () => {
  const flowersecVersion = '3.2.0';

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
    expect(ci).toContain('uses: actions/setup-go@v6');
    expect(ci).toContain('go-version: 1.26.6');
    expect(release).toContain('uses: actions/setup-go@v6');
    expect(release).toContain('go-version: 1.26.6');
    expect(nodeVersion).toBe('24');
    expect(initBuild).toContain("target: 'node24'");
  });

  it('keeps all published package versions aligned', () => {
    const corePkg = readJson<PackageJson>('packages/core/package.json');
    const bootPkg = readJson<PackageJson>('packages/boot/package.json');
    const protocolPkg = readJson<PackageJson>('packages/protocol/package.json');
    const initPkg = readJson<PackageJson>('packages/init/package.json');

    expect(corePkg.version).toBe('0.46.8');
    expect(bootPkg.version).toBe(corePkg.version);
    expect(protocolPkg.version).toBe(corePkg.version);
    expect(initPkg.version).toBe(corePkg.version);
  });

  it('ships the repository MIT license in every published package', () => {
    const rootLicense = readText('LICENSE');
    for (const packageDir of ['core', 'boot', 'protocol', 'init']) {
      const packagePath = `packages/${packageDir}`;
      const manifest = readJson<PackageJson>(`${packagePath}/package.json`);
      expect(manifest.license).toBe('MIT');
      expect(readText(`${packagePath}/LICENSE`)).toBe(rootLicense);

      const packResult = JSON.parse(
        execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
          cwd: join(repoRoot(), packagePath),
          encoding: 'utf-8',
        })
      ) as Array<{ files?: Array<{ path?: string }> }>;
      expect(packResult).toHaveLength(1);
      expect(packResult[0]?.files?.some((file) => file.path === 'LICENSE')).toBe(true);
    }
  }, 30_000);

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
    const release = readText('.github/workflows/release.yml');

    expect(bootPkg.dependencies?.['@floegence/flowersec-core']).toBe(flowersecVersion);
    expect(protocolPkg.dependencies?.['@floegence/flowersec-core']).toBe(flowersecVersion);
    expect(lockfile).toContain(`'@floegence/flowersec-core@${flowersecVersion}':`);
    expect(bootPkg.engines?.node).toBe('>=24.0.0');

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
      `'@floegence/flowersec-core':\n        specifier: ${flowersecVersion}\n        version: link:`
    );
    expect(lockfile).not.toMatch(
      /(?:@floegence\/flowersec-core|@floegence\+flowersec-core)@0\.(?:25|26)\./u
    );
    expect(release).toContain('scripts/verify-npm-release-package.mjs');
    expect(release).toContain('scripts/verify-npm-release-consumer.mjs');
    expect(release).toContain('Require a release tag ref');
    const consumerSmoke = readText('scripts/verify-npm-release-consumer.mjs');
    expect(consumerSmoke).toContain("'solid-js@1.9.11'");
    expect(consumerSmoke).toContain("import.meta.resolve('${packageNames[0]}')");
    expect(consumerSmoke).toContain(
      "copyFileSync(new URL('./verify-npm-release-runtime-consumer.mjs', import.meta.url)"
    );
    expect(consumerSmoke).toContain('FLOE_FLOWERSEC_V3_SMOKE_PEER_DIR');
    expect(consumerSmoke).toContain("new URL('./flowersec-v3-smoke-peer/', import.meta.url)");
    const runtimeConsumerSmoke = readText('scripts/verify-npm-release-runtime-consumer.mjs');
    expect(runtimeConsumerSmoke).toContain("from '@floegence/floe-webapp-boot'");
    expect(runtimeConsumerSmoke).toContain("from '@floegence/floe-webapp-protocol'");
    expect(runtimeConsumerSmoke).toContain("spawn('go', ['run', '.']");
    expect(runtimeConsumerSmoke).toContain("GOWORK: 'off'");
    expect(runtimeConsumerSmoke).not.toContain("from '@floegence/flowersec-core/node'");

    const goModule = readText('scripts/flowersec-v3-smoke-peer/go.mod');
    const goChecksums = readText('scripts/flowersec-v3-smoke-peer/go.sum');
    const goPeer = readText('scripts/flowersec-v3-smoke-peer/main.go');
    expect(goModule).toContain('go 1.26.6');
    expect(goModule).toMatch(
      /^require github\.com\/floegence\/flowersec\/flowersec-go\/v3 v3\.2\.0$/mu
    );
    expect(goModule).not.toMatch(/^replace\s/mu);
    expect(goModule).not.toContain('../');
    expect(existsSync(join(repoRoot(), 'scripts/flowersec-v3-smoke-peer/go.work'))).toBe(false);
    expect(goChecksums).toContain('flowersec-go/v3 v3.2.0');
    expect(goPeer).toContain('flowersec.NewAcceptor');
    expect(goPeer).toContain('flowersec.NewWebSocketHTTPServer');
    expect(goPeer).toContain('controlplane.NewIssuer().IssueDirect');
    expect(goPeer).toContain('controlplane.EndpointConfig');
    expect(goPeer).toContain('controlplane.CAPolicy()');
    expect(release).toContain('working-directory: scripts/flowersec-v3-smoke-peer');
    expect(release).toContain('GOWORK=off go test ./...');
    expect(release).toContain('GOWORK=off go vet ./...');
  });

  it('validates the frozen dependency graph before running the local quality gate', () => {
    const makefile = readText('Makefile');

    expect(makefile).toMatch(
      /^check: install flowersec-smoke-peer lint typecheck test build verify$/mu
    );
    expect(makefile).toMatch(/^install:\n\tpnpm install --frozen-lockfile$/mu);
    expect(makefile).toMatch(
      /^flowersec-smoke-peer:\n\tcd scripts\/flowersec-v3-smoke-peer && GOWORK=off go test \.\/\.\.\. && GOWORK=off go vet \.\/\.\.\.$/mu
    );
  });
});
