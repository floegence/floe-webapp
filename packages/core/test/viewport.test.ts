import { describe, expect, it } from 'vitest';
import { resolveViewportSnapshot, viewportStyle } from '../src/viewport';

const source = {
  width: 390, height: 744,
  visualViewport: { width: 390, height: 744, offsetLeft: 0, offsetTop: 0, scale: 1 },
  safeArea: { top: 20, right: 0, bottom: 34, left: 0 },
  editing: false, touch: true,
};

describe('visible application viewport', () => {
  it('keeps browser chrome changes separate from keyboard occlusion', () => {
    const expanded = resolveViewportSnapshot(source);
    const collapsed = resolveViewportSnapshot({ ...source, height: 844,
      visualViewport: { ...source.visualViewport, height: 844 } });
    expect(expanded.keyboardOpen).toBe(false);
    expect(collapsed.keyboardOpen).toBe(false);
    expect(expanded.visible.bottom).toBe(744);
    expect(collapsed.visible.bottom).toBe(844);
  });

  it('requires both an editable focus and real occlusion, including keyboard dismissal with retained focus', () => {
    expect(resolveViewportSnapshot({ ...source, editing: true }).keyboardOpen).toBe(false);
    const keyboard = { ...source.visualViewport, height: 420, offsetTop: 30 };
    expect(resolveViewportSnapshot({ ...source, visualViewport: keyboard }).keyboardOpen).toBe(false);
    const open = resolveViewportSnapshot({ ...source, editing: true, visualViewport: keyboard });
    expect(open.keyboardOpen).toBe(true);
    expect(open.visible).toMatchObject({ top: 30, height: 420, bottom: 450 });
    expect(open.layout.height).toBe(744);
    expect(open.safeArea.bottom).toBe(0);
    expect(resolveViewportSnapshot({ ...source, editing: true }).safeArea.bottom).toBe(34);
  });

  it('does not mistake zoom or the input accessory bar for a soft keyboard', () => {
    expect(resolveViewportSnapshot({ ...source, editing: true,
      visualViewport: { ...source.visualViewport, height: 700 } }).keyboardOpen).toBe(false);
    expect(resolveViewportSnapshot({ ...source, editing: true,
      visualViewport: { ...source.visualViewport, height: 372, scale: 2 } }).keyboardOpen).toBe(false);
  });

  it('converts Safari keyboard page panning exactly once for fixed surfaces', () => {
    const snapshot = resolveViewportSnapshot({ ...source, editing: true,
      fixedOrigin: { left: 0, top: -337 },
      visualViewport: { ...source.visualViewport, height: 377, offsetTop: 337 } });
    expect(snapshot.visible).toMatchObject({ top: 0, bottom: 377 });
    expect(snapshot.fixedOffset.top).toBe(337);
    expect(viewportStyle(snapshot).top).toBe('337px');
  });

  it('uses the current orientation and handles absent visual viewport APIs', () => {
    const rotated = resolveViewportSnapshot({ ...source, width: 844, height: 390, editing: true,
      visualViewport: { width: 844, height: 390, offsetTop: 0, offsetLeft: 0, scale: 1 } });
    expect(rotated.keyboardOpen).toBe(false);
    expect(resolveViewportSnapshot({ ...source, visualViewport: null }).visible.height).toBe(744);
  });
});
