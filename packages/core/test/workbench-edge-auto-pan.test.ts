// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createWorkbenchEdgeAutoPanController,
  resolveWorkbenchEdgeAutoPanVelocity,
} from '../src/components/workbench/workbenchEdgeAutoPan';

const frame = {
  left: 100,
  top: 80,
  right: 900,
  bottom: 680,
  width: 800,
  height: 600,
};

describe('Workbench edge auto-pan', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stays idle away from the canvas frame edges', () => {
    expect(resolveWorkbenchEdgeAutoPanVelocity({
      frame,
      clientX: 500,
      clientY: 380,
    })).toEqual({
      viewportVelocityX: 0,
      viewportVelocityY: 0,
    });
  });

  it('moves the viewport opposite the hot edge to reveal the target direction', () => {
    const rightBottom = resolveWorkbenchEdgeAutoPanVelocity({
      frame,
      clientX: 890,
      clientY: 670,
      thresholdPx: 40,
      maxSpeedPxPerSecond: 400,
    });
    expect(rightBottom.viewportVelocityX).toBeLessThan(0);
    expect(rightBottom.viewportVelocityY).toBeLessThan(0);

    const leftTop = resolveWorkbenchEdgeAutoPanVelocity({
      frame,
      clientX: 110,
      clientY: 90,
      thresholdPx: 40,
      maxSpeedPxPerSecond: 400,
    });
    expect(leftTop.viewportVelocityX).toBeGreaterThan(0);
    expect(leftTop.viewportVelocityY).toBeGreaterThan(0);
  });

  it('does not keep panning once the pointer has clearly left the app frame', () => {
    expect(resolveWorkbenchEdgeAutoPanVelocity({
      frame,
      clientX: 940,
      clientY: 700,
      outsideTolerancePx: 8,
    })).toEqual({
      viewportVelocityX: 0,
      viewportVelocityY: 0,
    });
  });

  it('reports inverse world deltas so dragged widgets can stay under the pointer', () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const commits: Array<{ x: number; y: number; scale: number }> = [];
    const pans: Array<{ viewportDeltaX: number; worldDeltaX: number }> = [];
    const controller = createWorkbenchEdgeAutoPanController({
      readFrame: () => frame,
      readViewport: () => commits[commits.length - 1] ?? { x: 0, y: 0, scale: 2 },
      commitViewport: (viewport) => commits.push(viewport),
      onPan: (step) => pans.push(step),
      activationDelayMs: 100,
      thresholdPx: 40,
      maxSpeedPxPerSecond: 400,
    });

    controller.updatePointer(890, 380);
    callbacks.shift()?.(0);
    callbacks.shift()?.(120);

    expect(commits).toHaveLength(1);
    expect(commits[0]!.x).toBeLessThan(0);
    expect(pans[0]!.viewportDeltaX).toBeCloseTo(commits[0]!.x, 6);
    expect(pans[0]!.worldDeltaX).toBeCloseTo(-commits[0]!.x / 2, 6);

    controller.stop();
  });
});
