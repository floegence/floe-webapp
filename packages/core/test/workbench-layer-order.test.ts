// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  compareWorkbenchLayerRenderOrder,
  createWorkbenchRenderLayerMap,
  resolveWorkbenchLayerFront,
  type WorkbenchLayerOrderItem,
} from '../src/components/workbench/workbenchHelpers';

function item(
  id: string,
  zIndex: number,
  createdAtUnixMs: number,
): WorkbenchLayerOrderItem {
  return {
    id,
    z_index: zIndex,
    created_at_unix_ms: createdAtUnixMs,
  };
}

describe('workbench layer order helpers', () => {
  it('sorts by z-index, creation time, and id using the render-layer contract', () => {
    const ordered = [
      item('later-id', 4, 20),
      item('high-z', 8, 1),
      item('early', 4, 10),
      item('same-created-b', 4, 20),
    ].sort(compareWorkbenchLayerRenderOrder);

    expect(ordered.map((entry) => entry.id)).toEqual([
      'early',
      'later-id',
      'same-created-b',
      'high-z',
    ]);
  });

  it('creates bounded render layers from the same ordering contract', () => {
    const layers = createWorkbenchRenderLayerMap([
      item('widget-a', 7, 10),
      item('sticky-a', 7, 30),
      item('widget-b', 1, 20),
    ]);

    expect(layers.topRenderLayer).toBe(3);
    expect(layers.byWidgetId.get('widget-b')).toBe(1);
    expect(layers.byWidgetId.get('widget-a')).toBe(2);
    expect(layers.byWidgetId.get('sticky-a')).toBe(3);
  });

  it('resolves front promotion when a tied layer item is visually above the target', () => {
    const resolution = resolveWorkbenchLayerFront([
      item('target', 7, 10),
      item('above-by-created', 7, 20),
    ], 'target');

    expect(resolution).toEqual({
      isTop: false,
      nextZIndex: 8,
    });
  });

  it('treats id tie-breakers as real front blockers', () => {
    const resolution = resolveWorkbenchLayerFront([
      item('target-a', 7, 10),
      item('target-b', 7, 10),
    ], 'target-a');

    expect(resolution).toEqual({
      isTop: false,
      nextZIndex: 8,
    });
  });

  it('does not promote an item that is already top by the complete render order', () => {
    const resolution = resolveWorkbenchLayerFront([
      item('older', 7, 10),
      item('target', 7, 20),
    ], 'target');

    expect(resolution).toEqual({
      isTop: true,
      nextZIndex: 8,
    });
  });

  it('returns null for missing targets', () => {
    expect(resolveWorkbenchLayerFront([
      item('widget-a', 1, 10),
    ], 'missing')).toBeNull();
  });
});
