import {
  createContext,
  createEffect,
  For,
  Show,
  useContext,
  type Accessor,
  type Component,
  type JSX,
} from 'solid-js';
import { createStore, unwrap } from 'solid-js/store';
import { FileBrowser, type FileItem } from '@floegence/floe-webapp-core/file-browser';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle,
  Clock,
  Code,
  Database,
  DockBot,
  DockCode,
  DockCpu,
  DockFolder,
  DockGlobe,
  DockSearch,
  DockSparkles,
  DockTerminal,
  FileCode,
  GitBranch,
  Globe,
  Hash,
  Package,
  Search,
  Sparkles,
  Zap,
} from '@floegence/floe-webapp-core/icons';
import { cn, usePersisted } from '@floegence/floe-webapp-core';
import {
  WORKBENCH_DEFAULT_TEXT_FONT,
  WORKBENCH_REGION_FILL_OPTIONS,
  WORKBENCH_TEXT_FONT_OPTIONS,
  createWorkbenchFilterState,
  sanitizeWorkbenchState,
  type WorkbenchWidgetBodyProps,
  type WorkbenchWidgetDefinition,
  type WorkbenchTextAnnotationItem,
  type WorkbenchState,
  type WorkbenchWidgetType,
} from '@floegence/floe-webapp-core/workbench';
import {
  CANVAS_WHEEL_INTERACTIVE_ATTR,
  LOCAL_INTERACTION_SURFACE_ATTR,
  WORKBENCH_TEXT_SELECTION_SURFACE_ATTR,
} from '@floegence/floe-webapp-core/ui';

export interface WorkbenchDemoContextValue {
  state: Accessor<WorkbenchState>;
  setState: (updater: (prev: WorkbenchState) => WorkbenchState) => void;
}

const WorkbenchDemoContext = createContext<WorkbenchDemoContextValue>();

export const DEMO_WORKBENCH_TEXT_FONT = WORKBENCH_TEXT_FONT_OPTIONS[1] ?? WORKBENCH_TEXT_FONT_OPTIONS[0]!;
export const DEMO_WORKBENCH_TEXT_SIZE = 45;
export const DEMO_WORKBENCH_TEXT_DEFAULTS = {
  font_family: DEMO_WORKBENCH_TEXT_FONT.fontFamily,
  font_size: DEMO_WORKBENCH_TEXT_SIZE,
  font_weight: DEMO_WORKBENCH_TEXT_FONT.fontWeight,
  width: 460,
  height: 108,
} as const;

const LEGACY_DEMO_WORKBENCH_TEXT_SIZE = 34;
const REDEVEN_PARITY_RENDER_MODE = 'projected_surface' as const;
const REDEVEN_PARITY_WIDGET_TYPES = [
  'redeven.files',
  'redeven.terminal',
  'redeven.preview',
  'redeven.monitor',
  'redeven.codespaces',
  'redeven.ports',
  'redeven.ai',
  'redeven.codex',
] as const;

type RedevenParityWidgetType = typeof REDEVEN_PARITY_WIDGET_TYPES[number];

const demoNow = Date.now();
const gitModifiedDecoration = {
  badge: { label: 'M', tone: 'info', title: 'Modified in Git' },
  nameTone: 'info',
} as const;
const gitAddedDecoration = {
  badge: { label: 'A', tone: 'success', title: 'Added in Git' },
  nameTone: 'success',
} as const;
const gitModifiedDirectoryDecoration = {
  badge: { label: 'M', tone: 'info', title: 'Contains modified Git changes' },
  nameTone: 'info',
} as const;

