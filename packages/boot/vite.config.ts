import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'artifact-source': resolve(__dirname, 'src/artifact-source.ts'),
      },
      name: 'FloeBoot',
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [/^@floegence\/flowersec-core(?:\/.*)?$/],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
});
