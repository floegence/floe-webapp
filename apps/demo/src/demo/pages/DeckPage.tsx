import { onMount, type Component } from 'solid-js';
import {
  DeckGrid,
  DeckTopBar,
  FileBrowser,
  Files,
  useDeckDrag,
  useWidgetRegistry,
  type FileItem,
  type WidgetDefinition,
  MetricsWidget,
  TerminalWidget,
  Terminal,
  LayoutDashboard,
  type WidgetProps,
} from '@floegence/floe-webapp-core';

const now = Date.now();
const demoFileTree: FileItem[] = [
  {
    id: '/src',
    name: 'src',
    type: 'folder',
    path: '/src',
    children: [
      { id: '/src/main.tsx', name: 'main.tsx', type: 'file', path: '/src/main.tsx', extension: 'tsx', size: 1423, modifiedAt: new Date(now - 1 * 3600_000) },
      { id: '/src/App.tsx', name: 'App.tsx', type: 'file', path: '/src/App.tsx', extension: 'tsx', size: 3921, modifiedAt: new Date(now - 2 * 3600_000) },
      {
        id: '/src/components',
        name: 'components',
        type: 'folder',
        path: '/src/components',
        children: Array.from({ length: 40 }, (_, i) => ({
          id: `/src/components/Component${String(i + 1).padStart(2, '0')}.tsx`,
          name: `Component${String(i + 1).padStart(2, '0')}.tsx`,
          type: 'file' as const,
          path: `/src/components/Component${String(i + 1).padStart(2, '0')}.tsx`,
          extension: 'tsx',
          size: 800 + i * 17,
          modifiedAt: new Date(now - (i + 3) * 3600_000),
        })),
      },
    ],
  },
  {
    id: '/logs',
    name: 'logs',
    type: 'folder',
    path: '/logs',
    children: Array.from({ length: 60 }, (_, i) => ({
      id: `/logs/log-${String(i + 1).padStart(3, '0')}.txt`,
      name: `log-${String(i + 1).padStart(3, '0')}.txt`,
      type: 'file' as const,
      path: `/logs/log-${String(i + 1).padStart(3, '0')}.txt`,
      extension: 'txt',
      size: 2048 + i * 31,
      modifiedAt: new Date(now - (i + 1) * 15 * 60_000),
    })),
  },
  { id: '/README.md', name: 'README.md', type: 'file', path: '/README.md', extension: 'md', size: 6120, modifiedAt: new Date(now - 24 * 3600_000) },
];

function DemoFileBrowserWidget(_props: WidgetProps) {
  return (
    <FileBrowser
      files={demoFileTree}
      initialPath="/"
      initialViewMode="list"
      sidebarWidth={220}
      class="h-full border-0 rounded-none shadow-none"
    />
  );
}

/**
 * Demo deck page showing the Grafana-style layout editor
 */
export const DeckPage: Component = () => {
  const widgetRegistry = useWidgetRegistry();

  // Initialize drag handling
  useDeckDrag();

  // Register built-in widgets on mount
  onMount(() => {
    const widgets: WidgetDefinition[] = [
      {
        type: 'metrics',
        name: 'Metrics',
        icon: LayoutDashboard,
        category: 'metrics',
        component: MetricsWidget,
        minColSpan: 6,
        minRowSpan: 4,
        defaultColSpan: 12,
        defaultRowSpan: 6,
      },
      {
        type: 'terminal',
        name: 'Terminal',
        icon: Terminal,
        category: 'terminal',
        component: TerminalWidget,
        minColSpan: 8,
        minRowSpan: 4,
        defaultColSpan: 12,
        defaultRowSpan: 8,
      },
      {
        type: 'file-browser',
        name: 'File Browser',
        icon: Files,
        category: 'custom',
        component: DemoFileBrowserWidget,
        minColSpan: 8,
        minRowSpan: 6,
        defaultColSpan: 12,
        defaultRowSpan: 10,
      },
    ];

    widgetRegistry.registerAll(widgets);
  });

  return (
    <div class="h-full flex flex-col bg-background">
      <DeckTopBar />
      <div class="flex-1 min-h-0 overflow-hidden">
        <DeckGrid />
      </div>
    </div>
  );
};
