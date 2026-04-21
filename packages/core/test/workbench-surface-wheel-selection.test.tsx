// @vitest-environment jsdom

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkbenchCanvas } from '../src/components/workbench/WorkbenchCanvas';
import type {
  WorkbenchState,
  WorkbenchWidgetDefinition,
} from '../src/components/workbench/types';
import { createWorkbenchFilterState } from '../src/components/workbench/widgets/widgetRegistry';
import { CANVAS_WHEEL_INTERACTIVE_ATTR } from '../src/components/ui/localInteractionSurface';

const widgetDefinitions: readonly WorkbenchWidgetDefinition[] = [
  {
    type: 'custom.scroll-panel',
    label: 'Scroll Panel',
    icon: () => null,
    body: () => <div data-testid="widget-body">Scrollable panel body</div>,
    defaultTitle: 'Scroll Panel',
    defaultSize: { width: 320, height: 220 },
  },
];

function createWorkbenchState(): WorkbenchState {
  return {
    version: 1,
    widgets: [
      {
        id: 'widget-scroll-1',
        type: 'custom.scroll-panel',
        title: 'Scroll Panel',
        x: 80,
        y: 64,
        width: 320,
        height: 220,
        z_index: 1,
        created_at_unix_ms: 1,
      },
    ],
    viewport: { x: 120, y: 72, scale: 1 },
    locked: false,
    filters: createWorkbenchFilterState(widgetDefinitions),
    selectedWidgetId: null,
    theme: 'default',
  };
}

function dispatchPointerEvent(
  type: string,
  target: EventTarget,
  options: {
    button?: number;
    pointerId?: number;
    clientX?: number;
    clientY?: number;
  } = {},
): void {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  const event = new EventCtor(type, {
    bubbles: true,
    button: options.button ?? 0,
    clientX: options.clientX ?? 24,
    clientY: options.clientY ?? 24,
  });

  if (!('pointerId' in event)) {
    Object.defineProperty(event, 'pointerId', {
      configurable: true,
      value: options.pointerId ?? 1,
    });
  }

  target.dispatchEvent(event);
}

function dispatchWheel(target: EventTarget, deltaY: number): WheelEvent {
  const event = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    clientX: 320,
    clientY: 240,
    deltaY,
  });
  target.dispatchEvent(event);
  return event;
}

function mockCanvasRect(canvas: HTMLElement): void {
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      right: 960,
      bottom: 640,
      width: 960,
      height: 640,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    }),
  });

  Object.defineProperty(canvas, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(canvas, 'hasPointerCapture', {
    configurable: true,
    value: vi.fn(() => false),
  });
  Object.defineProperty(canvas, 'releasePointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
}

describe('Workbench wheel ownership', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('switches wheel ownership when the user clicks into and out of a widget', async () => {
    vi.useFakeTimers();

    const host = document.createElement('div');
    document.body.appendChild(host);

    const dispose = render(() => {
      const [state, setState] = createSignal(createWorkbenchState());

      return (
        <>
          <WorkbenchCanvas
            widgetDefinitions={widgetDefinitions}
            widgets={state().widgets}
            viewport={state().viewport}
            canvasFrameSize={{ width: 960, height: 640 }}
            selectedWidgetId={state().selectedWidgetId}
            optimisticFrontWidgetId={null}
            locked={state().locked}
            filters={state().filters}
            setCanvasFrameRef={() => {}}
            onViewportCommit={(viewport) => {
              setState((prev) => ({ ...prev, viewport }));
            }}
            onCanvasContextMenu={vi.fn()}
            onCanvasPointerDown={() => {
              setState((prev) => ({ ...prev, selectedWidgetId: null }));
            }}
            onSelectWidget={(widgetId) => {
              setState((prev) => ({ ...prev, selectedWidgetId: widgetId }));
            }}
            onWidgetContextMenu={vi.fn()}
            onStartOptimisticFront={vi.fn()}
            onCommitFront={vi.fn()}
            onCommitMove={vi.fn()}
            onCommitResize={vi.fn()}
            onRequestOverview={vi.fn()}
            onRequestFit={vi.fn()}
            onRequestDelete={vi.fn()}
          />
          <output data-testid="selected-widget-id">{state().selectedWidgetId ?? 'null'}</output>
        </>
      );
    }, host);

    await Promise.resolve();

    const canvas = host.querySelector('.floe-infinite-canvas') as HTMLElement | null;
    const widgetRoot = host.querySelector(
      '[data-floe-workbench-widget-id="widget-scroll-1"]'
    ) as HTMLElement | null;
    const widgetBody = host.querySelector('[data-testid="widget-body"]') as HTMLElement | null;

    expect(canvas).toBeTruthy();
    expect(widgetRoot).toBeTruthy();
    expect(widgetBody).toBeTruthy();

    mockCanvasRect(canvas!);

    expect(host.querySelector('[data-testid="selected-widget-id"]')?.textContent).toBe('null');
    expect(widgetRoot?.getAttribute(CANVAS_WHEEL_INTERACTIVE_ATTR)).toBeNull();

    const wheelBeforeSelection = dispatchWheel(widgetBody!, -120);
    expect(wheelBeforeSelection.defaultPrevented).toBe(true);

    dispatchPointerEvent('pointerdown', widgetBody!, { pointerId: 2 });
    await Promise.resolve();

    expect(host.querySelector('[data-testid="selected-widget-id"]')?.textContent).toBe('widget-scroll-1');
    expect(widgetRoot?.getAttribute(CANVAS_WHEEL_INTERACTIVE_ATTR)).toBe('true');

    const wheelAfterWidgetSelection = dispatchWheel(widgetBody!, -120);
    expect(wheelAfterWidgetSelection.defaultPrevented).toBe(false);

    dispatchPointerEvent('pointerdown', canvas!, { pointerId: 3 });
    dispatchPointerEvent('pointerup', canvas!, { pointerId: 3 });
    await Promise.resolve();

    expect(host.querySelector('[data-testid="selected-widget-id"]')?.textContent).toBe('null');
    expect(widgetRoot?.getAttribute(CANVAS_WHEEL_INTERACTIVE_ATTR)).toBeNull();

    const wheelAfterCanvasSelection = dispatchWheel(widgetBody!, -120);
    expect(wheelAfterCanvasSelection.defaultPrevented).toBe(true);

    vi.runOnlyPendingTimers();
    dispose();
  });
});
