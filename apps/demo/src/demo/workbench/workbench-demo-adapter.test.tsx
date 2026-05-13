import type { JSX } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FloeProvider } from '@floegence/floe-webapp-core/app';
import { WORKBENCH_THEMES, sanitizeWorkbenchState } from '@floegence/floe-webapp-core/workbench';
import {
  DEMO_WORKBENCH_TEXT_DEFAULTS,
  DEMO_WORKBENCH_TEXT_FONT,
  REDEVEN_PARITY_LAUNCHER_WIDGET_TYPES,
  REDEVEN_PARITY_WORKBENCH_WIDGETS,
  WorkbenchDemoProvider,
  normalizeWorkbenchDemoState,
  sanitizeWorkbenchDemoState,
  useWorkbenchDemo,
} from './WorkbenchDemoContext';

const WORKBENCH_PAGE_SOURCE = resolve(__dirname, 'WorkbenchPage.tsx');
const WORKBENCH_WIDGET_SOURCE = resolve(
  __dirname,
  '../../../../../packages/core/src/components/workbench/WorkbenchWidget.tsx'
);
const WORKBENCH_STYLE_SOURCE = resolve(
  __dirname,
  '../../../../../packages/core/src/components/workbench/workbench.css'
);
const WORKBENCH_THEME_STYLE_SOURCE = resolve(
  __dirname,
  '../../../../../packages/core/src/components/workbench/workbench-themes.css'
);
const DEMO_INDEX_STYLE_SOURCE = resolve(__dirname, '../../index.css');
const DEMO_VITE_CONFIG_SOURCE = resolve(__dirname, '../../../vite.config.ts');
const DEMO_WORKSPACE_TAILWIND_SOURCE = resolve(__dirname, '../../core-workspace-tailwind.css');
const ROOT_VITEST_CONFIG_SOURCE = resolve(__dirname, '../../../../../vitest.config.ts');

function DemoProviders(props: { children: JSX.Element }) {
  return (
    <FloeProvider config={{ storage: { enabled: false } }}>
      <WorkbenchDemoProvider>{props.children}</WorkbenchDemoProvider>
    </FloeProvider>
  );
}

function StateProbe() {
  const demo = useWorkbenchDemo();
  const state = demo.state();
  const seedText = (state.annotations ?? []).find((annotation) => annotation.id === 'wb-seed-text-1');

  return (
    <div>
      {[
        state.version,
        state.widgets.length,
        state.widgets[0]?.type ?? 'none',
        state.locked ? 'locked' : 'unlocked',
        Object.values(state.filters).every(Boolean) ? 'all-on' : 'mixed',
        state.viewport.scale.toFixed(2),
        seedText?.font_size ?? -1,
        seedText?.font_family === DEMO_WORKBENCH_TEXT_FONT.fontFamily ? 'demo-sans' : 'other-font',
      ].join('|')}
    </div>
  );
}

function AddWidgetProbe() {
  const demo = useWorkbenchDemo();
  demo.setState((prev) => ({
    ...prev,
    widgets: [
      ...prev.widgets,
      {
        id: 'wb-test-widget',
        type: 'redeven.monitor' as const,
        title: 'Test Monitor',
        x: 320,
        y: 220,
        width: 1040,
        height: 640,
        z_index: 99,
        created_at_unix_ms: 1700000000000,
      },
    ],
  }));

  const state = demo.state();
  const added = state.widgets.find((w: { id: string }) => w.id === 'wb-test-widget');

  return (
    <div>
      {[
        state.widgets.length,
        added?.title ?? 'none',
        added?.type ?? 'none',
        added?.z_index ?? -1,
      ].join('|')}
    </div>
  );
}