const DEMO_FILE_TREE: FileItem[] = [
  {
    id: '/Users/dev/redeven',
    name: 'redeven',
    type: 'folder',
    path: '/Users/dev/redeven',
    modifiedAt: new Date(demoNow - 11 * 60_000),
    decoration: gitModifiedDirectoryDecoration,
    children: [
      {
        id: '/Users/dev/redeven/frontend',
        name: 'frontend',
        type: 'folder',
        path: '/Users/dev/redeven/frontend',
        modifiedAt: new Date(demoNow - 24 * 60_000),
        decoration: gitModifiedDirectoryDecoration,
        children: [
          {
            id: '/Users/dev/redeven/frontend/workbench',
            name: 'workbench',
            type: 'folder',
            path: '/Users/dev/redeven/frontend/workbench',
            modifiedAt: new Date(demoNow - 19 * 60_000),
            decoration: gitModifiedDirectoryDecoration,
            children: [
              {
                id: '/Users/dev/redeven/frontend/workbench/Workbench.tsx',
                name: 'Workbench.tsx',
                type: 'file',
                path: '/Users/dev/redeven/frontend/workbench/Workbench.tsx',
                extension: 'tsx',
                size: 48240,
                modifiedAt: new Date(demoNow - 9 * 60_000),
                decoration: gitModifiedDecoration,
              },
              {
                id: '/Users/dev/redeven/frontend/workbench/layers.ts',
                name: 'layers.ts',
                type: 'file',
                path: '/Users/dev/redeven/frontend/workbench/layers.ts',
                extension: 'ts',
                size: 12880,
                modifiedAt: new Date(demoNow - 17 * 60_000),
                decoration: gitAddedDecoration,
              },
              {
                id: '/Users/dev/redeven/frontend/workbench/regions.css',
                name: 'regions.css',
                type: 'file',
                path: '/Users/dev/redeven/frontend/workbench/regions.css',
                extension: 'css',
                size: 6412,
                modifiedAt: new Date(demoNow - 32 * 60_000),
                decoration: gitModifiedDecoration,
              },
            ],
          },
          {
            id: '/Users/dev/redeven/frontend/session',
            name: 'session',
            type: 'folder',
            path: '/Users/dev/redeven/frontend/session',
            modifiedAt: new Date(demoNow - 2 * 3600_000),
            children: [
              {
                id: '/Users/dev/redeven/frontend/session/channel.ts',
                name: 'channel.ts',
                type: 'file',
                path: '/Users/dev/redeven/frontend/session/channel.ts',
                extension: 'ts',
                size: 22530,
                modifiedAt: new Date(demoNow - 2 * 3600_000),
              },
              {
                id: '/Users/dev/redeven/frontend/session/agent-events.ts',
                name: 'agent-events.ts',
                type: 'file',
                path: '/Users/dev/redeven/frontend/session/agent-events.ts',
                extension: 'ts',
                size: 18122,
                modifiedAt: new Date(demoNow - 3 * 3600_000),
              },
            ],
          },
          {
            id: '/Users/dev/redeven/frontend/package.json',
            name: 'package.json',
            type: 'file',
            path: '/Users/dev/redeven/frontend/package.json',
            extension: 'json',
            size: 2184,
            modifiedAt: new Date(demoNow - 5 * 3600_000),
          },
        ],
      },
      {
        id: '/Users/dev/redeven/internal',
        name: 'internal',
        type: 'folder',
        path: '/Users/dev/redeven/internal',
        modifiedAt: new Date(demoNow - 47 * 60_000),
        children: [
          {
            id: '/Users/dev/redeven/internal/session',
            name: 'session',
            type: 'folder',
            path: '/Users/dev/redeven/internal/session',
            modifiedAt: new Date(demoNow - 51 * 60_000),
            children: [
              {
                id: '/Users/dev/redeven/internal/session/types.go',
                name: 'types.go',
                type: 'file',
                path: '/Users/dev/redeven/internal/session/types.go',
                extension: 'go',
                size: 15620,
                modifiedAt: new Date(demoNow - 51 * 60_000),
              },
              {
                id: '/Users/dev/redeven/internal/session/snapshot.go',
                name: 'snapshot.go',
                type: 'file',
                path: '/Users/dev/redeven/internal/session/snapshot.go',
                extension: 'go',
                size: 27440,
                modifiedAt: new Date(demoNow - 86 * 60_000),
              },
            ],
          },
        ],
      },
      {
        id: '/Users/dev/redeven/docs',
        name: 'docs',
        type: 'folder',
        path: '/Users/dev/redeven/docs',
        modifiedAt: new Date(demoNow - 8 * 3600_000),
        children: [
          {
            id: '/Users/dev/redeven/docs/workbench-layered-canvas.md',
            name: 'workbench-layered-canvas.md',
            type: 'file',
            path: '/Users/dev/redeven/docs/workbench-layered-canvas.md',
            extension: 'md',
            size: 9180,
            modifiedAt: new Date(demoNow - 8 * 3600_000),
          },
        ],
      },
      {
        id: '/Users/dev/redeven/AGENTS.md',
        name: 'AGENTS.md',
        type: 'file',
        path: '/Users/dev/redeven/AGENTS.md',
        extension: 'md',
        size: 14320,
        modifiedAt: new Date(demoNow - 16 * 3600_000),
      },
    ],
  },
];

