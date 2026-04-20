// @vitest-environment jsdom

import { createEffect } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkbenchCanvas } from '../src/components/workbench/WorkbenchCanvas';
import type {
  WorkbenchWidgetDefinition,
  WorkbenchWidgetSurfaceMetrics,
} from '../src/components/workbench/types';

const observedProjectedMetrics: WorkbenchWidgetSurfaceMetrics[] = [];

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
      createEffect(() => {
        if (props.surfaceMetrics) {
          observedProjectedMetrics.push(props.surfaceMetrics);
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
    expect(projectedWidget?.style.left).toBe('130px');
    expect(projectedWidget?.style.top).toBe('95px');
    expect(projectedWidget?.getAttribute('style')).toContain('--floe-workbench-projected-scale: 1.5;');

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
});
