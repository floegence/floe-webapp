// @vitest-environment jsdom

import { onCleanup, onMount, createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkbenchCanvasField } from '../src/components/workbench/WorkbenchCanvasField';
import { resolveWorkbenchLayerFront } from '../src/components/workbench/workbenchHelpers';
import { createWorkbenchFilterState } from '../src/components/workbench/widgets/widgetRegistry';
import type { WorkbenchState, WorkbenchWidgetDefinition } from '../src/components/workbench/types';

const widgetDefinitions: readonly WorkbenchWidgetDefinition[] = [
  {
    type: 'custom.primary',
    label: 'Primary',
    icon: () => null,
    body: (props) => {
      onMount(() => {
        bodyLifecycle.mounts.set(
          props.widgetId,
          (bodyLifecycle.mounts.get(props.widgetId) ?? 0) + 1
        );
      });
      onCleanup(() => {
        bodyLifecycle.cleanups.set(
          props.widgetId,
          (bodyLifecycle.cleanups.get(props.widgetId) ?? 0) + 1
        );
      });
      return <div data-testid={`body-${props.widgetId}`}>Primary widget body</div>;
    },
    defaultTitle: 'Primary',
    defaultSize: { width: 360, height: 240 },
  },
  {
    type: 'custom.secondary',
    label: 'Secondary',
    icon: () => null,
    body: (props) => <div data-testid={`body-${props.widgetId}`}>Secondary widget body</div>,
    defaultTitle: 'Secondary',
    defaultSize: { width: 360, height: 240 },
  },
];

const bodyLifecycle = {
  mounts: new Map<string, number>(),
  cleanups: new Map<string, number>(),
};

function dispatchPointerEvent(
  type: string,
  target: EventTarget,
  options: { pointerId?: number; button?: number; buttons?: number } = {}
): Event {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  const event = new EventCtor(type, {
    bubbles: true,
    cancelable: true,
    button: options.button ?? 0,
  });
  if (!('pointerId' in event)) {
    Object.defineProperty(event, 'pointerId', {
      configurable: true,
      value: options.pointerId ?? 1,
    });
  }
  Object.defineProperty(event, 'buttons', {
    configurable: true,
    value: options.buttons ?? 1,
  });
  target.dispatchEvent(event);
  return event;
}