const DEMO_TERMINAL_LINES = [
  { kind: 'prompt', text: 'pnpm --filter @floegence/floe-webapp-demo dev' },
  { kind: 'muted', text: 'VITE v7.3.2 ready in 308 ms' },
  { kind: 'muted', text: 'Local: http://127.0.0.1:5173/' },
  { kind: 'prompt', text: 'git status --short --branch' },
  { kind: 'muted', text: '## feat-workbench-composition-isolation' },
  { kind: 'muted', text: ' M packages/core/src/components/workbench/WorkbenchLayerObjects.tsx' },
  { kind: 'prompt', text: 'node scripts/test.mjs packages/core/test/workbench-layer-objects.test.tsx' },
  { kind: 'muted', text: 'OK Workbench layer geometry previews are stable' },
] as const;

function DemoWidgetFrame(props: WorkbenchWidgetBodyProps & {
  class?: string;
  children: JSX.Element;
  localSurface?: boolean;
}) {
  const isCold = () => props.lifecycle === 'cold';
  return (
    <div
      {...{
        [CANVAS_WHEEL_INTERACTIVE_ATTR]: props.selected ? 'true' : undefined,
        [LOCAL_INTERACTION_SURFACE_ATTR]: props.localSurface ? 'true' : undefined,
      }}
      class={cn('workbench-demo-widget', props.class)}
      classList={{ 'is-cold': isCold() }}
    >
      {props.children}
    </div>
  );
}

function DemoFilesBody(props: WorkbenchWidgetBodyProps<RedevenParityWidgetType>) {
  return (
    <DemoWidgetFrame {...props} class="workbench-demo-widget--files" localSurface>
      <FileBrowser
        files={DEMO_FILE_TREE}
        initialPath="/Users/dev/redeven/frontend/workbench"
        initialViewMode="list"
        sidebarWidth={260}
        sidebarWidthStorageKey="demo.workbench.files.sidebar"
        persistenceKey="demo.workbench.files"
        homeLabel="redeven"
        enableDragDrop={false}
        hideContextMenuItems={['duplicate', 'copy-to', 'move-to', 'delete', 'rename']}
        class="workbench-demo-file-browser"
      />
    </DemoWidgetFrame>
  );
}

function DemoTerminalBody(props: WorkbenchWidgetBodyProps<RedevenParityWidgetType>) {
  return (
    <DemoWidgetFrame {...props} class="workbench-demo-widget--terminal" localSurface>
      <div class="workbench-demo-terminal" {...{ [WORKBENCH_TEXT_SELECTION_SURFACE_ATTR]: 'true' }}>
        <div class="workbench-demo-terminal__bar">
          <span class="workbench-demo-terminal__dot is-red" />
          <span class="workbench-demo-terminal__dot is-yellow" />
          <span class="workbench-demo-terminal__dot is-green" />
          <span class="workbench-demo-terminal__path">~/Downloads/code/redeven</span>
        </div>
        <div class="workbench-demo-terminal__body">
          <For each={DEMO_TERMINAL_LINES}>
            {(line) => (
              <div class={cn('workbench-demo-terminal__line', line.kind === 'muted' && 'is-muted')}>
                <Show when={line.kind === 'prompt'}>
                  <span class="workbench-demo-terminal__prompt">$</span>
                </Show>
                <span>{line.text}</span>
              </div>
            )}
          </For>
          <div class="workbench-demo-terminal__line">
            <span class="workbench-demo-terminal__prompt">$</span>
            <span>_</span>
            <span class="workbench-demo-terminal__cursor" />
          </div>
        </div>
      </div>
    </DemoWidgetFrame>
  );
}

