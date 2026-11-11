import { describe, expect, it } from 'vitest';
import { imagePointFromClient, validateImageAnnotation, imageAnnotationMarkup } from '../src/components/media/imageAnnotation';

describe('original-image annotation coordinates', () => {
  it('maps rendered image pixels independently of contain margins and display scale', () => {
    const image = { width: 1600, height: 1000 };
    for (const scale of [.2, .5, 1, 1.25, 2, 3]) {
      const rect = { left: 73, top: 151, width: image.width * scale, height: image.height * scale };
      expect(imagePointFromClient(image, rect, { x: 73 + 1200.25 * scale, y: 151 + 400.75 * scale })).toEqual({ x: 1200.25, y: 400.75 });
      expect(imagePointFromClient(image, rect, { x: 72, y: 151 })).toBeUndefined();
      expect(imagePointFromClient(image, rect, { x: 72, y: 151 }, true)).toEqual({ x: 0, y: 0 });
    }
  });
  it('rejects corrupt, off-image and unbounded selections before rendering', () => {
    const image = { width: 800, height: 500 };
    for (const selection of [{ kind: 'point', x: NaN, y: 0 }, { kind: 'point', x: 801, y: 2 },
      { kind: 'rectangle', x: 10, y: 20, width: 800, height: 50 }, { kind: 'rectangle', x: 0, y: 0, width: 0, height: 20 }]) {
      expect(validateImageAnnotation(image, selection as never)).toBe(false);
      expect(() => imageAnnotationMarkup(image, selection as never)).toThrow();
    }
    expect(validateImageAnnotation(image, { kind: 'point', x: 800, y: 500 })).toBe(true);
  });
});