function mockPointerCapture(element: HTMLElement): void {
  Object.defineProperty(element, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(element, 'releasePointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
}

function createInitialState(): WorkbenchState {
  return {
    version: 1,
    widgets: [
      {
        id: 'widget-primary',
        type: 'custom.primary',
        title: 'Primary',
        x: 40,
        y: 24,
        width: 360,
        height: 240,
        z_index: 42,
        created_at_unix_ms: 1,
      },
      {
        id: 'widget-secondary',
        type: 'custom.secondary',
        title: 'Secondary',
        x: 420,
        y: 64,
        width: 360,
        height: 240,
        z_index: 420,
        created_at_unix_ms: 2,
      },
    ],
    viewport: { x: 0, y: 0, scale: 1 },
    locked: false,
    filters: createWorkbenchFilterState(widgetDefinitions),
    selectedWidgetId: null,
  };
}

function renderWorkbenchHarness(host: HTMLDivElement) {
  const [state, setState] = createSignal(createInitialState());

  const dispose = render(
    () => (
      <>
        <button
          type="button"
          data-testid="move-primary"
          onClick={() => {
            setState((prev) => ({
              ...prev,
              widgets: prev.widgets.map((widget) =>
                widget.id === 'widget-primary'
                  ? { ...widget, x: widget.x + 48, y: widget.y + 12 }
                  : widget
              ),
            }));
          }}
        >
          Move primary
        </button>
        <WorkbenchCanvasField
          widgetDefinitions={widgetDefinitions}
          widgets={state().widgets}
          selectedWidgetId={state().selectedWidgetId}
          visualFrontOwnerId={null}
          viewportScale={state().viewport.scale}
          locked={state().locked}
          filters={state().filters}
          onSelectWidget={(widgetId) => {
            setState((prev) => ({ ...prev, selectedWidgetId: widgetId }));
          }}
          onWidgetContextMenu={vi.fn()}
          onClaimVisualFrontOwner={vi.fn()}
          onCommitFront={(widgetId) => {
            const resolution = resolveWorkbenchLayerFront(state().widgets, widgetId);
            setState((prev) => ({
              ...prev,
              widgets: prev.widgets.map((widget) =>
                widget.id === widgetId && resolution && !resolution.isTop
                  ? { ...widget, z_index: resolution.nextZIndex }
                  : widget
              ),
            }));
          }}
          onCommitMove={(widgetId, position) => {
            setState((prev) => ({
              ...prev,
              widgets: prev.widgets.map((widget) =>
                widget.id === widgetId ? { ...widget, x: position.x, y: position.y } : widget
              ),
            }));
          }}
          onCommitResize={(widgetId, size) => {
            setState((prev) => ({
              ...prev,
              widgets: prev.widgets.map((widget) =>
                widget.id === widgetId
                  ? { ...widget, width: size.width, height: size.height }
                  : widget
              ),
            }));
          }}
          onRequestDelete={(widgetId) => {
            setState((prev) => ({
              ...prev,
              widgets: prev.widgets.filter((widget) => widget.id !== widgetId),
            }));
          }}
        />
      </>
    ),
    host
  );

  return { dispose, state };
}

describe('WorkbenchCanvas widget instance identity', () => {
  afterEach(() => {
    bodyLifecycle.mounts.clear();
    bodyLifecycle.cleanups.clear();
    document.body.innerHTML = '';
  });

  it('keeps the same widget body mounted when click-to-front updates z-index', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const { dispose, state } = renderWorkbenchHarness(host);
    await Promise.resolve();

    expect(bodyLifecycle.mounts.get('widget-primary')).toBe(1);

    const header = host.querySelector(
      '[data-floe-workbench-widget-id="widget-primary"] .workbench-widget__header'
    ) as HTMLElement | null;
    expect(header).toBeTruthy();
    mockPointerCapture(header!);
    dispatchPointerEvent('pointerdown', header!, { pointerId: 8 });
    dispatchPointerEvent('pointerup', document, { pointerId: 8, buttons: 0 });
    await Promise.resolve();

    expect(state().widgets.find((item) => item.id === 'widget-primary')?.z_index).toBe(421);
    expect(bodyLifecycle.mounts.get('widget-primary')).toBe(1);
    expect(bodyLifecycle.cleanups.get('widget-primary') ?? 0).toBe(0);

    dispose();
  });

  it('keeps the same widget body mounted when geometry updates replace the widget snapshot object', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const { dispose } = renderWorkbenchHarness(host);
    await Promise.resolve();

    expect(bodyLifecycle.mounts.get('widget-primary')).toBe(1);

    const moveButton = host.querySelector(
      '[data-testid="move-primary"]'
    ) as HTMLButtonElement | null;
    expect(moveButton).toBeTruthy();
    moveButton!.click();
    await Promise.resolve();

    expect(bodyLifecycle.mounts.get('widget-primary')).toBe(1);
    expect(bodyLifecycle.cleanups.get('widget-primary') ?? 0).toBe(0);

    dispose();
  });

  it('renders bounded layer indices instead of raw persisted z-index values', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const { dispose } = renderWorkbenchHarness(host);
    await Promise.resolve();

    const primaryWidget = host.querySelector(
      '[data-floe-workbench-widget-id="widget-primary"]'
    ) as HTMLElement | null;
    const secondaryWidget = host.querySelector(
      '[data-floe-workbench-widget-id="widget-secondary"]'
    ) as HTMLElement | null;
    expect(primaryWidget).toBeTruthy();
    expect(secondaryWidget).toBeTruthy();

    expect(primaryWidget?.style.zIndex).toBe('1');
    expect(secondaryWidget?.style.zIndex).toBe('2');

    dispose();
  });
});
