import { describe, expect, it } from 'vitest';

import {
  insetSurfaceFloatingPanelGeometry,
  resolveSurfaceFloatingPanelBounds,
  resolveSurfaceFloatingPanelPosition,
  resolveSurfaceFloatingPanelSnap,
} from '../src/components/ui/surfaceFloatingPanelGeometry';

describe('surface floating panel geometry', () => {
  const bounds = resolveSurfaceFloatingPanelBounds({
    left: 100,
    top: 64,
    width: 600,
    height: 436,
    panelWidth: 56,
    panelHeight: 56,
  });

  it('keeps the panel inside the resolved boundary inset', () => {
    expect(bounds).toEqual({
      x: { min: 108, max: 636, room: 528 },
      y: { min: 72, max: 436, room: 364 },
    });
    expect(resolveSurfaceFloatingPanelPosition(bounds, { x: 0.5, y: 0.5 })).toEqual({
      x: 372,
      y: 254,
    });
  });

  it('applies non-uniform app chrome insets before the panel gap', () => {
    const safeGeometry = insetSurfaceFloatingPanelGeometry(
      {
        left: 100,
        top: 64,
        width: 600,
        height: 436,
        panelWidth: 56,
        panelHeight: 56,
      },
      { top: 48, right: 16, bottom: 72, left: 16 }
    );
    expect(safeGeometry).toEqual({
      left: 116,
      top: 112,
      width: 568,
      height: 316,
      panelWidth: 56,
      panelHeight: 56,
    });
    expect(resolveSurfaceFloatingPanelBounds(safeGeometry, 12)).toEqual({
      x: { min: 128, max: 616, room: 488 },
      y: { min: 124, max: 360, room: 236 },
    });
  });

  it('snaps to the nearest edge and preserves the orthogonal position', () => {
    expect(resolveSurfaceFloatingPanelSnap({ x: 120, y: 300 }, bounds)).toEqual({
      edge: 'left',
      position: { x: 108, y: 300 },
    });
    expect(resolveSurfaceFloatingPanelSnap({ x: 400, y: 420 }, bounds)).toEqual({
      edge: 'bottom',
      position: { x: 400, y: 436 },
    });
    expect(resolveSurfaceFloatingPanelSnap({ x: 620, y: 180 }, bounds)).toEqual({
      edge: 'right',
      position: { x: 636, y: 180 },
    });
  });

  it('respects a finite snap threshold', () => {
    expect(resolveSurfaceFloatingPanelSnap({ x: 350, y: 80 }, bounds)).toEqual({
      edge: 'top',
      position: { x: 350, y: 72 },
    });
    expect(resolveSurfaceFloatingPanelSnap({ x: 350, y: 250 }, bounds, 24)).toBeNull();
    expect(resolveSurfaceFloatingPanelSnap({ x: 350, y: 84 }, bounds, 24)).toEqual({
      edge: 'top',
      position: { x: 350, y: 72 },
    });
  });

  it('collapses placement safely when the panel is larger than the boundary', () => {
    const constrained = resolveSurfaceFloatingPanelBounds({
      left: 20,
      top: 30,
      width: 40,
      height: 32,
      panelWidth: 56,
      panelHeight: 56,
    });
    expect(constrained).toEqual({
      x: { min: 28, max: 28, room: 0 },
      y: { min: 38, max: 38, room: 0 },
    });
    expect(resolveSurfaceFloatingPanelPosition(constrained, { x: 1, y: 1 })).toEqual({
      x: 28,
      y: 38,
    });
  });
});
