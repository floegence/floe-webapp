import { describe, expect, it } from 'vitest';
import {
  projectViewportRectToOverlayHost,
  type OverlayHostGeometry,
  type ViewportRect,
} from '../src/components/file-browser/useFileBrowserMarqueeSelection';

describe('file browser marquee overlay geometry', () => {
  it('projects viewport coordinates into overlay-host local coordinates', () => {
    const viewportRect: ViewportRect = {
      left: 268,
      top: 184,
      width: 120,
      height: 76,
    };

    const geometry: OverlayHostGeometry = {
      left: 200,
      top: 120,
      scrollLeft: 14,
      scrollTop: 36,
      clientLeft: 2,
      clientTop: 4,
    };

    expect(projectViewportRectToOverlayHost(viewportRect, geometry)).toEqual({
      left: 80,
      top: 96,
      width: 120,
      height: 76,
    });
  });

  it('preserves drag size while accounting for scrolled overlay hosts', () => {
    const viewportRect: ViewportRect = {
      left: 32,
      top: 48,
      width: 0,
      height: 0,
    };

    const geometry: OverlayHostGeometry = {
      left: 20,
      top: 18,
      scrollLeft: 120,
      scrollTop: 240,
      clientLeft: 0,
      clientTop: 0,
    };

    expect(projectViewportRectToOverlayHost(viewportRect, geometry)).toEqual({
      left: 132,
      top: 270,
      width: 0,
      height: 0,
    });
  });

  it('undoes transformed overlay host scale before writing local overlay pixels', () => {
    const viewportRect: ViewportRect = {
      left: 260,
      top: 180,
      width: 120,
      height: 80,
    };

    const geometry: OverlayHostGeometry = {
      left: 200,
      top: 120,
      scrollLeft: 24,
      scrollTop: 12,
      clientLeft: 2,
      clientTop: 4,
      scaleX: 0.5,
      scaleY: 0.5,
    };

    expect(projectViewportRectToOverlayHost(viewportRect, geometry)).toEqual({
      left: 142,
      top: 128,
      width: 240,
      height: 160,
    });
  });
});
