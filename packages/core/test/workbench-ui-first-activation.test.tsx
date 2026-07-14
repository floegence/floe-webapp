// @vitest-environment jsdom

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  WorkbenchSurface,
  type WorkbenchState,
  type WorkbenchWidgetDefinition,
} from '../src/components/workbench';
import { createWorkbenchFilterState } from '../src/components/workbench/widgets/widgetRegistry';

vi.mock('solid-motionone', () => ({
  Motion: new Proxy({}, { get: () => ({ children }: { children?: unknown }) => children ?? null }),
}));

const definitions: readonly WorkbenchWidgetDefinition[] = [{
  type: 'custom.panel',
  label: 'Panel',
  icon: () => null,
  body: (props) => <button type="button" data-testid={`body-${props.widgetId}`}>{props.title}</button>,
  defaultTitle: 'Panel',
  defaultSize: { width: 320, height: 220 },
}];

function initialState(): WorkbenchState {
  return {
    version: 1,
    widgets: [
      { id: 'one', type: 'custom.panel', title: 'One', x: 20, y: 20, width: 320, height: 220, z_index: 1, created_at_unix_ms: 1 },
      { id: 'two', type: 'custom.panel', title: 'Two', x: 380, y: 20, width: 320, height: 220, z_index: 2, created_at_unix_ms: 2 },
    ],
    viewport: { x: 0, y: 0, scale: 1 },
    locked: false,
    filters: createWorkbenchFilterState(definitions),
    selectedWidgetId: 'one',
    selectedObject: { kind: 'widget', id: 'one' },
    theme: 'default',
  };
}

function pointerDown(target: EventTarget, pointerId: number): void {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  const event = new EventCtor('pointerdown', { bubbles: true, cancelable: true, button: 0 });
  if (!('pointerId' in event)) Object.defineProperty(event, 'pointerId', { value: pointerId });
  target.dispatchEvent(event);
}

describe('WorkbenchSurface UI-first activation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('paints selection before committing selection and front, keeping only the latest target', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });

    const host = document.createElement('div');
    document.body.append(host);
    let readState: () => WorkbenchState = initialState;
    const phases: string[] = [];

    render(() => {
      const [state, setState] = createSignal(initialState());
      readState = state;
      return (
        <WorkbenchSurface
          state={state}
          setState={setState}
          widgetDefinitions={definitions}
          widgetActivationMode="after-paint"
          onWidgetActivationEvent={(event) => phases.push(`${event.phase}:${event.value}`)}
        />
      );
    }, host);

    await Promise.resolve();
    const one = host.querySelector('[data-floe-workbench-widget-id="one"]') as HTMLElement;
    const two = host.querySelector('[data-floe-workbench-widget-id="two"]') as HTMLElement;
    expect(one.classList.contains('is-selected')).toBe(true);

    pointerDown(two.querySelector('.workbench-widget__surface')!, 1);
    await Promise.resolve();
    expect(readState().selectedWidgetId).toBe('one');
    expect(phases).toEqual(['requested:two']);
    expect(two.classList.contains('is-selected')).toBe(true);
    expect(one.classList.contains('is-selected')).toBe(false);
    expect(readState().selectedWidgetId).toBe('one');
    expect(readState().widgets.find((widget) => widget.id === 'two')?.z_index).toBe(2);

    pointerDown(one.querySelector('.workbench-widget__surface')!, 2);
    await Promise.resolve();
    expect(one.classList.contains('is-selected')).toBe(true);
    expect(two.classList.contains('is-selected')).toBe(false);

    const firstCommit = frames.shift();
    const secondCommit = frames.shift();
    firstCommit?.(16);
    secondCommit?.(16);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(readState().selectedWidgetId).toBe('one');
    expect(readState().widgets.find((widget) => widget.id === 'one')?.z_index).toBe(3);
    expect(readState().widgets.find((widget) => widget.id === 'two')?.z_index).toBe(2);
  });
});
