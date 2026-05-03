import { describe, expect, it } from 'vitest';
import {
  normalizeFloatingWindowRect,
  resolveFloatingWindowViewport,
  resolveFloatingWindowRect,
} from '../src/components/ui/floatingWindowGeometry';

describe('floatingWindowGeometry', () => {
  it('resolves a safe viewport from non-negative edge insets', () => {
    expect(resolveFloatingWindowViewport(
      { width: 1280, height: 720 },
      { top: 40, right: 144, bottom: 12, left: -20 },
    )).toEqual({
      x: 0,
      y: 40,
      width: 1136,
      height: 668,
    });
  });

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

  it('keeps desktop drag movement inside the safe viewport', () => {
    expect(resolveFloatingWindowRect({
      mode: 'drag',
      pointer: { x: 1400, y: 0 },
      dragStartPos: { x: 280, y: 120 },
      dragStartRect: { x: 900, y: 80, width: 300, height: 240 },
      resizeStartPos: { x: 0, y: 0 },
      resizeStartRect: { x: 900, y: 80, width: 300, height: 240 },
      resizeHandle: 'se',
      minSize: { width: 200, height: 150 },
      maxSize: { width: 900, height: 700 },
      viewport: { width: 1280, height: 720 },
      viewportInsets: { top: 40, right: 144 },
      mobile: false,
      mobilePadding: 16,
    })).toEqual({
      x: 836,
      y: 40,
      width: 300,
      height: 240,
    });
  });

  it('caps resize growth at the safe viewport edge', () => {
    expect(resolveFloatingWindowRect({
      mode: 'resize',
      pointer: { x: 1600, y: 500 },
      dragStartPos: { x: 0, y: 0 },
      dragStartRect: { x: 720, y: 80, width: 320, height: 240 },
      resizeStartPos: { x: 1040, y: 320 },
      resizeStartRect: { x: 720, y: 80, width: 320, height: 240 },
      resizeHandle: 'e',
      minSize: { width: 200, height: 150 },
      maxSize: { width: 900, height: 700 },
      viewport: { width: 1280, height: 720 },
      viewportInsets: { top: 40, right: 144 },
      mobile: false,
      mobilePadding: 16,
    })).toEqual({
      x: 720,
      y: 80,
      width: 416,
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

  it('clamps restored desktop geometry to a safe viewport without recentring user placement', () => {
    expect(normalizeFloatingWindowRect({
      rect: { x: 980, y: 4, width: 360, height: 260 },
      minSize: { width: 200, height: 150 },
      maxSize: { width: 1200, height: 900 },
      viewport: { width: 1280, height: 720 },
      viewportInsets: { top: 40, right: 144 },
      mobile: false,
      mobilePadding: 16,
      center: false,
    })).toEqual({
      x: 776,
      y: 40,
      width: 360,
      height: 260,
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

  it('keeps mobile windows within safe viewport padding and fills the safe width', () => {
    expect(normalizeFloatingWindowRect({
      rect: { x: 240, y: 20, width: 640, height: 420 },
      minSize: { width: 280, height: 200 },
      maxSize: { width: 900, height: 700 },
      viewport: { width: 390, height: 844 },
      viewportInsets: { top: 40, bottom: 20 },
      mobile: true,
      mobilePadding: 16,
      center: false,
    })).toEqual({
      x: 16,
      y: 40,
      width: 358,
      height: 420,
    });
  });
});
