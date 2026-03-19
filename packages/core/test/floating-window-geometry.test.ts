import { describe, expect, it } from 'vitest';
import {
  normalizeFloatingWindowRect,
  resolveFloatingWindowRect,
} from '../src/components/ui/floatingWindowGeometry';

describe('floatingWindowGeometry', () => {
  it('commits the final pointer position when resizing from the east edge', () => {
    expect(resolveFloatingWindowRect({
      mode: 'resize',
      pointer: { x: 540, y: 240 },
      dragStartPos: { x: 0, y: 0 },
      dragStartRect: { x: 120, y: 80, width: 320, height: 240 },
      resizeStartPos: { x: 440, y: 240 },
      resizeStartRect: { x: 120, y: 80, width: 320, height: 240 },
      resizeHandle: 'e',
      minSize: { width: 200, height: 150 },
      maxSize: { width: 900, height: 700 },
      viewport: { width: 1440, height: 900 },
      mobile: false,
      mobilePadding: 16,
    })).toEqual({
      x: 120,
      y: 80,
      width: 420,
      height: 240,
    });
  });

  it('clamps restored desktop geometry to the viewport without recentring user placement', () => {
    expect(normalizeFloatingWindowRect({
      rect: { x: 980, y: 640, width: 720, height: 520 },
      minSize: { width: 200, height: 150 },
      maxSize: { width: 1200, height: 900 },
      viewport: { width: 1280, height: 720 },
      mobile: false,
      mobilePadding: 16,
      center: false,
    })).toEqual({
      x: 560,
      y: 200,
      width: 720,
      height: 520,
    });
  });

  it('keeps mobile windows within padding and fills the available width', () => {
    expect(normalizeFloatingWindowRect({
      rect: { x: 240, y: 80, width: 640, height: 420 },
      minSize: { width: 280, height: 200 },
      maxSize: { width: 900, height: 700 },
      viewport: { width: 390, height: 844 },
      mobile: true,
      mobilePadding: 16,
      center: false,
    })).toEqual({
      x: 16,
      y: 80,
      width: 358,
      height: 420,
    });
  });
});
