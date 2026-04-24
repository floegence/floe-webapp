// @vitest-environment jsdom

import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkbenchCanvas } from '../src/components/workbench/WorkbenchCanvas';
import type {
  WorkbenchWidgetDefinition,
  WorkbenchWidgetSurfaceMetrics,
} from '../src/components/workbench/types';

const observedProjectedMetrics: WorkbenchWidgetSurfaceMetrics[] = [];
const bodyMounts = new Map<string, number>();
const bodyCleanups = new Map<string, number>();

function dispatchPointerEvent(
  type: string,
  target: EventTarget,
  options: {
    pointerId?: number;
    clientX?: number;
    clientY?: number;
    buttons?: number;
    button?: number;
  } = {},
): void {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  const event = new EventCtor(type, {
    bubbles: true,
    button: options.button ?? 0,
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
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
}

const widgetDefinitions: readonly WorkbenchWidgetDefinition[] = [
  {
    type: 'custom.canvas',
    label: 'Canvas',
    icon: () => null,
    body: () => <div data-testid="canvas-body">Canvas body</div>,
    defaultTitle: 'Canvas',
    defaultSize: { width: 320, height: 220 },
  },
  {
    type: 'custom.preview',
    label: 'Preview',
    icon: () => null,
    body: (props) => {
      onMount(() => {
        bodyMounts.set(props.widgetId, (bodyMounts.get(props.widgetId) ?? 0) + 1);
      });
      onCleanup(() => {
        bodyCleanups.set(props.widgetId, (bodyCleanups.get(props.widgetId) ?? 0) + 1);
      });
      createEffect(() => {
        if (props.surfaceMetrics) {
          const metrics = props.surfaceMetrics();
          if (metrics) {
            observedProjectedMetrics.push(metrics);
          }
        }
      });
      return <div data-testid="projected-body">Projected body</div>;
    },
    defaultTitle: 'Preview',
    defaultSize: { width: 400, height: 260 },
    renderMode: 'projected_surface',
  },
];

describe('Workbench projected surfaces', () => {
  afterEach(() => {
    observedProjectedMetrics.length = 0;
    bodyMounts.clear();
    bodyCleanups.clear();
    document.body.innerHTML = '';
  });

  it('renders projected widgets outside the scaled viewport while preserving projected metrics', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const dispose = render(() => (
      <WorkbenchCanvas
        widgetDefinitions={widgetDefinitions}
        widgets={[
          {
            id: 'widget-canvas',
            type: 'custom.canvas',
            title: 'Canvas',
            x: 40,
            y: 20,
            width: 320,
            height: 220,
            z_index: 1,
            created_at_unix_ms: 1,
          },
          {
            id: 'widget-preview',
            type: 'custom.preview',
            title: 'Preview',
            x: 20,
            y: 30,
            width: 400,
            height: 260,
            z_index: 2,
            created_at_unix_ms: 2,
          },
        ]}
        viewport={{ x: 100, y: 50, scale: 1.5 }}
        canvasFrameSize={{ width: 1200, height: 800 }}
        selectedWidgetId="widget-preview"
        optimisticFrontWidgetId={null}
        locked={false}
        filters={{
          'custom.canvas': true,
          'custom.preview': true,
        }}
        setCanvasFrameRef={() => {}}
        onViewportCommit={vi.fn()}
        onCanvasContextMenu={vi.fn()}
        onSelectWidget={vi.fn()}
        onWidgetContextMenu={vi.fn()}
        onStartOptimisticFront={vi.fn()}
        onCommitFront={vi.fn()}
        onCommitMove={vi.fn()}
        onCommitResize={vi.fn()}
        onRequestDelete={vi.fn()}
      />
    ), host);

    await Promise.resolve();

    const viewport = host.querySelector('.floe-infinite-canvas__viewport') as HTMLElement | null;
    const projectedLayer = host.querySelector('.workbench-canvas__projected-layer') as HTMLElement | null;
    const projectedWidget = host.querySelector(
      '[data-floe-workbench-widget-id="widget-preview"]'
    ) as HTMLElement | null;
    const canvasWidget = host.querySelector(
      '[data-floe-workbench-widget-id="widget-canvas"]'
    ) as HTMLElement | null;

    expect(viewport).toBeTruthy();
    expect(projectedLayer).toBeTruthy();
    expect(projectedWidget).toBeTruthy();
    expect(canvasWidget).toBeTruthy();

    expect(viewport?.contains(canvasWidget!)).toBe(true);
    expect(viewport?.contains(projectedWidget!)).toBe(false);
    expect(projectedLayer?.contains(projectedWidget!)).toBe(true);

    expect(projectedWidget?.dataset.floeWorkbenchRenderMode).toBe('projected_surface');
    expect(projectedWidget?.style.left).toBe('');
    expect(projectedWidget?.style.top).toBe('');
    expect(projectedWidget?.style.transform).toBe('translate(130px, 95px) scale(1.5)');

    expect(observedProjectedMetrics.at(-1)).toEqual({
      ready: true,
      rect: {
        widgetId: 'widget-preview',
        worldX: 20,
        worldY: 30,
        worldWidth: 400,
        worldHeight: 260,
        screenX: 130,
        screenY: 95,
        screenWidth: 600,
        screenHeight: 390,
        viewportScale: 1.5,
      },
    });

    dispose();
  });

  it('keeps projected widget bodies mounted while viewport updates only change projected geometry', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const dispose = render(() => {
      const [viewport, setViewport] = createSignal({ x: 100, y: 50, scale: 1.2 });

      return (
        <>
          <button
            type="button"
            data-testid="shift-viewport"
            onClick={() => setViewport((current) => ({ ...current, x: current.x + 80, y: current.y + 40 }))}
          >
            Shift viewport
          </button>
          <button
            type="button"
            data-testid="zoom-viewport"
            onClick={() => setViewport((current) => ({ ...current, scale: 1.7 }))}
          >
            Zoom viewport
          </button>
          <WorkbenchCanvas
            widgetDefinitions={widgetDefinitions}
            widgets={[
              {
                id: 'widget-preview',
                type: 'custom.preview',
                title: 'Preview',
                x: 20,
                y: 30,
                width: 400,
                height: 260,
                z_index: 2,
                created_at_unix_ms: 2,
              },
            ]}
            viewport={viewport()}
            canvasFrameSize={{ width: 1200, height: 800 }}
            selectedWidgetId="widget-preview"
            optimisticFrontWidgetId={null}
            locked={false}
            filters={{
              'custom.canvas': true,
              'custom.preview': true,
            }}
            setCanvasFrameRef={() => {}}
            onViewportCommit={setViewport}
            onCanvasContextMenu={vi.fn()}
            onSelectWidget={vi.fn()}
            onWidgetContextMenu={vi.fn()}
            onStartOptimisticFront={vi.fn()}
            onCommitFront={vi.fn()}
            onCommitMove={vi.fn()}
            onCommitResize={vi.fn()}
            onRequestOverview={vi.fn()}
            onRequestFit={vi.fn()}
            onRequestDelete={vi.fn()}
          />
        </>
      );
    }, host);

    await Promise.resolve();

    expect(bodyMounts.get('widget-preview')).toBe(1);
    expect(bodyCleanups.get('widget-preview') ?? 0).toBe(0);

    const button = host.querySelector('[data-testid="shift-viewport"]') as HTMLButtonElement | null;
    expect(button).toBeTruthy();
    button!.click();
    await Promise.resolve();

    expect(bodyMounts.get('widget-preview')).toBe(1);
    expect(bodyCleanups.get('widget-preview') ?? 0).toBe(0);
    expect(observedProjectedMetrics.at(-1)).toMatchObject({
      rect: {
        screenX: 204,
        screenY: 126,
      },
    });
    const projectedWidget = host.querySelector(
      '[data-floe-workbench-widget-id="widget-preview"]'
    ) as HTMLElement | null;
    expect(projectedWidget?.style.transform).toBe('translate(204px, 126px) scale(1.2)');

    const zoomButton = host.querySelector('[data-testid="zoom-viewport"]') as HTMLButtonElement | null;
    expect(zoomButton).toBeTruthy();
    zoomButton!.click();
    await Promise.resolve();

    expect(bodyMounts.get('widget-preview')).toBe(1);
    expect(bodyCleanups.get('widget-preview') ?? 0).toBe(0);
    expect(projectedWidget?.style.transform).toBe('translate(214px, 141px) scale(1.7)');
    expect(observedProjectedMetrics.at(-1)).toMatchObject({
      rect: {
        screenX: 214,
        screenY: 141,
        screenWidth: 680,
        screenHeight: 442,
        viewportScale: 1.7,
      },
    });

    dispose();
  });

  it('keeps sibling projected widget bodies mounted while dragging one projected widget shell', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const dispose = render(() => (
      <WorkbenchCanvas
        widgetDefinitions={widgetDefinitions}
        widgets={[
          {
            id: 'widget-preview-a',
            type: 'custom.preview',
            title: 'Preview A',
            x: 20,
            y: 30,
            width: 400,
            height: 260,
            z_index: 2,
            created_at_unix_ms: 2,
          },
          {
            id: 'widget-preview-b',
            type: 'custom.preview',
            title: 'Preview B',
            x: 480,
            y: 60,
            width: 400,
            height: 260,
            z_index: 3,
            created_at_unix_ms: 3,
          },
        ]}
        viewport={{ x: 100, y: 50, scale: 1.5 }}
        canvasFrameSize={{ width: 1200, height: 800 }}
        selectedWidgetId="widget-preview-a"
        optimisticFrontWidgetId={null}
        locked={false}
        filters={{
          'custom.canvas': true,
          'custom.preview': true,
        }}
        setCanvasFrameRef={() => {}}
        onViewportCommit={vi.fn()}
        onCanvasContextMenu={vi.fn()}
        onSelectWidget={vi.fn()}
        onWidgetContextMenu={vi.fn()}
        onStartOptimisticFront={vi.fn()}
        onCommitFront={vi.fn()}
        onCommitMove={vi.fn()}
        onCommitResize={vi.fn()}
        onRequestOverview={vi.fn()}
        onRequestFit={vi.fn()}
        onRequestDelete={vi.fn()}
      />
    ), host);

    await Promise.resolve();

    expect(bodyMounts.get('widget-preview-a')).toBe(1);
    expect(bodyMounts.get('widget-preview-b')).toBe(1);

    const widgetAHeader = host.querySelector(
      '[data-floe-workbench-widget-id="widget-preview-a"] .workbench-widget__header'
    ) as HTMLElement | null;
    expect(widgetAHeader).toBeTruthy();

    dispatchPointerEvent('pointerdown', widgetAHeader!, {
      pointerId: 21,
      clientX: 10,
      clientY: 10,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 21,
      clientX: 48,
      clientY: 34,
      buttons: 1,
    });
    dispatchPointerEvent('pointerup', document, {
      pointerId: 21,
      clientX: 48,
      clientY: 34,
      buttons: 0,
    });
    await Promise.resolve();

    expect(bodyMounts.get('widget-preview-a')).toBe(1);
    expect(bodyMounts.get('widget-preview-b')).toBe(1);
    expect(bodyCleanups.get('widget-preview-a') ?? 0).toBe(0);
    expect(bodyCleanups.get('widget-preview-b') ?? 0).toBe(0);

    dispose();
  });

  it('switches opt-in projected surfaces to delayed sharp mode without remounting the body', async () => {
    vi.useFakeTimers();

    const host = document.createElement('div');
    document.body.appendChild(host);

    const sharpWidgetDefinitions: readonly WorkbenchWidgetDefinition[] = [
      widgetDefinitions[0]!,
      {
        ...widgetDefinitions[1]!,
        projectedSurfaceScaleBehavior: 'settle_sharp_zoom',
      },
    ];

    const dispose = render(() => (
      <WorkbenchCanvas
        widgetDefinitions={sharpWidgetDefinitions}
        widgets={[
          {
            id: 'widget-preview',
            type: 'custom.preview',
            title: 'Preview',
            x: 20,
            y: 30,
            width: 400,
            height: 260,
            z_index: 2,
            created_at_unix_ms: 2,
          },
        ]}
        viewport={{ x: 100, y: 50, scale: 1.5 }}
        canvasFrameSize={{ width: 1200, height: 800 }}
        selectedWidgetId="widget-preview"
        optimisticFrontWidgetId={null}
        locked={false}
        filters={{
          'custom.canvas': true,
          'custom.preview': true,
        }}
        setCanvasFrameRef={() => {}}
        onViewportCommit={vi.fn()}
        onCanvasContextMenu={vi.fn()}
        onSelectWidget={vi.fn()}
        onWidgetContextMenu={vi.fn()}
        onStartOptimisticFront={vi.fn()}
        onCommitFront={vi.fn()}
        onCommitMove={vi.fn()}
        onCommitResize={vi.fn()}
        onRequestOverview={vi.fn()}
        onRequestFit={vi.fn()}
        onRequestDelete={vi.fn()}
      />
    ), host);

    await Promise.resolve();

    const projectedWidget = host.querySelector(
      '[data-floe-workbench-widget-id="widget-preview"]'
    ) as HTMLElement | null;
    const projectedSurface = projectedWidget?.querySelector(
      '.workbench-widget__surface'
    ) as HTMLElement | null;

    expect(projectedWidget).toBeTruthy();
    expect(projectedSurface).toBeTruthy();
    expect(projectedWidget?.style.transform).toBe('translate(130px, 95px) scale(1.5)');
    expect(projectedWidget?.style.width).toBe('400px');
    expect(projectedWidget?.style.height).toBe('260px');
    expect(bodyMounts.get('widget-preview')).toBe(1);
    expect(bodyCleanups.get('widget-preview') ?? 0).toBe(0);

    vi.advanceTimersByTime(160);
    await Promise.resolve();

    expect(projectedWidget?.style.transform).toBe('translate(130px, 95px)');
    expect(projectedWidget?.style.width).toBe('600px');
    expect(projectedWidget?.style.height).toBe('390px');
    expect(bodyMounts.get('widget-preview')).toBe(1);
    expect(bodyCleanups.get('widget-preview') ?? 0).toBe(0);

    dispose();
    vi.useRealTimers();
  });
});
