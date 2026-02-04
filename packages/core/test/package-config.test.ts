import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readJson(path: string) {
  return JSON.parse(readFileSync(resolve(__dirname, '..', path), 'utf-8')) as Record<string, unknown>;
}

describe('@floegence/floe-webapp-core package config', () => {
  it('should export dist entrypoints and styles', () => {
    const pkg = readJson('package.json');

    expect(pkg.main).toBe('./dist/index.js');
    expect(pkg.module).toBe('./dist/index.js');
    expect(pkg.types).toBe('./dist/index.d.ts');
    expect(pkg.sideEffects).toBe(false);

    expect(pkg.exports).toEqual({
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
      './app': {
        types: './dist/app.d.ts',
        import: './dist/app.js',
      },
      './full': {
        types: './dist/full.d.ts',
        import: './dist/full.js',
      },
      './layout': {
        types: './dist/layout.d.ts',
        import: './dist/layout.js',
      },
      './deck': {
        types: './dist/deck.d.ts',
        import: './dist/deck.js',
      },
      './ui': {
        types: './dist/ui.d.ts',
        import: './dist/ui.js',
      },
      './icons': {
        types: './dist/icons.d.ts',
        import: './dist/icons.js',
      },
      './loading': {
        types: './dist/loading.d.ts',
        import: './dist/loading.js',
      },
      './launchpad': {
        types: './dist/launchpad.d.ts',
        import: './dist/launchpad.js',
      },
      './file-browser': {
        types: './dist/file-browser.d.ts',
        import: './dist/file-browser.js',
      },
      './chat': {
        types: './dist/chat.d.ts',
        import: './dist/chat.js',
      },
      './widgets': {
        types: './dist/widgets.d.ts',
        import: './dist/widgets.js',
      },
      './styles': './dist/styles.css',
      './tailwind': './dist/tailwind.css',
    });

    expect(pkg.files).toEqual(['dist']);
  });
});
