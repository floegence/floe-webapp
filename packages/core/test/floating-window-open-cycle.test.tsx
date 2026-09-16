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
  it('disables maximize controls and titlebar double-click while retaining drag and resize', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onOpenChange = vi.fn();
    mount(() => (
      <FloatingWindow open onOpenChange={onOpenChange} maximizable={false}
        defaultPosition={{ x: 80, y: 60 }} defaultSize={{ width: 420, height: 300 }}>
        <textarea />
      </FloatingWindow>
    ), host);
    await flushAnimationFrame();
    const root = document.querySelector<HTMLElement>('[data-floe-geometry-surface="floating-window"]')!;
    const titlebar = root.querySelector<HTMLElement>('[data-floe-floating-window-titlebar]')!;
    root.querySelector('textarea')!.value = 'Preserved draft';
    const geometry = root.style.cssText;
    expect(root.querySelector('[data-floe-floating-window-control="maximize"]')).toBeNull();
    titlebar.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(root.style.cssText).toBe(geometry);
    const down = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 });
    Object.defineProperties(down, { pointerId: { value: 7 }, pointerType: { value: 'mouse' } });
    titlebar.dispatchEvent(down);
    expect(document.documentElement.getAttribute('data-floe-hot-interaction')).toBe('drag');
    window.dispatchEvent(new Event('blur'));
    root.querySelector('[data-floe-floating-window-resize-handle="se"]')!.dispatchEvent(down);
    expect(document.documentElement.getAttribute('data-floe-hot-interaction')).toBe('resize');
    window.dispatchEvent(new Event('blur'));
    expect(root.querySelector('textarea')?.value).toBe('Preserved draft');
    root.querySelector<HTMLButtonElement>('[data-floe-floating-window-control="close"]')!.click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps maximize enabled by default independently of resizing and restores when disabled', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const [maximizable, setMaximizable] = createSignal<boolean | undefined>();
    mount(() => (
      <FloatingWindow open onOpenChange={() => undefined} resizable={false} maximizable={maximizable()}
        defaultPosition={{ x: 80, y: 60 }} defaultSize={{ width: 420, height: 300 }}>
        <p>Window content</p>
      </FloatingWindow>
    ), host);
    await flushAnimationFrame();
    const root = document.querySelector<HTMLElement>('[data-floe-geometry-surface="floating-window"]')!;
    const initial = { transform: root.style.transform, width: root.style.width, height: root.style.height };
    expect(root.querySelector('[data-floe-floating-window-resize-handle]')).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-floe-floating-window-control="maximize"]')!.click();
    expect(root.style.width).toBe('1200px');
    expect(root.style.height).toBe('800px');
    setMaximizable(false);
    await flushAnimationFrame();
    expect(root.querySelector('[data-floe-floating-window-control="maximize"]')).toBeNull();
    expect({ transform: root.style.transform, width: root.style.width, height: root.style.height }).toEqual(initial);
    setMaximizable(true);
    root.querySelector('[data-floe-floating-window-titlebar]')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(root.style.width).toBe('1200px');
  });

  it('keeps reactive header actions outside titlebar drag and double-click ownership', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const activate = vi.fn();
    const observedPointer = vi.fn();
    const [editing, setEditing] = createSignal(false);
    mount(() => (
      <FloatingWindow
        open
        onOpenChange={() => undefined}
        title="A long document filename.md"
        defaultPosition={{ x: 20, y: 20 }}
        headerActions={(
          <button type="button" onClick={() => { activate(); setEditing(true); }}>
            {editing() ? 'Save file' : 'Edit file'}
          </button>
        )}
      >
        <p>Selected reading content</p>
      </FloatingWindow>
    ), host);
    await flushAnimationFrame();
    const root = document.querySelector<HTMLElement>('[data-floe-geometry-surface="floating-window"]')!;
    const titlebar = root.querySelector<HTMLElement>('[data-floe-floating-window-titlebar]')!;
    const actions = titlebar.querySelector<HTMLElement>('[data-floe-floating-window-header-actions]');
    expect(actions).not.toBeNull();
    const initialTransform = root.style.transform;
    const initialWidth = root.style.width;
    root.addEventListener('pointerdown', observedPointer);
    const down = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 });
    Object.defineProperties(down, { pointerId: { value: 7 }, pointerType: { value: 'mouse' } });
    actions!.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(false);
    expect(observedPointer).toHaveBeenCalledOnce();
    expect(document.documentElement.hasAttribute('data-floe-hot-interaction')).toBe(false);
    actions!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(root.style.transform).toBe(initialTransform);
    expect(root.style.width).toBe(initialWidth);
    actions!.querySelector('button')!.click();
    expect(activate).toHaveBeenCalledOnce();
    expect(actions!.textContent).toContain('Save file');
    expect(root.querySelector('[data-floe-floating-window-content]')?.textContent).toBe('Selected reading content');
    titlebar.dispatchEvent(down);
    expect(document.documentElement.getAttribute('data-floe-hot-interaction')).toBe('drag');
  });

  it.each(['blur', 'lostpointercapture', 'pointercancel', 'unmount'])(
    'releases drag ownership and material on %s',
    async (reason) => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      mount(
        () => (
          <FloatingWindow open onOpenChange={() => undefined} title="Lifecycle">
            <input value="draft" />
          </FloatingWindow>
        ),
        host
      );
      await flushAnimationFrame();
      const root = document.querySelector<HTMLElement>(
        '[data-floe-geometry-surface="floating-window"]'
      )!;
      const title = root.querySelector<HTMLElement>('[data-floe-floating-window-titlebar]')!;
      const down = new MouseEvent('pointerdown', {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: 100,
        clientY: 100,
      });
      Object.defineProperties(down, { pointerId: { value: 7 }, pointerType: { value: 'mouse' } });
      title.dispatchEvent(down);
      expect(document.documentElement.getAttribute('data-floe-hot-interaction')).toBe('drag');
      if (reason === 'unmount') disposers.pop()?.();
      else if (reason === 'blur') window.dispatchEvent(new Event('blur'));
      else {
        const event = new MouseEvent(reason, { bubbles: true, clientX: 110, clientY: 110 });
        Object.defineProperty(event, 'pointerId', { value: 7 });
        root.dispatchEvent(event);
      }
      expect(document.documentElement.hasAttribute('data-floe-hot-interaction')).toBe(false);
      expect(document.querySelector('[data-floe-surface-interacting="true"]')).toBeNull();
    }
  );
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
    expect(document.querySelector('[data-floe-floating-window-content="true"]')).toBeTruthy();

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

  it('keeps the content and footer surfaces addressable without changing the window root', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(
      () => (
        <FloatingWindow
          open
          onOpenChange={() => undefined}
          title="Layered window"
          footer={<button type="button">Apply</button>}
        >
          <p>Reading plane</p>
        </FloatingWindow>
      ),
      host,
    );
    await flushAnimationFrame();

    expect(document.querySelector('[data-floe-floating-window-content="true"]')).toBeTruthy();
    expect(document.querySelector('[data-floe-floating-window-footer="true"]')).toBeTruthy();
  });
});
