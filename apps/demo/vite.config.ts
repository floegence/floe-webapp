import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => {
  const repoRoot = resolve(__dirname, '../..');
  const devMode = process.env.FLOE_DEMO_DEV_MODE ?? 'workspace';
  const useWorkspaceSources = command === 'serve' && devMode !== 'dist';

  const workspaceAliases = useWorkspaceSources
    ? [
        // CSS entry: avoid dist rebuild loops in dev (Tailwind scans core src).
        {
          find: '@floegence/floe-webapp-core/tailwind',
          replacement: resolve(__dirname, './src/core-workspace-tailwind.css'),
        },

        // Core TS entrypoints: import sources directly for instant HMR.
        { find: '@floegence/floe-webapp-core/full', replacement: resolve(repoRoot, 'packages/core/src/full.ts') },
        { find: '@floegence/floe-webapp-core/app', replacement: resolve(repoRoot, 'packages/core/src/app.ts') },
        { find: '@floegence/floe-webapp-core/layout', replacement: resolve(repoRoot, 'packages/core/src/layout.ts') },
        { find: '@floegence/floe-webapp-core/deck', replacement: resolve(repoRoot, 'packages/core/src/deck.ts') },
        { find: '@floegence/floe-webapp-core/ui', replacement: resolve(repoRoot, 'packages/core/src/ui.ts') },
        { find: '@floegence/floe-webapp-core/icons', replacement: resolve(repoRoot, 'packages/core/src/icons.ts') },
        { find: '@floegence/floe-webapp-core/loading', replacement: resolve(repoRoot, 'packages/core/src/loading.ts') },
        { find: '@floegence/floe-webapp-core/launchpad', replacement: resolve(repoRoot, 'packages/core/src/launchpad.ts') },
        { find: '@floegence/floe-webapp-core/file-browser', replacement: resolve(repoRoot, 'packages/core/src/file-browser.ts') },
        { find: '@floegence/floe-webapp-core/chat', replacement: resolve(repoRoot, 'packages/core/src/chat.ts') },
        { find: '@floegence/floe-webapp-core/widgets', replacement: resolve(repoRoot, 'packages/core/src/widgets.ts') },
        { find: '@floegence/floe-webapp-core', replacement: resolve(repoRoot, 'packages/core/src/index.ts') },

        // Protocol entrypoint: import sources directly for HMR.
        { find: '@floegence/floe-webapp-protocol', replacement: resolve(repoRoot, 'packages/protocol/src/index.ts') },
      ]
    : [];

  return {
    plugins: [solid(), tailwindcss()],
    resolve: {
      alias: [
        { find: '@', replacement: resolve(__dirname, './src') },
        ...workspaceAliases,
      ],
    },
    server: {
      fs: {
        // Allow importing source files across the monorepo (e.g. `?raw` file viewer).
        allow: [repoRoot],
      },
      ...(useWorkspaceSources
        ? {
            // If a separate process builds dist (e.g. `make check`), don't let it spam HMR.
            watch: {
              ignored: ['**/packages/**/dist/**', '**/apps/**/dist/**', '**/*.tsbuildinfo'],
            },
          }
        : {}),
    },
    optimizeDeps: {
      // Don't pre-bundle workspace packages
      exclude: ['@floegence/floe-webapp-core', '@floegence/floe-webapp-protocol'],
    },
  };
});
