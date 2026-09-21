// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSignal, type Accessor } from 'solid-js';
import { render } from 'solid-js/web';
import { useResizeObserver, type Size } from '../src/hooks/useResizeObserver';
import { useVirtualWindow } from '../src/hooks/useVirtualWindow';

afterEach(() => { vi.unstubAllGlobals(); document.body.replaceChildren(); });

describe('useResizeObserver content dimensions', () => {
  it('preserves an opted-in hidden box while accepting real zero sizes and new elements', () => {
    let notify = () => {};
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { notify = callback; }
      observe() {}
      disconnect() {}
    });
    const element = document.createElement('div');
    let visible = true;
    let width = 900;
    Object.defineProperties(element, {
      clientWidth: { get: () => visible ? width : 0 },
      clientHeight: { get: () => visible ? 600 : 0 },
      getClientRects: { value: () => visible ? [{}] : [] },
    });
    const [target, setTarget] = createSignal<HTMLElement | null>(element);
    let size: Accessor<Size | null> = () => null;
    const dispose = render(() => {
      size = useResizeObserver(target, { preserveWhenHidden: true });
      return element;
    }, document.body);
    try {
      expect(size()).toEqual({ width: 900, height: 600 });
      visible = false;
      notify();
      expect(size()).toEqual({ width: 900, height: 600 });
      visible = true;
      width = 480;
      notify();
      expect(size()).toEqual({ width: 480, height: 600 });
      width = 0;
      notify();
      expect(size()).toEqual({ width: 0, height: 600 });
      setTarget(document.createElement('div'));
      expect(size()).toBeNull();
    } finally { dispose(); }
  });

  it('keeps the virtual range while its scroll container has no rendered box', () => {
    let notify = () => {};
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { notify = callback; }
      observe() {}
      disconnect() {}
    });
    const element = document.createElement('div');
    let visible = true;
    Object.defineProperties(element, {
      clientHeight: { get: () => visible ? 600 : 0 },
      scrollTop: { get: () => visible ? 2400 : 0 },
      getClientRects: { value: () => visible ? [{}] : [] },
    });
    let range = () => ({ start: 0, end: 0 });
    const dispose = render(() => {
      const virtual = useVirtualWindow({ count: () => 300, itemSize: () => 120, overscan: 2 });
      range = virtual.range;
      virtual.scrollRef(element);
      return element;
    }, document.body);
    try {
      expect(range()).toEqual({ start: 18, end: 27 });
      visible = false;
      notify();
      expect(range()).toEqual({ start: 18, end: 27 });
      visible = true;
      notify();
      expect(range()).toEqual({ start: 18, end: 27 });
    } finally { dispose(); }
  });

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
