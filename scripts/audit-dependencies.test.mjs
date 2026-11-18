import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { checkException } from './audit-dependencies.mjs';

const require = createRequire(import.meta.url);
const match = createRequire(require.resolve('vite/package.json'))('picomatch');
const installed = [{ devDependencies: { glob: { dependencies: { picomatch: { from: 'picomatch', version: '4.0.7', path: '/installed' } } } } }];
const entry = { module_name: 'picomatch', github_advisory_id: 'GHSA-fc5q-39xc-vjpf', cves: ['CVE-2026-112366'], patched_versions: '<0.0.0', findings: [{ version: '4.0.7' }] };
const input = () => ({ installed, production: [{}], now: Date.parse('2026-11-18'),
  patchHash: 'f47199b4e6ec04b7bacd1c8ad3fa6a1f19712f749faf23e15b8f944b00e5c8e2',
  parserHashes: new Map([['/installed', '5573fab5244f4b5ac16c8380e49260f010cb291c9a68bc630726ae98758936f8']]),
  report: { advisories: { original: { ...entry } }, metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 } } } });

describe('temporary build-time picomatch exception', () => {
  it('accepts only the reviewed installation and advisory', () => expect(() => checkException(input())).not.toThrow());
  for (const [label, change] of Object.entries({
    expiry: value => { value.now = Date.parse('2026-12-02'); },
    production: value => { value.production = installed; },
    patch: value => { value.patchHash = ''; },
    installation: value => { value.parserHashes.clear(); },
    advisory: value => { value.report.advisories.other = entry; },
    upgrade: value => { value.report.advisories.original.patched_versions = '>=4.1.0'; },
  })) it(`blocks a changed ${label}`, () => { const value = input(); change(value); expect(() => checkException(value)).toThrow(); });

  it('preserves ordinary build filters and flattens a repeated filename prefix', () => {
    expect(match('src/**/*.{ts,tsx}')('src/ui/picker.tsx')).toBe(true);
    expect(match('src/**/*.{ts,tsx}')('src/.cache/picker.ts')).toBe(false);
    expect(match('v+([0-9]).txt')('v42.txt')).toBe(true);
    const prefix = match.parse('+(src*)').output;
    expect(prefix).not.toContain(')+');
    expect(match('+(src*)')('srcFiles')).toBe(true);
    expect(match('+(src*)')('testFiles')).toBe(false);
  });
});
