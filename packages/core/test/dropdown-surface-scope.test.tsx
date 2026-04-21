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
});
