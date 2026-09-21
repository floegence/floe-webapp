import { For, createEffect, lazy, onCleanup, onMount } from 'solid-js';
import { ActivityAppsMain } from '@floegence/floe-webapp-core/app';
import {
  BUILT_IN_SHELL_THEME_DEFAULTS,
  FloeProvider,
  builtInShellThemePresets,
  useLayout,
  useTheme,
  useViewActivation,
} from '@floegence/floe-webapp-core';
import { FileBrowser, type FileItem } from '@floegence/floe-webapp-core/file-browser';
import { Files, Layers, LayoutDashboard, Moon, Sun } from '@floegence/floe-webapp-core/icons';
import { Shell } from '@floegence/floe-webapp-core/layout';
import { Button } from '@floegence/floe-webapp-core/ui';

const Reports = lazy(() => import('./ReportsPage'));
const workspaceFiles: FileItem[] = Array.from({ length: 480 }, (_, index) => ({
  id: `file-${index}`,
  name: `${String(index + 1).padStart(3, '0')}-${['workspace.ts', 'settings.json', 'README.md', 'deploy.toml'][index % 4]}`,
  path: `/workspace/${index}`,
  type: 'file',
  size: 1024 + index * 127,
  modifiedAt: new Date('2026-09-21T08:00:00Z'),
}));
const files: FileItem[] = [{ id: 'workspace', name: 'workspace', path: '/workspace', type: 'folder', children: workspaceFiles }];

function CanvasPage() {
  const activation = useViewActivation();
  const theme = useTheme();
  let canvas!: HTMLCanvasElement;
  let host!: HTMLDivElement;
  const draw = () => {
    if (!activation.visible() || !host || !canvas) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const context = canvas.getContext('2d')!;
    context.scale(dpr, dpr);
    const styles = getComputedStyle(host);
    context.fillStyle = styles.backgroundColor;
    context.fillRect(0, 0, width, height);
    context.fillStyle = styles.color;
    context.font = '13px ui-monospace, monospace';
    const lines = [
      '$ floe workspace status', '',
      'Workspace   /workspace',
      'Branch      feature/activity-navigation',
      'Files       480', '',
      'All services are ready.', '',
      'Switch to Files or Reports, then return here.',
      'This canvas and its content stay mounted.',
    ];
    lines.forEach((line, index) => context.fillText(line, 28, 42 + index * 25));
    canvas.dataset.painted = 'true';
  };
  createEffect(() => {
    theme.resolvedTheme();
    draw();
  });
  onMount(() => {
    const observer = new ResizeObserver(draw);
    observer.observe(host);
    draw();
    onCleanup(() => observer.disconnect());
  });
  return (
    <section class="flex h-full min-h-0 flex-col" data-navigation-page="canvas">
      <header class="shrink-0 border-b border-border bg-muted/30 px-6 py-4">
        <h1 class="text-sm font-semibold">Canvas</h1>
        <p class="mt-1 text-xs text-muted-foreground">A retained drawing surface. Your draft below stays with this page.</p>
      </header>
      <div ref={host} class="relative min-h-0 flex-1 bg-background text-foreground">
        <canvas
          ref={canvas}
          class="absolute inset-0 h-full w-full"
          aria-label="Workspace status preview"
          style={{ visibility: activation.visible() ? 'visible' : 'hidden' }}
          data-canvas-visible={activation.visible()}
          data-effects-active={activation.active()}
        />
      </div>
      <label class="flex shrink-0 items-center gap-3 border-t border-border bg-muted/30 px-6 py-4 text-xs">
        Draft
        <input class="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2" placeholder="Write something, switch pages, then return…" />
      </label>
    </section>
  );
}

function LoadingPage(props: { name: string }) {
  return (
    <section class="h-full bg-background px-6 py-5" role="status" aria-busy="true" data-navigation-loading>
      <h1 class="text-sm font-semibold">{props.name}</h1>
      <p class="mt-2 text-xs text-muted-foreground">Opening {props.name.toLowerCase()}…</p>
      <div class="mt-8 grid gap-4 sm:grid-cols-3" aria-hidden="true">
        <For each={[0, 1, 2]}>{() => <div class="h-28 rounded-lg border border-border bg-muted/30" />}</For>
      </div>
    </section>
  );
}

function NavigationShell() {
  const layout = useLayout();
  const theme = useTheme();
  const items = [
    { id: 'files', icon: Files, label: 'Files', collapseBehavior: 'preserve' as const },
    { id: 'canvas', icon: Layers, label: 'Canvas', collapseBehavior: 'preserve' as const },
    { id: 'reports', icon: LayoutDashboard, label: 'Reports', collapseBehavior: 'preserve' as const },
  ];
  return (
    <Shell
      sidebarMode="hidden"
      activitySelectionMode="ui-first"
      activityItems={items}
      logo={<img src="/logo.svg" alt="Floe" class="h-7 w-7" />}
      topBarActions={(
        <div class="flex items-center gap-3">
          <span class="text-xs text-muted-foreground">Activity navigation</span>
          <Button variant="ghost" size="icon" title="Toggle theme" onClick={() => theme.toggleTheme()}>
            {theme.resolvedTheme() === 'dark' ? <Sun class="h-4 w-4" /> : <Moon class="h-4 w-4" />}
          </Button>
        </div>
      )}
      bottomBarItems={[
        <span class="text-xs text-muted-foreground">Scroll Files, switch pages, and return to the same place.</span>,
      ]}
    >
      <ActivityAppsMain
        activationMode="after-paint"
        activeId={layout.sidebarActiveTab}
        renderFallback={(id) => <LoadingPage name={items.find((item) => item.id === id)?.label ?? 'Page'} />}
        views={[
          { id: 'files', render: () => <div class="h-full" data-navigation-page="files"><FileBrowser files={files} initialPath="/workspace" initialViewMode="grid" homeLabel="Workspace" /></div> },
          { id: 'canvas', render: () => <CanvasPage /> },
          { id: 'reports', render: () => <Reports /> },
        ]}
      />
    </Shell>
  );
}

export function NavigationDemo() {
  return (
    <FloeProvider config={{
      storage: { namespace: 'floe-navigation-demo' },
      layout: { sidebar: { defaultActiveTab: 'files' } },
      theme: { shellPresets: builtInShellThemePresets, defaultShellPreset: BUILT_IN_SHELL_THEME_DEFAULTS },
    }}>
      <NavigationShell />
    </FloeProvider>
  );
}
