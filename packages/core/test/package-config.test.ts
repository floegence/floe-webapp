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
      './reload-placeholder': { types: './dist/reload-placeholder.d.ts', import: './dist/reload-placeholder.js' },
      './resource-cache': { types: './dist/resource-cache.d.ts', import: './dist/resource-cache.js' },
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
      './chat-media': { types: './dist/chat-media.d.ts', import: './dist/chat-media.js' },
      './notes': {
        types: './dist/notes.d.ts',
        import: './dist/notes.js',
      },
      './editor': {
        types: './dist/editor.d.ts',
        import: './dist/editor.js',
      },
      './widgets': {
        types: './dist/widgets.d.ts',
        import: './dist/widgets.js',
      },
      './terminal': {
        types: './dist/terminal.d.ts',
        import: './dist/terminal.js',
      },
      './themes': {
        types: './dist/themes.d.ts',
        import: './dist/themes.js',
        default: './dist/themes.js',
      },
      './workbench': {
        types: './dist/workbench.d.ts',
        import: './dist/workbench.js',
      },
      './pdf': { types: './dist/pdf.d.ts', import: './dist/pdf.js' },
      './pdf.css': './dist/pdf.css',
      './pdf-assets': { types: './scripts/pdf-assets.d.mts', import: './scripts/pdf-assets.mjs' },
      './standalone.css': './dist/standalone.css',
      './progress-shimmer.css': './dist/progress-shimmer.css',
      './window-status.css': './dist/window-status.css',
      './window-status': { types: './dist/window-status.d.ts', import: './dist/window-status.js', default: './dist/window-status.js' },
      './styles': './dist/styles.css',
      './tailwind': './dist/tailwind.css',
      './input-focus.css': './dist/input-focus.css',
    });

    expect(pkg.files).toEqual(['dist', 'scripts/pdf-assets.mjs', 'scripts/pdf-assets.d.mts']);
  });
});
