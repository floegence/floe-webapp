import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/styles/build.ts'),
      name: 'FloeCoreStyles',
      formats: ['es'],
      fileName: () => 'styles',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'styles.js',
        assetFileNames: 'styles.css',
      },
    },
  },
});
