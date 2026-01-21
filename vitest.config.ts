import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';

export default defineConfig({
  // Vitest runs in Node, so we want Solid SSR output (no DOM event delegation),
  // and we want `solid-js/web` to resolve to its Node export (server renderer).
  resolve: {
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
  },
});
