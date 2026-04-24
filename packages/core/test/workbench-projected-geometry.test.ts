import { describe, expect, it } from 'vitest';

import {
  createWorkbenchProjectedRect,
  resolveWorkbenchProjectedSurfaceScaleBehavior,
  resolveWorkbenchWidgetRenderMode,
} from '../src/components/workbench';
import type { WorkbenchWidgetDefinition } from '../src/components/workbench';

describe('workbench projected geometry helpers', () => {
  it('computes projected rects from world coordinates and viewport state', () => {
    expect(
      createWorkbenchProjectedRect({
        widgetId: 'widget-preview',
        worldX: 18,
        worldY: 24,
        worldWidth: 480,
        worldHeight: 320,
        viewport: { x: 90, y: 60, scale: 1.25 },
      }),
    ).toEqual({
      widgetId: 'widget-preview',
      worldX: 18,
      worldY: 24,
      worldWidth: 480,
      worldHeight: 320,
      screenX: 113,
      screenY: 90,
      screenWidth: 600,
      screenHeight: 400,
      viewportScale: 1.25,
    });
  });

  it('defaults unspecified widget render modes to canvas_scaled', () => {
    const definition: WorkbenchWidgetDefinition = {
      type: 'custom.preview',
      label: 'Preview',
      icon: () => null,
      body: () => null,
      defaultTitle: 'Preview',
      defaultSize: { width: 480, height: 320 },
    };

    expect(resolveWorkbenchWidgetRenderMode(definition)).toBe('canvas_scaled');
    expect(resolveWorkbenchProjectedSurfaceScaleBehavior(definition)).toBe('stable_transform');
    expect(
      resolveWorkbenchWidgetRenderMode({
        ...definition,
        renderMode: 'projected_surface',
      }),
    ).toBe('projected_surface');
    expect(
      resolveWorkbenchProjectedSurfaceScaleBehavior({
        ...definition,
        projectedSurfaceScaleBehavior: 'settle_sharp_zoom',
      }),
    ).toBe('settle_sharp_zoom');
  });
});
