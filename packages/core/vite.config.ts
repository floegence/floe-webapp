import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  // Library build outputs must be self-contained and embeddable as a dependency.
  // Using a relative base ensures worker assets referenced via `new URL(..., import.meta.url)`
  // resolve within the package instead of assuming the host app serves them from `/assets`.
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
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
        deck: resolve(__dirname, 'src/deck.ts'),
        ui: resolve(__dirname, 'src/ui.ts'),
        icons: resolve(__dirname, 'src/icons.ts'),
        loading: resolve(__dirname, 'src/loading.ts'),
        launchpad: resolve(__dirname, 'src/launchpad.ts'),
        'file-browser': resolve(__dirname, 'src/file-browser.ts'),
        chat: resolve(__dirname, 'src/chat.ts'),
        widgets: resolve(__dirname, 'src/widgets.ts'),
      },
      name: 'FloeCore',
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['solid-js', 'solid-js/web', 'solid-js/store'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
    copyPublicDir: false,
  },
});
