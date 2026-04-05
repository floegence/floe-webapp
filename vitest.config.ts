import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';
import { resolve } from 'node:path';

export default defineConfig({
  // Vitest runs in Node, so we want Solid SSR output (no DOM event delegation),
  // and we want `solid-js/web` to resolve to its Node export (server renderer).
  resolve: {
    alias: [
      { find: '@floegence/floe-webapp-core/app', replacement: resolve(__dirname, 'packages/core/src/app.ts') },
      { find: '@floegence/floe-webapp-core/notes', replacement: resolve(__dirname, 'packages/core/src/notes.ts') },
      { find: '@floegence/floe-webapp-core', replacement: resolve(__dirname, 'packages/core/src/index.ts') },
    ],
    conditions: ['node'],
  },
  plugins: [
    solid({
      ssr: true,
      dev: false,
      hot: false,
      solid: {
        generate: 'ssr',
      },
    }),
  ],
  test: {
    environment: 'node',
    server: {
      deps: {
        inline: ['solid-motionone'],
      },
    },
  },
});
