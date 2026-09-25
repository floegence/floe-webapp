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

  it('retains the resized window height while Safari transiently clips its visual viewport', () => {
    // Physical iPhone: native keyboard opening reports 294, 65, then 294px
    // visual heights while innerHeight stays 294px after document normalization.
    const nativeKeyboard = { ...source, width: 420, height: 692, innerHeight: 294, editing: true };
    for (const height of [294, 65, -128, 294]) {
      const snapshot = resolveViewportSnapshot({ ...nativeKeyboard,
        visualViewport: { ...source.visualViewport, width: 420, height } });
      expect(snapshot.visible.height).toBe(294);
      expect(snapshot.keyboardOpen).toBe(true);
    }
    // Browsers retaining a full layout window still use the visual keyboard
    // viewport. Native pinch zoom must not expand to the unzoomed window.
    expect(resolveViewportSnapshot({ ...nativeKeyboard, innerHeight: 692,
      visualViewport: { ...source.visualViewport, height: 294 } }).visible.height).toBe(294);
    expect(resolveViewportSnapshot({ ...nativeKeyboard,
      visualViewport: { ...source.visualViewport, height: 147, scale: 2 } }).visible.height).toBe(147);
  });

  it('retains native keyboard measurement through asynchronous document normalization', () => {
    const nativeKeyboard = { ...source, height: 692, innerHeight: 294, editing: true };
    let previous = resolveViewportSnapshot({ ...nativeKeyboard,
      visualViewport: { ...source.visualViewport, height: 294 } });
    for (const height of [65, -128, 294]) {
      previous = resolveViewportSnapshot({ ...nativeKeyboard, innerHeight: 692,
        visualViewport: { ...source.visualViewport, height } }, previous);
      expect(previous.visible.height).toBe(294);
      expect(previous.keyboardOpen).toBe(true);
    }
    // A newly resized native window authorizes a different keyboard height.
    previous = resolveViewportSnapshot({ ...nativeKeyboard, innerHeight: 250,
      visualViewport: { ...source.visualViewport, height: 250 } }, previous);
    expect(previous.visible.height).toBe(250);
    previous = resolveViewportSnapshot({ ...nativeKeyboard, innerHeight: 692,
      visualViewport: { ...source.visualViewport, height: 692 } }, previous);
    expect(previous.keyboardOpen).toBe(false);
    expect(resolveViewportSnapshot({ ...nativeKeyboard, innerHeight: 692,
      visualViewport: { ...source.visualViewport, height: 200 } }, previous).visible.height).toBe(200);
  });

  it('keeps the visible origin on screen while Safari delays its visual offset event', () => {
    // Native Safari moves fixed surfaces before updating visualViewport.offsetTop.
    // Every intermediate snapshot must preserve the header and lower content edge.
    for (const offsetTop of [0, 120, 337]) {
      const snapshot = resolveViewportSnapshot({ ...source, editing: true,
        fixedOrigin: { left: -12, top: -337 },
        visualViewport: { ...source.visualViewport, height: 377, offsetLeft: 0, offsetTop } });
      expect(snapshot.visible).toMatchObject({ left: 0, top: 0, bottom: 377 });
      expect(viewportStyle(snapshot)).toMatchObject({ left: '12px', top: '337px' });
    }
  });

  it('uses the current orientation and handles absent visual viewport APIs', () => {
    const rotated = resolveViewportSnapshot({ ...source, width: 844, height: 390, editing: true,
      visualViewport: { width: 844, height: 390, offsetTop: 0, offsetLeft: 0, scale: 1 } });
    expect(rotated.keyboardOpen).toBe(false);
    expect(resolveViewportSnapshot({ ...source, visualViewport: null }).visible.height).toBe(744);
  });

  it('converts fixed geometry through inherited CSS zoom without scaling client bounds', () => {
    const snapshot = resolveViewportSnapshot({ ...source, fixedScale: 2,
      fixedOrigin: { left: -20, top: -100 },
      visualViewport: { ...source.visualViewport, offsetLeft: 30, offsetTop: 120 } });
    expect(snapshot.visible).toMatchObject({ left: 10, top: 20, width: 390, height: 744 });
    expect(viewportStyle(snapshot)).toEqual({ position: 'fixed', left: '15px', top: '60px', width: '195px', height: '372px' });
  });
});
