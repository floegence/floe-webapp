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
      value: (callback: FrameRequestCallback) =>
        window.setTimeout(() => callback(performance.now()), 0),
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
    const exitingWindow = document.querySelector(
      '[data-floe-geometry-surface="floating-window"]'
    ) as HTMLElement | null;
    expect(exitingWindow?.getAttribute('data-floating-presence')).toBe('exiting');
    expect(exitingWindow?.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('[data-testid="preview-body"]')).toBeTruthy();

    expect(() => setOpen!(true)).not.toThrow();
    await flushAnimationFrame();
    const reopenedWindow = document.querySelector(
      '[data-floe-geometry-surface="floating-window"]'
    ) as HTMLElement | null;
    expect(reopenedWindow?.style.transform).toBe('translate3d(20px, 28px, 0)');
    expect(document.querySelector('[data-testid="preview-body"]')).toBeTruthy();
  });

  it('keeps the same open surface when content state changes', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let updateContent: (() => void) | undefined;

    function Harness() {
      const [snapshot, setSnapshot] = createSignal({ open: true, content: 'First' });
      updateContent = () => setSnapshot({ open: true, content: 'Second' });

      return (
        <FloatingWindow
          open={snapshot().open}
          onOpenChange={() => undefined}
          title="Live preview"
          defaultPosition={{ x: 20, y: 20 }}
          defaultSize={{ width: 400, height: 300 }}
        >
          <div data-testid="live-preview-body">{snapshot().content}</div>
        </FloatingWindow>
      );
    }

    mount(() => <Harness />, host);
    await flushAnimationFrame();

    const geometry = document.querySelector<HTMLElement>(
      '[data-floe-geometry-surface="floating-window"]'
    );
    const surface = document.querySelector<HTMLElement>(
      '[data-floe-floating-window-surface="true"]'
    );
    expect(geometry?.getAttribute('data-floating-presence')).toBe('open');
    expect(surface?.getAttribute('data-floating-presence')).toBe('open');

    updateContent?.();
    await Promise.resolve();

    expect(document.querySelector('[data-floe-geometry-surface="floating-window"]')).toBe(geometry);
    expect(document.querySelector('[data-floe-floating-window-surface="true"]')).toBe(surface);
    expect(geometry?.getAttribute('data-floating-presence')).toBe('open');
    expect(surface?.getAttribute('data-floating-presence')).toBe('open');
    expect(document.querySelector('[data-testid="live-preview-body"]')?.textContent).toBe('Second');
  });
});
