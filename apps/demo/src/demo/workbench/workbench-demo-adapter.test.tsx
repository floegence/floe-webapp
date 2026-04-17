import type { JSX } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FloeProvider } from '@floegence/floe-webapp-core/app';
import { sanitizeWorkbenchState } from '@floegence/floe-webapp-core/workbench';
import { WorkbenchDemoProvider, useWorkbenchDemo } from './WorkbenchDemoContext';

const WORKBENCH_PAGE_SOURCE = resolve(__dirname, 'WorkbenchPage.tsx');
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

  it('loads workbench overlay styles in workspace dev mode', () => {
    const source = readFileSync(DEMO_WORKSPACE_TAILWIND_SOURCE, 'utf-8');

    expect(source).toContain(
      "@import '../../../packages/core/src/components/workbench/workbench.css';"
    );
  });
});
