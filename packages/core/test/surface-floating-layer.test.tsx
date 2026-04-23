// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';

import { SurfaceFloatingLayer } from '../src/components/ui/SurfaceFloatingLayer';
import { __resetSurfacePortalScopeForTests } from '../src/components/ui/surfacePortalScope';

const disposers: Array<() => void> = [];

function mount(view: () => unknown, host: HTMLElement): void {
  disposers.push(renderSolid(view, host));
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

function dispatchContextMenu(target: EventTarget, x: number, y: number): void {
  target.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
      clientX: x,
      clientY: y,
    })
  );
}

describe('SurfaceFloatingLayer', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
  });

  afterEach(() => {
    while (disposers.length > 0) {
      disposers.pop()?.();
    }
    document.body.innerHTML = '';
    __resetSurfacePortalScopeForTests();
    vi.restoreAllMocks();
  });

  it('uses the contextmenu target to mount into the nearest surface host', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    function Harness() {
      const [open, setOpen] = createSignal(false);
      return (
        <div
          data-testid="surface-host"
          data-floe-dialog-surface-host="true"
          style={{ position: 'relative', width: '320px', height: '240px' }}
          onContextMenu={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          <button type="button" data-testid="trigger">
            Open layer
          </button>
          {open() && (
            <SurfaceFloatingLayer
              position={{ x: 88, y: 96 }}
              estimatedSize={{ width: 120, height: 80 }}
              role="menu"
              data-testid="floating-layer"
            >
              <button type="button">Action</button>
            </SurfaceFloatingLayer>
          )}
        </div>
      );
    }

    mount(() => <Harness />, host);

    const surfaceHost = host.querySelector('[data-testid="surface-host"]') as HTMLDivElement | null;
    const trigger = host.querySelector('[data-testid="trigger"]') as HTMLButtonElement | null;
    expect(surfaceHost).toBeTruthy();
    expect(trigger).toBeTruthy();
    mockRect(surfaceHost!, {
      left: 0,
      top: 0,
      right: 320,
      bottom: 240,
      width: 320,
      height: 240,
    });

    dispatchContextMenu(trigger!, 88, 96);
    await Promise.resolve();

    const layer = surfaceHost!.querySelector('[data-testid="floating-layer"]') as HTMLDivElement | null;
    expect(layer).toBeTruthy();
    expect(layer?.className).toContain('absolute');
    expect(layer?.getAttribute('data-floe-local-interaction-surface')).toBe('true');
    expect(layer?.style.left).toBe('88px');
    expect(layer?.style.top).toBe('96px');
  });

  it('mounts transformed-host layers into the portal layer and clamps against the host boundary', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    function Harness() {
      const [open, setOpen] = createSignal(false);
      return (
        <div
          data-testid="surface-layer"
          data-floe-surface-portal-layer="true"
          style={{ position: 'relative', width: '520px', height: '360px' }}
        >
          <div
            data-testid="surface-host"
            data-floe-dialog-surface-host="true"
            style={{ position: 'absolute', left: '120px', top: '80px', width: '320px', height: '240px' }}
            onContextMenu={(event) => {
              event.preventDefault();
              setOpen(true);
            }}
          >
            <button type="button" data-testid="trigger">
              Open layered menu
            </button>
            {open() && (
              <SurfaceFloatingLayer
                position={{ x: 420, y: 300 }}
                estimatedSize={{ width: 100, height: 80 }}
                role="menu"
                data-testid="floating-layer"
              >
                <button type="button">Action</button>
              </SurfaceFloatingLayer>
            )}
          </div>
        </div>
      );
    }

    mount(() => <Harness />, host);

    const surfaceLayer = host.querySelector('[data-testid="surface-layer"]') as HTMLDivElement | null;
    const surfaceHost = host.querySelector('[data-testid="surface-host"]') as HTMLDivElement | null;
    const trigger = host.querySelector('[data-testid="trigger"]') as HTMLButtonElement | null;
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

    dispatchContextMenu(trigger!, 420, 300);
    await Promise.resolve();

    const layer = surfaceLayer!.querySelector('[data-testid="floating-layer"]') as HTMLDivElement | null;
    expect(layer).toBeTruthy();
    expect(surfaceLayer?.contains(layer ?? null)).toBe(true);
    expect(surfaceHost?.contains(layer ?? null)).toBe(false);
    expect(layer?.getAttribute('data-floe-local-interaction-surface')).toBe('true');
    expect(layer?.style.left).toBe('312px');
    expect(layer?.style.top).toBe('202px');
  });
});