function DemoMonitorBody(props: WorkbenchWidgetBodyProps<RedevenParityWidgetType>) {
  const metrics = [
    { label: 'CPU', value: 42, suffix: '%', tone: 'blue' },
    { label: 'Memory', value: 68, suffix: '%', tone: 'amber' },
    { label: 'Disk I/O', value: 31, suffix: '%', tone: 'green' },
    { label: 'Tunnel RTT', value: 24, suffix: 'ms', tone: 'violet' },
  ] as const;
  return (
    <DemoWidgetFrame {...props} class="workbench-demo-widget--monitor">
      <div class="workbench-demo-widget__section-title">
        <Activity class="w-3.5 h-3.5" />
        <span>Runtime telemetry</span>
      </div>
      <For each={metrics}>
        {(metric) => (
          <div class="workbench-demo-meter">
            <div class="workbench-demo-meter__header">
              <span>{metric.label}</span>
              <span>{metric.value}{metric.suffix}</span>
            </div>
            <div class="workbench-demo-meter__track">
              <span
                class={`workbench-demo-meter__fill is-${metric.tone}`}
                style={{ width: `${Math.min(metric.value, 100)}%` }}
              />
            </div>
          </div>
        )}
      </For>
    </DemoWidgetFrame>
  );
}

function DemoCodespacesBody(props: WorkbenchWidgetBodyProps<RedevenParityWidgetType>) {
  const tasks = [
    { name: 'floe-webapp demo', status: 'Running', icon: CheckCircle },
    { name: 'redeven desktop bridge', status: 'Waiting for package', icon: Clock },
    { name: 'storybook parity pass', status: 'Queued', icon: Package },
  ] as const;
  return (
    <DemoWidgetFrame {...props} class="workbench-demo-widget--cards">
      <div class="workbench-demo-widget__section-title">
        <Code class="w-3.5 h-3.5" />
        <span>Development environments</span>
      </div>
      <div class="workbench-demo-card-list">
        <For each={tasks}>
          {(task) => {
            const Icon = task.icon;
            return (
              <div class="workbench-demo-card-row">
                <span class="workbench-demo-card-row__icon"><Icon class="w-4 h-4" /></span>
                <span class="workbench-demo-card-row__main">{task.name}</span>
                <span class="workbench-demo-card-row__meta">{task.status}</span>
              </div>
            );
          }}
        </For>
      </div>
    </DemoWidgetFrame>
  );
}

function DemoPortsBody(props: WorkbenchWidgetBodyProps<RedevenParityWidgetType>) {
  const ports = [
    { port: 5173, service: 'floe demo', visibility: 'local', state: 'open' },
    { port: 14550, service: 'agent bridge', visibility: 'private', state: 'open' },
    { port: 3000, service: 'preview app', visibility: 'tunnel', state: 'sleeping' },
  ] as const;
  return (
    <DemoWidgetFrame {...props} class="workbench-demo-widget--cards">
      <div class="workbench-demo-widget__section-title">
        <Globe class="w-3.5 h-3.5" />
        <span>Forwarded ports</span>
      </div>
      <div class="workbench-demo-port-list">
        <For each={ports}>
          {(port) => (
            <div class="workbench-demo-port-row">
              <span class="workbench-demo-port-row__number">:{port.port}</span>
              <span class="workbench-demo-port-row__service">{port.service}</span>
              <span class="workbench-demo-port-row__chip">{port.visibility}</span>
              <span class={cn('workbench-demo-port-row__state', `is-${port.state}`)}>{port.state}</span>
            </div>
          )}
        </For>
      </div>
    </DemoWidgetFrame>
  );
}

