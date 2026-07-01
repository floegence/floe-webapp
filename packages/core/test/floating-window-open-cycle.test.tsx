// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';

import { FloatingWindow } from '../src/components/ui/FloatingWindow';

vi.mock('../src/context/LayoutContext', () => ({
  useLayout: () => ({
    isMobile: () => false,
  }),
}));

const disposers: Array<() => void> = [];

let originalRequestAnimationFrame: typeof window.requestAnimationFrame | undefined;
let originalCancelAnimationFrame: typeof window.cancelAnimationFrame | undefined;

function mount(view: () => unknown, host: HTMLElement): void {
  disposers.push(renderSolid(view, host));
}

function flushAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      resolve();
    });
  });
}

describe('FloatingWindow open cycle', () => {
  beforeEach(() => {
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0),
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: (handle: number) => window.clearTimeout(handle),
    });
  });

  afterEach(() => {
    while (disposers.length > 0) {
      disposers.pop()?.();
    }
    document.body.innerHTML = '';
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: originalRequestAnimationFrame,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: originalCancelAnimationFrame,
    });
    vi.restoreAllMocks();
  });

  it('reopens without recursively updating committed geometry', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let setWindowOpen: ((open: boolean) => void) | undefined;

    function Harness() {
      const [open, setOpen] = createSignal(false);
      setWindowOpen = setOpen;

      return (
        <FloatingWindow
          open={open()}
          onOpenChange={setOpen}
          title="Preview"
          defaultPosition={{ x: 20, y: 20 }}
          defaultSize={{ width: 400, height: 300 }}
          viewportInsets={{ top: 28, right: 0, bottom: 0, left: 0 }}
        >
          <div data-testid="preview-body">Preview body</div>
        </FloatingWindow>
      );
    }

    mount(() => <Harness />, host);

    const setOpen = setWindowOpen;
    expect(setOpen).toBeTruthy();

    setOpen!(true);
    await flushAnimationFrame();
    expect(document.querySelector('[data-testid="preview-body"]')).toBeTruthy();

    setOpen!(false);
    await Promise.resolve();
    expect(document.querySelector('[data-testid="preview-body"]')).toBeNull();

    expect(() => setOpen!(true)).not.toThrow();
    await flushAnimationFrame();
    expect(document.querySelector('[data-testid="preview-body"]')).toBeTruthy();
  });
});
