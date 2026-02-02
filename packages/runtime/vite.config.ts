import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FloeRuntime',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['@floegence/flowersec-core', '@floegence/flowersec-core/proxy'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
});