function DemoFlowerBody(props: WorkbenchWidgetBodyProps<RedevenParityWidgetType>) {
  const cards = [
    { icon: Sparkles, label: 'Plan', text: 'Split layered canvas rollout into upstream, release, downstream validation.' },
    { icon: GitBranch, label: 'Patch', text: 'Keep core interaction contracts generic; demo owns Redeven-specific mock state.' },
    { icon: AlertTriangle, label: 'Risk', text: 'Region texture overlap still needs real desktop validation at low scale.' },
  ] as const;
  return (
    <DemoWidgetFrame {...props} class="workbench-demo-widget--assistant" localSurface>
      <div class="workbench-demo-assistant" {...{ [WORKBENCH_TEXT_SELECTION_SURFACE_ATTR]: 'true' }}>
        <div class="workbench-demo-assistant__hero">
          <Sparkles class="w-5 h-5" />
          <div>
            <div class="workbench-demo-assistant__title">Flower analysis</div>
            <div class="workbench-demo-assistant__subtitle">Workbench compositor review</div>
          </div>
        </div>
        <For each={cards}>
          {(card) => {
            const Icon = card.icon;
            return (
              <div class="workbench-demo-assistant__card">
                <Icon class="w-4 h-4" />
                <div>
                  <div class="workbench-demo-assistant__card-title">{card.label}</div>
                  <div class="workbench-demo-assistant__card-text">{card.text}</div>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </DemoWidgetFrame>
  );
}

function DemoCodexBody(props: WorkbenchWidgetBodyProps<RedevenParityWidgetType>) {
  const rows = [
    { icon: Hash, label: 'task', text: 'stabilize Region geometry preview' },
    { icon: FileCode, label: 'changed', text: 'WorkbenchLayerObjects.tsx' },
    { icon: Database, label: 'mock', text: 'Files, Terminal, Monitor, Ports, Flower, Codex' },
    { icon: Zap, label: 'next', text: 'demo validation before publish' },
  ] as const;
  return (
    <DemoWidgetFrame {...props} class="workbench-demo-widget--codex" localSurface>
      <div class="workbench-demo-codex" {...{ [WORKBENCH_TEXT_SELECTION_SURFACE_ATTR]: 'true' }}>
        <div class="workbench-demo-codex__header">
          <Bot class="w-5 h-5" />
          <div>
            <div class="workbench-demo-codex__title">Codex session</div>
            <div class="workbench-demo-codex__subtitle">Working tree: feat-workbench-composition-isolation</div>
          </div>
        </div>
        <For each={rows}>
          {(row) => {
            const Icon = row.icon;
            return (
              <div class="workbench-demo-codex__row">
                <Icon class="w-3.5 h-3.5" />
                <span class="workbench-demo-codex__label">{row.label}</span>
                <span>{row.text}</span>
              </div>
            );
          }}
        </For>
      </div>
    </DemoWidgetFrame>
  );
}

function DemoPreviewBody(props: WorkbenchWidgetBodyProps<RedevenParityWidgetType>) {
  return (
    <DemoWidgetFrame {...props} class="workbench-demo-widget--preview">
      <div class="workbench-demo-preview">
        <Search class="w-6 h-6" />
        <div class="workbench-demo-preview__title">Preview surface</div>
        <div class="workbench-demo-preview__url">http://127.0.0.1:5173/</div>
      </div>
    </DemoWidgetFrame>
  );
}

const REDEVEN_PARITY_WIDGET_BODIES: Record<RedevenParityWidgetType, Component<WorkbenchWidgetBodyProps<RedevenParityWidgetType>>> = {
  'redeven.files': DemoFilesBody,
  'redeven.terminal': DemoTerminalBody,
  'redeven.preview': DemoPreviewBody,
  'redeven.monitor': DemoMonitorBody,
  'redeven.codespaces': DemoCodespacesBody,
  'redeven.ports': DemoPortsBody,
  'redeven.ai': DemoFlowerBody,
  'redeven.codex': DemoCodexBody,
};

function createRedevenParityBody(type: RedevenParityWidgetType): Component<WorkbenchWidgetBodyProps<WorkbenchWidgetType>> {
  return (props) => {
    const Body = REDEVEN_PARITY_WIDGET_BODIES[type];
    return <Body {...props as WorkbenchWidgetBodyProps<RedevenParityWidgetType>} />;
  };
}

function makeRedevenParityWidget(
  type: RedevenParityWidgetType,
  label: string,
  icon: Component<{ class?: string }>,
  defaultTitle: string,
  width: number,
  height: number,
  settleSharp = false,
): WorkbenchWidgetDefinition {
  return {
    type,
    label,
    icon,
    body: createRedevenParityBody(type),
    defaultTitle,
    defaultSize: { width, height },
    singleton: false,
    renderMode: REDEVEN_PARITY_RENDER_MODE,
    ...(settleSharp ? { projectedSurfaceScaleBehavior: 'settle_sharp_zoom' as const } : {}),
  };
}

export const REDEVEN_PARITY_WORKBENCH_WIDGETS: readonly WorkbenchWidgetDefinition[] = [
  makeRedevenParityWidget('redeven.files', 'Files', DockFolder, 'Files', 1080, 700),
  makeRedevenParityWidget('redeven.terminal', 'Terminal', DockTerminal, 'Terminal', 1120, 680),
  makeRedevenParityWidget('redeven.preview', 'Preview', DockSearch, 'Preview', 1080, 700),
  makeRedevenParityWidget('redeven.monitor', 'Monitoring', DockCpu, 'Monitoring', 1040, 640, true),
  makeRedevenParityWidget('redeven.codespaces', 'Codespaces', DockCode, 'Codespaces', 1040, 660),
  makeRedevenParityWidget('redeven.ports', 'Ports', DockGlobe, 'Ports', 1000, 620, true),
  makeRedevenParityWidget('redeven.ai', 'Flower', DockSparkles, 'Flower', 1200, 760),
  makeRedevenParityWidget('redeven.codex', 'Codex', DockBot, 'Codex', 1200, 760),
];

export const REDEVEN_PARITY_LAUNCHER_WIDGET_TYPES = [
  'redeven.files',
  'redeven.terminal',
  'redeven.monitor',
  'redeven.codespaces',
  'redeven.ports',
  'redeven.ai',
  'redeven.codex',
] as const;

function shouldUpgradeDemoTextSeed(annotation: WorkbenchTextAnnotationItem): boolean {
  if (
    annotation.id !== 'wb-seed-text-1' ||
    annotation.text !== 'Release focus' ||
    annotation.updated_at_unix_ms !== annotation.created_at_unix_ms
  ) {
    return false;
  }

  const isLegacySeed =
    annotation.font_size === LEGACY_DEMO_WORKBENCH_TEXT_SIZE &&
    annotation.font_family === WORKBENCH_DEFAULT_TEXT_FONT.fontFamily;
  const isPreviousDemoSeed =
    annotation.font_size === DEMO_WORKBENCH_TEXT_SIZE &&
    annotation.font_family === DEMO_WORKBENCH_TEXT_FONT.fontFamily &&
    annotation.width < DEMO_WORKBENCH_TEXT_DEFAULTS.width;

  return isLegacySeed || isPreviousDemoSeed;
}

export function normalizeWorkbenchDemoState(state: WorkbenchState): WorkbenchState {
  return {
    ...state,
    annotations: (state.annotations ?? []).map((annotation) =>
      shouldUpgradeDemoTextSeed(annotation)
        ? {
          ...annotation,
          ...DEMO_WORKBENCH_TEXT_DEFAULTS,
          width: Math.max(annotation.width, DEMO_WORKBENCH_TEXT_DEFAULTS.width),
          height: Math.max(annotation.height, DEMO_WORKBENCH_TEXT_DEFAULTS.height),
        }
        : annotation
    ),
  };
}

function createRedevenParityWorkbenchState(): WorkbenchState {
  const now = Date.now();
  const widgets = [
    {
      id: 'wb-redeven-terminal',
      type: 'redeven.terminal',
      title: 'Terminal',
      x: 360,
      y: 280,
      width: 1120,
      height: 680,
      z_index: 1,
      created_at_unix_ms: now - 700000,
    },
    {
      id: 'wb-redeven-files',
      type: 'redeven.files',
      title: 'Files',
      x: -190,
      y: 210,
      width: 1080,
      height: 700,
      z_index: 2,
      created_at_unix_ms: now - 660000,
    },
    {
      id: 'wb-redeven-flower',
      type: 'redeven.ai',
      title: 'Flower',
      x: 820,
      y: -40,
      width: 1200,
      height: 760,
      z_index: 3,
      created_at_unix_ms: now - 610000,
    },
    {
      id: 'wb-redeven-codex',
      type: 'redeven.codex',
      title: 'Codex',
      x: 1280,
      y: 560,
      width: 1200,
      height: 760,
      z_index: 4,
      created_at_unix_ms: now - 570000,
    },
  ];

  return {
    version: 1,
    widgets,
    viewport: { x: 210, y: 112, scale: 0.36 },
    locked: false,
    filters: createWorkbenchFilterState(REDEVEN_PARITY_WORKBENCH_WIDGETS),
    selectedWidgetId: 'wb-redeven-terminal',
    selectedObject: { kind: 'widget', id: 'wb-redeven-terminal' },
    theme: 'default',
    mode: 'background',
    activeTool: 'background-region',
    stickyNotes: [
      {
        id: 'wb-redeven-sticky-1',
        kind: 'sticky_note',
        body: 'Parity note: overlaps work widgets while Region sits underneath.',
        color: 'amber',
        x: 1180,
        y: 460,
        width: 284,
        height: 184,
        z_index: 5,
        created_at_unix_ms: now - 400000,
        updated_at_unix_ms: now - 400000,
      },
    ],
    annotations: [
      {
        id: 'wb-seed-text-1',
        kind: 'text',
        text: 'Region overlap',
        ...DEMO_WORKBENCH_TEXT_DEFAULTS,
        color: '#6b7280',
        align: 'left',
        x: 610,
        y: 190,
        z_index: 1,
        created_at_unix_ms: now - 390000,
        updated_at_unix_ms: now - 390000,
      },
    ],
    backgroundLayers: [
      {
        id: 'wb-redeven-region-dotted',
        name: 'Compositor stress area',
        fill: WORKBENCH_REGION_FILL_OPTIONS[2],
        opacity: 0.68,
        material: 'dotted',
        x: 420,
        y: 170,
        width: 1550,
        height: 1040,
        z_index: 1,
        created_at_unix_ms: now - 380000,
        updated_at_unix_ms: now - 380000,
      },
      {
        id: 'wb-redeven-region-grid',
        name: 'Dock overlap band',
        fill: WORKBENCH_REGION_FILL_OPTIONS[5],
        opacity: 0.5,
        material: 'grid',
        x: 920,
        y: 880,
        width: 1280,
        height: 520,
        z_index: 2,
        created_at_unix_ms: now - 360000,
        updated_at_unix_ms: now - 360000,
      },
    ],
  };
}

function createWorkbenchDemoFallbackState(): WorkbenchState {
  return createRedevenParityWorkbenchState();
}

function isRedevenParityWorkbenchState(state: WorkbenchState): boolean {
  return (
    state.widgets.length > 0 &&
    state.widgets.every((widget) =>
      REDEVEN_PARITY_WIDGET_TYPES.includes(widget.type as RedevenParityWidgetType)
    )
  );
}

export function sanitizeWorkbenchDemoState(input: unknown): WorkbenchState {
  const sanitized = normalizeWorkbenchDemoState(
    sanitizeWorkbenchState(input, {
      widgetDefinitions: REDEVEN_PARITY_WORKBENCH_WIDGETS,
      createFallbackState: createWorkbenchDemoFallbackState,
    })
  );
  return isRedevenParityWorkbenchState(sanitized) ? sanitized : createWorkbenchDemoFallbackState();
}

export function WorkbenchDemoProvider(props: { children: JSX.Element }) {
  const [persistedState, setPersistedState] = usePersisted<WorkbenchState>(
    'demo.workbench.redeven-parity-state.v1',
    createWorkbenchDemoFallbackState()
  );

  const [store, setStore] = createStore<WorkbenchState>(
    sanitizeWorkbenchDemoState(persistedState())
  );

  createEffect(() => {
    setPersistedState(sanitizeWorkbenchDemoState(unwrap(store)));
  });

  const state: Accessor<WorkbenchState> = () => store;

  const setState = (updater: (prev: WorkbenchState) => WorkbenchState) => {
    const next = updater(unwrap(store));
    setStore(sanitizeWorkbenchDemoState(next));
  };

  const value: WorkbenchDemoContextValue = { state, setState };

  return (
    <WorkbenchDemoContext.Provider value={value}>
      {props.children}
    </WorkbenchDemoContext.Provider>
  );
}

export function useWorkbenchDemo(): WorkbenchDemoContextValue {
  const context = useContext(WorkbenchDemoContext);
  if (!context) {
    throw new Error('useWorkbenchDemo must be used within WorkbenchDemoProvider');
  }
  return context;
}
