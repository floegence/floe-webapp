import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const routingWasm = resolve(dirname(require.resolve('libavoid-js')), 'libavoid.wasm');
const separateRoutingWasm = () => ({
  name: 'libavoid-separate-wasm',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.endsWith('/libavoid-js/dist/index.js')) return;
    // Keep the original LGPL binary independently replaceable in both the
    // renderer and the complete graph worker's dependency graph.
    const asset = 'new URL("libavoid.wasm",import.meta.url)';
    if (!code.includes(asset)) throw new Error('libavoid WASM loader contract changed');
    return code.replace(asset, 'new URL("libavoid.wasm?no-inline",import.meta.url)');
  },
});

export default defineConfig({
  plugins: [separateRoutingWasm(), solid(), tailwindcss()],
  // Library build outputs must be self-contained and embeddable as a dependency.
  // Using a relative base ensures worker assets referenced via `new URL(..., import.meta.url)`
  // resolve within the package instead of assuming the host app serves them from `/assets`.
  base: './',
  worker: {
    format: 'es',
    plugins: () => [separateRoutingWasm()],
    rollupOptions: { output: { inlineDynamicImports: true, assetFileNames: '[name][extname]' } },
  },
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, './src') },
      { find: 'libavoid-js/wasm?url&no-inline', replacement: `${routingWasm}?url&no-inline` },
    ],
  },
  build: {
    emptyOutDir: false,
    lib: {
      // Multi-entry for composable subpath exports.
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        app: resolve(__dirname, 'src/app.ts'),
        full: resolve(__dirname, 'src/full.ts'),

        layout: resolve(__dirname, 'src/layout.ts'),
        viewport: resolve(__dirname, 'src/viewport.ts'),
        deck: resolve(__dirname, 'src/deck.ts'),
        ui: resolve(__dirname, 'src/ui.ts'),
        icons: resolve(__dirname, 'src/icons.ts'),
        loading: resolve(__dirname, 'src/loading.ts'),
        'resource-cache': resolve(__dirname, 'src/resource-cache.ts'),
        'reload-placeholder': resolve(__dirname, 'src/reload-placeholder.ts'),
        'remote-input': resolve(__dirname, 'src/remote-input.ts'),
        'remote-pointer': resolve(__dirname, 'src/remote-pointer.ts'),
        launchpad: resolve(__dirname, 'src/launchpad.ts'),
        'file-browser': resolve(__dirname, 'src/file-browser.ts'),
        chat: resolve(__dirname, 'src/chat.ts'),
        'code-highlight': resolve(__dirname, 'src/code-highlight.ts'),
        'chat-media': resolve(__dirname, 'src/chat-media.ts'),
        notes: resolve(__dirname, 'src/notes.ts'),
        editor: resolve(__dirname, 'src/editor.ts'),
        pdf: resolve(__dirname, 'src/pdf.ts'),
        widgets: resolve(__dirname, 'src/widgets.ts'),
        terminal: resolve(__dirname, 'src/terminal.ts'),
        themes: resolve(__dirname, 'src/themes.ts'),
        'window-status': resolve(__dirname, 'src/window-status.ts'),
        workbench: resolve(__dirname, 'src/workbench.ts'),
        graph: resolve(__dirname, 'src/graph.ts'),
      },
      name: 'FloeCore',
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        'solid-js',
        'solid-js/web',
        'solid-js/store',
        'monaco-editor',
        /^monaco-editor\//,
        /^pdfjs-dist(?:\/|$)/,
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
    copyPublicDir: false,
  },
});
