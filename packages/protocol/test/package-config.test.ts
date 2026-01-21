import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readJson(path: string) {
  return JSON.parse(readFileSync(resolve(__dirname, '..', path), 'utf-8')) as Record<string, unknown>;
}

describe('@floe/protocol package config', () => {
  it('should export dist entrypoints', () => {
    const pkg = readJson('package.json');

    expect(pkg.main).toBe('./dist/index.js');
    expect(pkg.module).toBe('./dist/index.js');
    expect(pkg.types).toBe('./dist/index.d.ts');

    expect(pkg.exports).toEqual({
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
    });

    expect(pkg.files).toEqual(['dist']);
  });
});

