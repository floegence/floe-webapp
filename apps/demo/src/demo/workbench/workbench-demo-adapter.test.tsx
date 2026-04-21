import type { JSX } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FloeProvider } from '@floegence/floe-webapp-core/app';
import { WORKBENCH_THEMES, sanitizeWorkbenchState } from '@floegence/floe-webapp-core/workbench';
import { WorkbenchDemoProvider, useWorkbenchDemo } from './WorkbenchDemoContext';

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
const DEMO_VITE_CONFIG_SOURCE = resolve(__dirname, '../../../vite.config.ts');
const DEMO_WORKSPACE_TAILWIND_SOURCE = resolve(__dirname, '../../core-workspace-tailwind.css');

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

  return (
    <div>
      {[
        state.version,
        state.widgets.length,
        state.widgets[0]?.type ?? 'none',
        state.locked ? 'locked' : 'unlocked',
        Object.values(state.filters).every(Boolean) ? 'all-on' : 'mixed',
        state.viewport.scale.toFixed(2),
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
        type: 'log-viewer' as const,
        title: 'Test Log',
        x: 320,
        y: 220,
        width: 420,
        height: 260,
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
    const seed = sanitizeWorkbenchState(undefined);
    expect(seed.version).toBe(1);
    expect(seed.widgets.length).toBeGreaterThan(0);
    expect(seed.locked).toBe(false);
    expect(Object.values(seed.filters).every(Boolean)).toBe(true);
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

    expect(html).toContain('1|5|terminal|unlocked|all-on|1.00');
  });

  it('allows programmatic state updates through the demo store', () => {
    const html = renderToString(() => (
      <DemoProviders>
        <AddWidgetProbe />
      </DemoProviders>
    ));

    expect(html).toContain('6|Test Log|log-viewer|99');
  });

  it('renders the demo page as a display-mode surface (no modal/portal chrome)', () => {
    const source = readFileSync(WORKBENCH_PAGE_SOURCE, 'utf-8');

    expect(source).toContain(
      "import { WorkbenchSurface } from '@floegence/floe-webapp-core/workbench';"
    );
    expect(source).toContain("import { useWorkbenchDemo } from './WorkbenchDemoContext';");
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

  it('loads page-mode and workbench styles in workspace dev mode', () => {
    const source = readFileSync(DEMO_WORKSPACE_TAILWIND_SOURCE, 'utf-8');

    expect(source).toContain(
      "@import '../../../packages/core/src/components/layout/displayMode.css';"
    );
    expect(source).toContain(
      "@import '../../../packages/core/src/components/workbench/workbench.css';"
    );
  });
});
