// @vitest-environment jsdom
import { createContext, createSignal, onCleanup, Show, useContext } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkbenchWidget } from '../src/components/workbench/WorkbenchWidget';
import { WorkbenchWidgetHeader } from '../src/components/workbench/WorkbenchWidgetHeader';
import type { WorkbenchWidgetDefinition } from '../src/components/workbench/types';

afterEach(() => document.body.replaceChildren());

describe('Workbench widget header contributions', () => {
  it.each(['canvas_scaled', 'projected_surface'] as const)(
    'preserves body ownership and isolates header input in %s',
    async (layoutMode) => {
      const host = document.createElement('div');
      document.body.append(host);
      const [path, setPath] = createSignal('/one.md');
      const [visible, setVisible] = createSignal(true);
      const [layer, setLayer] = createSignal(1);
      const mounts = vi.fn();
      const cleanups = vi.fn();
      const click = vi.fn();
      const moved = vi.fn();
      const layoutStart = vi.fn();
      const LocalContext = createContext('outside');
      const Action = () => {
        const label = useContext(LocalContext);
        return (
          <button onClick={click}>
            {label}: {path()}
          </button>
        );
      };
      const definition: WorkbenchWidgetDefinition = {
        type: 'test.preview',
        label: 'Preview',
        icon: () => null,
        defaultTitle: 'Preview',
        defaultSize: { width: 600, height: 400 },
        body: () => {
          mounts();
          onCleanup(cleanups);
          return (
            <LocalContext.Provider value="preview">
              <Show when={visible()}>
                <WorkbenchWidgetHeader titleTooltip={path()} actions={<Action />} />
              </Show>
              <textarea aria-label="Draft">Keep my draft</textarea>
            </LocalContext.Provider>
          );
        },
      };
      const dispose = render(
        () => (
          <WorkbenchWidget
            definition={definition}
            widgetId="preview"
            widgetTitle="one.md"
            widgetType="test.preview"
            x={0}
            y={0}
            width={600}
            height={400}
            renderLayer={layer()}
            topRenderLayer={2}
            itemSnapshot={() => ({
              id: 'preview',
              title: 'one.md',
              type: 'test.preview',
              x: 0,
              y: 0,
              width: 600,
              height: 400,
              z_index: layer(),
              created_at_unix_ms: 1,
            })}
            selected
            visualFront
            viewportScale={0.8}
            locked={false}
            filtered={false}
            layoutMode={layoutMode}
            projectedViewport={() => ({ x: 0, y: 0, scale: 0.8 })}
            onSelect={() => {}}
            onContextMenu={() => {}}
            onClaimVisualFrontOwner={() => {}}
            onCommitFront={() => setLayer(2)}
            onCommitMove={moved}
            onCommitResize={() => {}}
            onRequestOverview={() => {}}
            onRequestFit={() => {}}
            onRequestDelete={() => {}}
            onLayoutInteractionStart={layoutStart}
          />
        ),
        host
      );
      try {
        const header = host.querySelector('header')!;
        const action = header.querySelector<HTMLButtonElement>(
          '[data-floe-workbench-header-actions] button'
        )!;
        expect(action.textContent).toBe('preview: /one.md');
        expect(header.querySelector('.workbench-widget__title')?.getAttribute('title')).toBe(
          '/one.md'
        );
        expect(host.querySelector('.workbench-widget__body button')).toBeNull();
        const draft = host.querySelector('textarea')!;
        draft.focus();
        const down = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 });
        Object.defineProperty(down, 'pointerId', { value: 1 });
        action.dispatchEvent(down);
        expect(down.defaultPrevented).toBe(false);
        expect(document.activeElement).toBe(draft);
        action.click();
        action.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        expect(click).toHaveBeenCalledOnce();
        expect(layoutStart).not.toHaveBeenCalled();
        expect(moved).not.toHaveBeenCalled();
        setPath('/two.md');
        setLayer(3);
        expect(action.textContent).toBe('preview: /two.md');
        expect(header.querySelector('.workbench-widget__title')?.getAttribute('title')).toBe(
          '/two.md'
        );
        expect(host.querySelector('textarea')).toBe(draft);
        expect(mounts).toHaveBeenCalledOnce();
        setVisible(false);
        expect(header.querySelector('[data-floe-workbench-header-actions]')).toBeNull();
        expect(header.querySelector('.workbench-widget__title')?.getAttribute('title')).toBe(
          'one.md'
        );
        setVisible(true);
        expect(header.querySelectorAll('[data-floe-workbench-header-actions] button')).toHaveLength(
          1
        );
      } finally {
        dispose();
      }
      expect(cleanups).toHaveBeenCalledOnce();
      expect(host.children).toHaveLength(0);
    }
  );
});
