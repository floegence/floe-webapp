// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSignal, type Accessor } from 'solid-js';
import { render } from 'solid-js/web';
import { useResizeObserver, type Size } from '../src/hooks/useResizeObserver';

afterEach(() => { vi.unstubAllGlobals(); document.body.replaceChildren(); });

describe('useResizeObserver content dimensions', () => {
  it('keeps initial, observed, hidden and replacement dimensions in local content coordinates', () => {
    let notify: ResizeObserverCallback = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) { notify = callback; }
      observe() {}
      disconnect = disconnect;
    });
    const element = document.createElement('div');
    element.style.padding = '10px 12px';
    let width = 624;
    Object.defineProperties(element, {
      clientWidth: { get: () => width },
      clientHeight: { get: () => width ? 424 : 0 },
      getBoundingClientRect: { value: () => ({ width: 1248, height: 848 }) },
    });
    const [target, setTarget] = createSignal<HTMLElement | null>(element);
    let size: Accessor<Size | null> = () => null;
    const dispose = render(() => { size = useResizeObserver(target); return element; }, document.body);
    try {
      expect(size()).toEqual({ width: 600, height: 404 });
      width = 309; // Includes padding, excludes the new scrollbar.
      notify([{ target: element } as ResizeObserverEntry], {} as ResizeObserver);
      expect(size()).toEqual({ width: 285, height: 404 });
      width = 0;
      notify([{ target: element } as ResizeObserverEntry], {} as ResizeObserver);
      expect(size()).toEqual({ width: 0, height: 0 });
      width = 624;
      notify([{ target: element } as ResizeObserverEntry], {} as ResizeObserver);
      expect(size()).toEqual({ width: 600, height: 404 });
      setTarget(null);
      expect(size()).toBeNull();
      expect(disconnect).toHaveBeenCalledOnce();
    } finally { dispose(); }
  });

  it('uses the same content measurement without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const element = document.createElement('div');
    let width = 100;
    Object.defineProperties(element, { clientWidth: { get: () => width }, clientHeight: { value: 50 } });
    let size: Accessor<Size | null> = () => null;
    const dispose = render(() => { size = useResizeObserver(() => element); return element; }, document.body);
    try {
      expect(size()).toEqual({ width: 100, height: 50 });
      width = 200;
      window.dispatchEvent(new Event('resize'));
      expect(size()).toEqual({ width: 200, height: 50 });
    } finally { dispose(); }
  });
});
