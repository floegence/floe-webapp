// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render as renderSolid } from 'solid-js/web';

import { Dropdown } from '../src/components/ui/Dropdown';

const disposers: Array<() => void> = [];

function mount(view: () => unknown, host: HTMLElement): void {
  disposers.push(renderSolid(view, host));
}

function dispatchPointerDown(target: EventTarget): void {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  const event = new EventCtor('pointerdown', {
    bubbles: true,
    cancelable: true,
    button: 0,
  });
  if (!('pointerId' in event)) {
    Object.defineProperty(event, 'pointerId', { configurable: true, value: 1 });
  }
  target.dispatchEvent(event);
}

function mockRect(
  element: HTMLElement,
  rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  }
) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      ...rect,
      x: rect.left,
      y: rect.top,
      toJSON: () => undefined,
    }),
  });
}

describe('Dropdown surface scope', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    while (disposers.length > 0) {
      disposers.pop()?.();
    }
    document.body.innerHTML = '';
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('mounts dropdown menus inside the nearest surface host and keeps selections clickable', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onSelect = vi.fn();

    mount(
      () => (
        <div
          data-testid="surface-host"
          data-floe-dialog-surface-host="true"
          style={{ position: 'relative', width: '320px', height: '240px' }}
        >
          <Dropdown
            trigger={<span>Open menu</span>}
            items={[
              { id: 'alpha', label: 'Alpha' },
              { id: 'bravo', label: 'Bravo' },
            ]}
            onSelect={onSelect}
          />
        </div>
      ),
      host
    );

    const surfaceHost = host.querySelector('[data-testid="surface-host"]') as HTMLDivElement | null;
    const trigger = host.querySelector('[data-floe-dropdown-trigger]') as HTMLDivElement | null;

    expect(surfaceHost).toBeTruthy();
    expect(trigger).toBeTruthy();

    dispatchPointerDown(trigger!);
    trigger!.click();
    await Promise.resolve();

    const menu = surfaceHost!.querySelector(
      '[data-floe-dropdown][role="menu"]'
    ) as HTMLDivElement | null;
    expect(menu).toBeTruthy();
    expect(menu?.getAttribute('data-floe-local-interaction-surface')).toBe('true');

    const bravoButton = Array.from(menu!.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Bravo')
    ) as HTMLButtonElement | undefined;
    expect(bravoButton).toBeTruthy();

    dispatchPointerDown(bravoButton!);
    bravoButton!.click();
    vi.runAllTimers();
    await Promise.resolve();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('bravo');
  });

  it('mounts transformed-host dropdowns into the nearest portal layer and projects trigger geometry against that layer', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onSelect = vi.fn();

    mount(
      () => (
        <div
          data-testid="surface-layer"
          data-floe-surface-portal-layer="true"
          style={{ position: 'relative', width: '520px', height: '360px' }}
        >
          <div
            data-testid="surface-host"
            data-floe-dialog-surface-host="true"
            style={{ position: 'absolute', left: '120px', top: '80px', width: '320px', height: '240px' }}
          >
            <Dropdown
              trigger={<span>Open layered menu</span>}
              items={[
                { id: 'alpha', label: 'Alpha' },
                { id: 'bravo', label: 'Bravo' },
              ]}
              onSelect={onSelect}
            />
          </div>
        </div>
      ),
      host
    );

    const surfaceLayer = host.querySelector('[data-testid="surface-layer"]') as HTMLDivElement | null;
    const surfaceHost = host.querySelector('[data-testid="surface-host"]') as HTMLDivElement | null;
    const trigger = host.querySelector('[data-floe-dropdown-trigger]') as HTMLDivElement | null;

    expect(surfaceLayer).toBeTruthy();
    expect(surfaceHost).toBeTruthy();
    expect(trigger).toBeTruthy();

    mockRect(surfaceLayer!, {
      left: 20,
      top: 30,
      right: 540,
      bottom: 390,
      width: 520,
      height: 360,
    });
    mockRect(surfaceHost!, {
      left: 120,
      top: 80,
      right: 440,
      bottom: 320,
      width: 320,
      height: 240,
    });
    mockRect(trigger!, {
      left: 160,
      top: 140,
      right: 220,
      bottom: 164,
      width: 60,
      height: 24,
    });

    dispatchPointerDown(trigger!);
    trigger!.click();
    await Promise.resolve();

    const menu = surfaceLayer!.querySelector('[data-floe-dropdown][role="menu"]') as HTMLDivElement | null;
    expect(menu).toBeTruthy();
    expect(surfaceLayer?.contains(menu ?? null)).toBe(true);
    expect(surfaceHost?.contains(menu ?? null)).toBe(false);
    expect(menu?.style.left).toBe('140px');
    expect(menu?.style.top).toBe('138px');

    const bravoButton = Array.from(menu!.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Bravo')
    ) as HTMLButtonElement | undefined;
    expect(bravoButton).toBeTruthy();

    dispatchPointerDown(bravoButton!);
    bravoButton!.click();
    vi.runAllTimers();
    await Promise.resolve();

    expect(onSelect).toHaveBeenCalledWith('bravo');
  });
});
