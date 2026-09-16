// @vitest-environment jsdom

import { createSignal } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';
import { expect, it, vi } from 'vitest';

import { SurfaceFloatingPanel } from '../src/components/ui/SurfaceFloatingPanel';

function pointer(target: EventTarget, type: string, x: number, y: number): void {
  const event = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  target.dispatchEvent(event);
}

it('snaps a dragged launcher to the nearest safe boundary edge', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
  const host = document.createElement('div');
  document.body.append(host);
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const restore = vi.fn();
  const positionChanged = vi.fn();
  let animatedLeft: number | undefined;
  let setBoundary!: (boundary: DOMRect) => void;
  const dispose = renderSolid(() => {
    const [boundary, updateBoundary] = createSignal(new DOMRect(100, 64, 600, 436));
    setBoundary = updateBoundary;
    return (
      <SurfaceFloatingPanel
        boundary={boundary()}
        boundaryInsets={{ top: 20, right: 30, bottom: 40, left: 50 }}
        snapToEdge
        snapThreshold={30}
        snapInset={12}
        onPositionChange={positionChanged}
        data-testid="snap-panel"
      >
        {(handle) => (
          <button {...handle} type="button" data-testid="launcher" onClick={restore}>
            Restore
          </button>
        )}
      </SurfaceFloatingPanel>
    );
  }, host);

  try {
    const panel = document.querySelector('[data-testid="snap-panel"]') as HTMLElement;
    const launcher = panel.querySelector('[data-testid="launcher"]') as HTMLButtonElement;
    Object.defineProperty(panel, 'getBoundingClientRect', {
      value: () => ({ width: 56, height: 56, left: animatedLeft ?? Number.parseFloat(panel.style.left), top: Number.parseFloat(panel.style.top) }),
    });
    for (const attribute of [
      'boundaryinsets',
      'snaptoedge',
      'snapthreshold',
      'snapinset',
      'onpositionchange',
    ]) {
      expect(panel.hasAttribute(attribute)).toBe(false);
    }
    frames.shift()?.(0);
    expect(panel.style.left).toBe('602px');
    expect(panel.style.top).toBe('392px');

    pointer(launcher, 'pointerdown', 630, 420);
    pointer(document, 'pointermove', 195, 280);
    pointer(document, 'pointerup', 195, 280);

    expect(panel.style.left).toBe('162px');
    expect(Number.parseFloat(panel.style.top)).toBeCloseTo(252);
    expect(panel.style.transition).toBe('');
    const snappedPosition = positionChanged.mock.calls.at(-1)?.[0];
    expect(snappedPosition?.x).toBeCloseTo(162);
    expect(snappedPosition?.y).toBeCloseTo(252);
    launcher.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(restore).not.toHaveBeenCalled();

    launcher.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    );
    expect(panel.style.left).toBe('172px');
    const keyboardPosition = positionChanged.mock.calls.at(-1)?.[0];
    expect(keyboardPosition?.x).toBeCloseTo(172);
    expect(keyboardPosition?.y).toBeCloseTo(252);
    launcher.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
    );
    expect(panel.style.left).toBe('162px');

    setBoundary(new DOMRect(200, 100, 400, 320));
    frames.shift()?.(0);
    expect(panel.style.left).toBe('262px');
    expect(Number.parseFloat(panel.style.top)).toBeGreaterThanOrEqual(132);
    expect(Number.parseFloat(panel.style.top) + 56).toBeLessThanOrEqual(368);

    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );
    pointer(launcher, 'pointerdown', 290, 260);
    pointer(document, 'pointermove', 518, 260);
    pointer(document, 'pointerup', 518, 260);
    expect(panel.style.left).toBe('502px');
    expect(panel.style.transition).toBe('');

    const beforeCancel = { left: panel.style.left, top: panel.style.top };
    const notificationsBeforeCancel = positionChanged.mock.calls.length;
    pointer(launcher, 'pointerdown', 290, 260);
    pointer(document, 'pointermove', 450, 180);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect({ left: panel.style.left, top: panel.style.top }).toEqual(beforeCancel);
    expect(positionChanged).toHaveBeenCalledTimes(notificationsBeforeCancel);

    pointer(launcher, 'pointerdown', 290, 260);
    pointer(document, 'pointermove', 293, 260);
    pointer(document, 'pointerup', 293, 260);
    launcher.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(restore).toHaveBeenCalledTimes(1);

    vi.mocked(matchMedia).mockReturnValue({ matches: false } as MediaQueryList);
    panel.animate = vi.fn(() => ({ cancel: vi.fn(), finished: new Promise(() => {}) }) as unknown as Animation);
    pointer(launcher, 'pointerdown', 530, 260);
    pointer(document, 'pointermove', 300, 260);
    pointer(document, 'pointerup', 300, 260);
    animatedLeft = 272;
    pointer(launcher, 'pointerdown', 300, 260);
    expect(Number.parseFloat(panel.style.left)).toBeCloseTo(272);
    pointer(document, 'pointermove', 320, 260);
    expect(Number.parseFloat(panel.style.left)).toBeCloseTo(292);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(Number.parseFloat(panel.style.left)).toBeCloseTo(272);
  } finally {
    dispose();
    host.remove();
    vi.unstubAllGlobals();
  }
});
