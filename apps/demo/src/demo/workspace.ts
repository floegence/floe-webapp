export interface DemoFile {
  id: string;
  path: string;
  language: string;
  load: () => Promise<string>;
}

export const demoFiles: DemoFile[] = [
  {
    id: 'readme',
    path: 'README.md',
    language: 'markdown',
    load: async () => (await import('../../../../README.md?raw')).default,
  },
  {
    id: 'docs.getting-started',
    path: 'docs/getting-started.md',
    language: 'markdown',
    load: async () => (await import('../../../../docs/getting-started.md?raw')).default,
  },
  {
    id: 'demo.app',
    path: 'apps/demo/src/App.tsx',
    language: 'typescript',
    load: async () => (await import('../App.tsx?raw')).default,
  },
  {
    id: 'core.shell',
    path: 'packages/core/src/components/layout/Shell.tsx',
    language: 'typescript',
    load: async () => (await import('../../../../packages/core/src/components/layout/Shell.tsx?raw')).default,
  },
  {
    id: 'core.panel',
    path: 'packages/core/src/components/layout/Panel.tsx',
    language: 'typescript',
    load: async () => (await import('../../../../packages/core/src/components/layout/Panel.tsx?raw')).default,
  },
  {
    id: 'core.button',
    path: 'packages/core/src/components/ui/Button.tsx',
    language: 'typescript',
    load: async () => (await import('../../../../packages/core/src/components/ui/Button.tsx?raw')).default,
  },
  {
    id: 'core.input',
    path: 'packages/core/src/components/ui/Input.tsx',
    language: 'typescript',
    load: async () => (await import('../../../../packages/core/src/components/ui/Input.tsx?raw')).default,
  },
  {
    id: 'core.dropdown',
    path: 'packages/core/src/components/ui/Dropdown.tsx',
    language: 'typescript',
    load: async () => (await import('../../../../packages/core/src/components/ui/Dropdown.tsx?raw')).default,
  },
  {
    id: 'core.dialog',
    path: 'packages/core/src/components/ui/Dialog.tsx',
    language: 'typescript',
    load: async () => (await import('../../../../packages/core/src/components/ui/Dialog.tsx?raw')).default,
  },
  {
    id: 'core.tooltip',
    path: 'packages/core/src/components/ui/Tooltip.tsx',
    language: 'typescript',
    load: async () => (await import('../../../../packages/core/src/components/ui/Tooltip.tsx?raw')).default,
  },
  {
    id: 'core.command-palette',
    path: 'packages/core/src/components/ui/CommandPalette.tsx',
    language: 'typescript',
    load: async () => (await import('../../../../packages/core/src/components/ui/CommandPalette.tsx?raw')).default,
  },
  {
    id: 'core.loading-overlay',
    path: 'packages/core/src/components/loading/LoadingOverlay.tsx',
    language: 'typescript',
    load: async () => (await import('../../../../packages/core/src/components/loading/LoadingOverlay.tsx?raw')).default,
  },
  {
    id: 'core.skeleton',
    path: 'packages/core/src/components/loading/Skeleton.tsx',
    language: 'typescript',
    load: async () => (await import('../../../../packages/core/src/components/loading/Skeleton.tsx?raw')).default,
  },
  {
    id: 'core.snake-loader',
    path: 'packages/core/src/components/loading/SnakeLoader.tsx',
    language: 'typescript',
    load: async () => (await import('../../../../packages/core/src/components/loading/SnakeLoader.tsx?raw')).default,
  },
  {
    id: 'protocol.client',
    path: 'packages/protocol/src/client.tsx',
    language: 'typescript',
    load: async () => (await import('../../../../packages/protocol/src/client.tsx?raw')).default,
  },
];