describe('demo workbench shared adapter', () => {
  it('seeds sensible default state from sanitizeWorkbenchState', () => {
    const seed = normalizeWorkbenchDemoState(sanitizeWorkbenchState(undefined));
    const seedText = (seed.annotations ?? []).find((annotation) => annotation.id === 'wb-seed-text-1');

    expect(seed.version).toBe(1);
    expect(seed.widgets.length).toBeGreaterThan(0);
    expect(seed.locked).toBe(false);
    expect(Object.values(seed.filters).every(Boolean)).toBe(true);
    expect(seedText).toMatchObject(DEMO_WORKBENCH_TEXT_DEFAULTS);
    expect(seedText?.width).toBeGreaterThanOrEqual(460);
  });

  it('migrates the built-in demo text sample without changing user text annotations', () => {
    const oldState = sanitizeWorkbenchState(undefined);
    const migrated = normalizeWorkbenchDemoState({
      ...oldState,
      annotations: [
        {
          ...(oldState.annotations ?? [])[0]!,
          font_size: 34,
          width: 320,
        },
        {
          ...(oldState.annotations ?? [])[0]!,
          id: 'user-text-1',
          font_size: 28,
        },
      ],
    });

    expect(migrated.annotations?.[0]).toMatchObject(DEMO_WORKBENCH_TEXT_DEFAULTS);
    expect(migrated.annotations?.[0]?.width).toBe(460);
    expect(migrated.annotations?.[1]?.font_size).toBe(28);
  });

  it('widens the previous demo text sample when it has not been user-edited', () => {
    const oldState = sanitizeWorkbenchState(undefined);
    const migrated = normalizeWorkbenchDemoState({
      ...oldState,
      annotations: [
        {
          ...(oldState.annotations ?? [])[0]!,
          ...DEMO_WORKBENCH_TEXT_DEFAULTS,
          width: 390,
        },
      ],
    });

    expect(migrated.annotations?.[0]?.width).toBe(460);
    expect(migrated.annotations?.[0]?.height).toBe(108);
  });

  it('keeps later edits to the demo text sample user-controlled', () => {
    const oldState = sanitizeWorkbenchState(undefined);
    const migrated = normalizeWorkbenchDemoState({
      ...oldState,
      annotations: [
        {
          ...(oldState.annotations ?? [])[0]!,
          ...DEMO_WORKBENCH_TEXT_DEFAULTS,
          updated_at_unix_ms: (oldState.annotations ?? [])[0]!.updated_at_unix_ms + 1,
          font_size: 52,
        },
      ],
    });

    expect(migrated.annotations?.[0]?.font_size).toBe(52);
  });

  it('keeps the five demo theme directions available in the selector', () => {
    expect(WORKBENCH_THEMES.map((theme) => theme.id)).toEqual([
      'default',
      'vibrancy',
      'mica',
      'midnight',
      'aurora',
      'terminal',
    ]);
  });

  it('maps macOS traffic lights to real widget window actions', () => {
    const source = readFileSync(WORKBENCH_WIDGET_SOURCE, 'utf-8');

    expect(source).toContain('workbench-widget__traffic-dot--close');
    expect(source).toContain('onClick={handleDelete}');
    expect(source).toContain('<X class="workbench-widget__traffic-icon"');
    expect(source).toContain('workbench-widget__traffic-dot--min');
    expect(source).toContain('onClick={handleOverview}');
    expect(source).toContain('<Minus class="workbench-widget__traffic-icon"');
    expect(source).toContain('workbench-widget__traffic-dot--max');
    expect(source).toContain('onClick={handleFit}');
    expect(source).toContain('<Maximize class="workbench-widget__traffic-icon"');
    expect(source).toContain('workbench-widget__window-control--close');
    expect(source).toContain('<X class="workbench-widget__window-control-icon"');
    expect(source).not.toContain('class="workbench-widget__close"');
  });

  it('keeps window chrome affordances visible across themes', () => {
    const baseSource = readFileSync(WORKBENCH_STYLE_SOURCE, 'utf-8');
    const themeSource = readFileSync(WORKBENCH_THEME_STYLE_SOURCE, 'utf-8');

    expect(baseSource).toContain('.workbench-widget__traffic-icon {');
    expect(baseSource).toContain('.workbench-widget__traffic:hover .workbench-widget__traffic-icon,');
    expect(baseSource).toContain('.workbench-widget__window-control-icon {');
    expect(baseSource).toContain('.workbench-widget__window-control--close {');
    expect(baseSource).toContain('.workbench-widget__window-controls {');
    expect(baseSource).toContain('display: inline-flex;');
    expect(baseSource).toContain('gap: 0;');
    expect(baseSource).toContain('.workbench-widget__header {');
    expect(baseSource).toContain('cursor: move;');
    expect(baseSource).toContain('.workbench-widget.is-locked .workbench-widget__header {');
    expect(baseSource).not.toContain('.workbench-widget__close {');
    expect(themeSource).toContain(
      ".workbench-surface[data-workbench-theme='vibrancy'] .workbench-widget__window-controls {"
    );
    expect(themeSource).toContain(
      ".workbench-surface[data-workbench-theme='mica'] .workbench-widget__window-control--close {"
    );
    expect(themeSource).toContain(
      '.workbench-widget__window-control:not(.workbench-widget__window-control--close):hover'
    );
    expect(themeSource).toContain(
      '.workbench-widget__window-control:not(.workbench-widget__window-control--close):focus-visible'
    );
    expect(themeSource).not.toContain('cursor: grab;');
  });

  it('exposes the default widget set through the demo store', () => {
    const html = renderToString(() => (
      <DemoProviders>
        <StateProbe />
      </DemoProviders>
    ));

    expect(html).toContain('1|4|redeven.terminal|unlocked|all-on|0.36|45|demo-sans');
  });

  it('allows programmatic state updates through the demo store', () => {
    const html = renderToString(() => (
      <DemoProviders>
        <AddWidgetProbe />
      </DemoProviders>
    ));

    expect(html).toContain('5|Test Monitor|redeven.monitor|99');
  });

  it('falls back to the Redeven-parity registry when older demo state contains built-in widgets', () => {
    const sanitized = sanitizeWorkbenchDemoState({
      version: 1,
      widgets: [
        {
          id: 'legacy-terminal',
          type: 'terminal',
          title: 'Terminal',
          x: 0,
          y: 0,
          width: 480,
          height: 320,
          z_index: 1,
          created_at_unix_ms: 1,
        },
      ],
      viewport: { x: 0, y: 0, scale: 1 },
      locked: false,
      filters: {},
      selectedWidgetId: 'legacy-terminal',
      selectedObject: { kind: 'widget', id: 'legacy-terminal' },
      theme: 'default',
    });

    expect(sanitized.widgets.map((widget: { type: string }) => widget.type)).toEqual([
      'redeven.terminal',
      'redeven.files',
      'redeven.ai',
      'redeven.codex',
    ]);
  });

  it('mirrors Redeven workbench widget composition in the demo seed', () => {
    expect(REDEVEN_PARITY_WORKBENCH_WIDGETS.map((definition) => definition.type)).toEqual([
      'redeven.files',
      'redeven.terminal',
      'redeven.preview',
      'redeven.monitor',
      'redeven.codespaces',
      'redeven.ports',
      'redeven.ai',
      'redeven.codex',
    ]);
    expect(REDEVEN_PARITY_WORKBENCH_WIDGETS.every((definition) => definition.renderMode === 'projected_surface')).toBe(true);
    expect(new Set(REDEVEN_PARITY_WORKBENCH_WIDGETS.map((definition) => definition.body)).size).toBe(
      REDEVEN_PARITY_WORKBENCH_WIDGETS.length
    );
    expect(renderToString(() => {
      const filesDefinition = REDEVEN_PARITY_WORKBENCH_WIDGETS.find((definition) => definition.type === 'redeven.files')!;
      const FilesBody = filesDefinition.body;
      return (
        <FloeProvider config={{ storage: { enabled: false } }}>
          <FilesBody
            widgetId="files-probe"
            title="Files"
            type="redeven.files"
            lifecycle="hot"
            selected={true}
          />
        </FloeProvider>
      );
    })).toContain('workbench-demo-file-browser');
    expect(REDEVEN_PARITY_LAUNCHER_WIDGET_TYPES).toEqual([
      'redeven.files',
      'redeven.terminal',
      'redeven.monitor',
      'redeven.codespaces',
      'redeven.ports',
      'redeven.ai',
      'redeven.codex',
    ]);
    expect(REDEVEN_PARITY_LAUNCHER_WIDGET_TYPES).not.toContain('redeven.preview');
  });

  it('renders the demo page as a display-mode surface (no modal/portal chrome)', () => {
    const source = readFileSync(WORKBENCH_PAGE_SOURCE, 'utf-8');

    expect(source).toContain(
      "import { WorkbenchSurface } from '@floegence/floe-webapp-core/workbench';"
    );
    expect(source).toContain('useWorkbenchDemo');
    expect(source).toContain('DEMO_WORKBENCH_TEXT_DEFAULTS');
    expect(source).toContain('REDEVEN_PARITY_WORKBENCH_WIDGETS');
    expect(source).toContain('REDEVEN_PARITY_LAUNCHER_WIDGET_TYPES');
    expect(source).toContain('widgetDefinitions={REDEVEN_PARITY_WORKBENCH_WIDGETS}');
    expect(source).toContain('launcherWidgetTypes={REDEVEN_PARITY_LAUNCHER_WIDGET_TYPES}');
    expect(source).toContain('textAnnotationDefaults={DEMO_WORKBENCH_TEXT_DEFAULTS}');
    expect(source).toContain('<WorkbenchSurface');
    // Display-mode page must not use a Portal: it lives inline inside
    // DisplayModePageShell, not pop up over arbitrary content.
    expect(source).not.toContain("from 'solid-js/web'");
    expect(source).not.toContain('<Portal>');
  });

  it('keeps the Vite workspace aliases in sync with the workbench subpath import', () => {
    const source = readFileSync(DEMO_VITE_CONFIG_SOURCE, 'utf-8');

    expect(source).toContain("find: '@floegence/floe-webapp-core/workbench'");
    expect(source).toContain("replacement: resolve(repoRoot, 'packages/core/src/workbench.ts')");
  });

  it('keeps Vitest aliases in sync with demo workbench subpath imports', () => {
    const source = readFileSync(ROOT_VITEST_CONFIG_SOURCE, 'utf-8');

    expect(source).toContain("find: '@floegence/floe-webapp-core/workbench'");
    expect(source).toContain("replacement: resolve(__dirname, 'packages/core/src/workbench.ts')");
    expect(source).toContain("find: '@floegence/floe-webapp-core/icons'");
    expect(source).toContain("replacement: resolve(__dirname, 'packages/core/src/icons.ts')");
    expect(source).toContain("find: '@floegence/floe-webapp-core/ui'");
    expect(source).toContain("replacement: resolve(__dirname, 'packages/core/src/ui.ts')");
    expect(source).toContain("find: '@floegence/floe-webapp-core/file-browser'");
    expect(source).toContain("replacement: resolve(__dirname, 'packages/core/src/file-browser.ts')");
  });

  it('loads demo workbench styles from the production app CSS entry', () => {
    const indexSource = readFileSync(DEMO_INDEX_STYLE_SOURCE, 'utf-8');
    const workspaceSource = readFileSync(DEMO_WORKSPACE_TAILWIND_SOURCE, 'utf-8');

    expect(indexSource).toContain("@import '@floegence/floe-webapp-core/tailwind';");
    expect(indexSource).toContain("@import './demo/workbench/workbench-demo.css';");
    expect(workspaceSource).not.toContain("@import './demo/workbench/workbench-demo.css';");
  });

  it('loads page-mode and workbench core styles in workspace dev mode', () => {
    const source = readFileSync(DEMO_WORKSPACE_TAILWIND_SOURCE, 'utf-8');

    expect(source).toContain(
      "@import '../../../packages/core/src/components/layout/displayMode.css';"
    );
    expect(source).toContain(
      "@import '../../../packages/core/src/components/workbench/workbench.css';"
    );
  });
});
