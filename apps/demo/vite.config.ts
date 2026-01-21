import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    solid({
      // Include core package in Solid compilation
      include: [
        /\.tsx$/,
        /packages\/core\/.*\.tsx?$/,
      ],
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // Don't pre-bundle workspace packages
    exclude: ['@floe/core', '@floe/protocol'],
  },
});
