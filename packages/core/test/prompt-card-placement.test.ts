import { describe, expect, it } from 'vitest';
import { avoidPromptCardRegions } from '../src/components/ui/promptCardPlacement';

const boundary = { left: 12, top: 12, right: 1268, bottom: 788 };
const size = { width: 344, height: 250 };
const overlap = (p: { x: number; y: number }, r: typeof size & { x: number; y: number }) =>
  Math.max(0, Math.min(p.x + size.width, r.x + r.width) - Math.max(p.x, r.x)) *
  Math.max(0, Math.min(p.y + size.height, r.y + r.height) - Math.max(p.y, r.y));
describe('contextual editor region avoidance', () => {
  it('places beside the whole selection instead of covering its top left', () => {
    const region = { x: 100, y: 200, width: 400, height: 260 };
    const p = avoidPromptCardRegions({ x: 108, y: 208 }, size, boundary, [region]);
    expect(overlap(p, region)).toBe(0);
    expect(p).toEqual({ x: 100, y: 472 });
  });
  it('avoids other selected regions and stays inside the viewport', () => {
    const regions = [{ x: 100, y: 200, width: 400, height: 260 }, { x: 100, y: 472, width: 400, height: 270 }];
    const p = avoidPromptCardRegions({ x: 108, y: 208 }, size, boundary, regions);
    expect(regions.map(r => overlap(p, r))).toEqual([0, 0]);
    expect(p.x).toBeGreaterThanOrEqual(12);
    expect(p.x + size.width).toBeLessThanOrEqual(1268);
  });
  it('remains bounded when a large selection leaves no free space', () => {
    const p = avoidPromptCardRegions({ x: 30, y: 30 }, size, boundary, [{ x: 0, y: 0, width: 1280, height: 800 }]);
    expect(p).toEqual({ x: 30, y: 30 });
  });
});
