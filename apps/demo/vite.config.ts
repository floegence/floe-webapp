import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    solid(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    fs: {
      // Allow importing source files across the monorepo (e.g. `?raw` file viewer).
      allow: [resolve(__dirname, '../..')],
    },
  },
  optimizeDeps: {
    // Don't pre-bundle workspace packages
    exclude: ['@floegence/floe-webapp-core', '@floegence/floe-webapp-protocol'],
  },
});
