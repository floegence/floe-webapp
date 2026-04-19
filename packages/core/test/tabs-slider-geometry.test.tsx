// @vitest-environment jsdom

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tabs } from '../src/components/ui/Tabs';

type ElementLayoutOptions = {
  offsetParent?: HTMLElement | null;
  offsetLeft?: number;
  offsetWidth?: number;
  clientWidth?: number;
  scrollLeft?: number;
  rect?: {
    left: number;
    top?: number;
    width: number;
    height?: number;
  };
};

let rafQueue: FrameRequestCallback[] = [];

function createRect(init: NonNullable<ElementLayoutOptions['rect']>): DOMRect {
  const top = init.top ?? 0;
  const height = init.height ?? 24;

  return {
    x: init.left,
    y: top,
    left: init.left,
    top,
    width: init.width,
    height,
    right: init.left + init.width,
    bottom: top + height,
    toJSON() {
      return this;
    },
  } as DOMRect;
}

function defineNumberProperty(target: object, key: string, value: number): void {
  Object.defineProperty(target, key, {
    configurable: true,
    get: () => value,
  });
}

function defineLayout(element: HTMLElement, options: ElementLayoutOptions): void {
  if (options.offsetParent !== undefined) {
    Object.defineProperty(element, 'offsetParent', {
      configurable: true,
      get: () => options.offsetParent ?? null,
    });
  }

  if (options.offsetLeft !== undefined) {
    defineNumberProperty(element, 'offsetLeft', options.offsetLeft);
  }

  if (options.offsetWidth !== undefined) {
    defineNumberProperty(element, 'offsetWidth', options.offsetWidth);
  }

  if (options.clientWidth !== undefined) {
    defineNumberProperty(element, 'clientWidth', options.clientWidth);
  }

  if (options.scrollLeft !== undefined) {
    let scrollLeft = options.scrollLeft;
    Object.defineProperty(element, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value;
      },
    });
  }

  if (options.rect) {
    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () => createRect(options.rect!),
    });
  }
}

async function flushDeferredPaint(): Promise<void> {
  const callbacks = [...rafQueue];
  rafQueue = [];
  for (const callback of callbacks) {
    callback(16);
  }
  vi.runAllTimers();
  await Promise.resolve();
}

describe('Tabs slider geometry', () => {
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    rafQueue = [];
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      (callback: FrameRequestCallback) => {
        rafQueue.push(callback);
        return rafQueue.length;
      }
    );
  });

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps slider alignment in local layout coordinates inside scaled ancestors', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    dispose = render(
      () => (
        <Tabs
          items={[
            { id: 'tab1', label: 'Tab 1' },
            { id: 'tab2', label: 'Tab 2' },
          ]}
          activeId="tab1"
          features={{ indicator: { mode: 'slider' } }}
          slotClassNames={{ indicator: 'test-slider-indicator' }}
        />
      ),
      host
    );

    const scrollContainer = host.querySelector('[role="tablist"]') as HTMLDivElement | null;
    const tabs = host.querySelectorAll('[role="tab"]');
    expect(scrollContainer).toBeTruthy();
    expect(tabs).toHaveLength(2);

    defineLayout(scrollContainer!, {
      offsetWidth: 200,
      clientWidth: 200,
      scrollLeft: 0,
      rect: { left: 100, width: 400 },
    });
    defineLayout(tabs[0] as HTMLDivElement, {
      offsetParent: scrollContainer!,
      offsetLeft: 40,
      offsetWidth: 60,
      rect: { left: 180, width: 120 },
    });
    defineLayout(tabs[1] as HTMLDivElement, {
      offsetParent: scrollContainer!,
      offsetLeft: 108,
      offsetWidth: 72,
      rect: { left: 316, width: 144 },
    });

    await flushDeferredPaint();

    const indicator = host.querySelector('.test-slider-indicator') as HTMLDivElement | null;
    expect(indicator).toBeTruthy();
    expect(indicator?.style.transform).toContain('translate3d(40px');
    expect(indicator?.style.width).toBe('60px');
  });

  it('falls back to normalized rect measurements when local offsets are unavailable', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    dispose = render(
      () => (
        <Tabs
          items={[
            { id: 'tab1', label: 'Tab 1' },
            { id: 'tab2', label: 'Tab 2' },
          ]}
          activeId="tab1"
          features={{ indicator: { mode: 'slider' } }}
          slotClassNames={{ indicator: 'test-slider-indicator' }}
        />
      ),
      host
    );

    const scrollContainer = host.querySelector('[role="tablist"]') as HTMLDivElement | null;
    const tabs = host.querySelectorAll('[role="tab"]');
    expect(scrollContainer).toBeTruthy();
    expect(tabs).toHaveLength(2);

    defineLayout(scrollContainer!, {
      offsetWidth: 200,
      clientWidth: 200,
      scrollLeft: 0,
      rect: { left: 100, width: 400 },
    });
    defineLayout(tabs[0] as HTMLDivElement, {
      offsetParent: null,
      offsetLeft: 0,
      offsetWidth: 0,
      rect: { left: 180, width: 120 },
    });
    defineLayout(tabs[1] as HTMLDivElement, {
      offsetParent: null,
      offsetLeft: 0,
      offsetWidth: 0,
      rect: { left: 316, width: 144 },
    });

    await flushDeferredPaint();

    const indicator = host.querySelector('.test-slider-indicator') as HTMLDivElement | null;
    expect(indicator).toBeTruthy();
    expect(indicator?.style.transform).toContain('translate3d(40px');
    expect(indicator?.style.width).toBe('60px');
  });
});
