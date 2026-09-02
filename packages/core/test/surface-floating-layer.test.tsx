// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { SurfaceFloatingLayer } from '../src/components/ui/SurfaceFloatingLayer';
import { __resetSurfacePortalScopeForTests } from '../src/components/ui/surfacePortalScope';
import { WorkbenchDockPopoverSurface } from '../src/components/workbench/WorkbenchDockPopoverSurface';

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

    const layer = surfaceHost!.querySelector(
      '[data-testid="floating-layer"]'
    ) as HTMLDivElement | null;
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
            style={{
              position: 'absolute',
              left: '120px',
              top: '80px',
              width: '320px',
              height: '240px',
            }}
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

    const surfaceLayer = host.querySelector(
      '[data-testid="surface-layer"]'
    ) as HTMLDivElement | null;
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

    const layer = surfaceLayer!.querySelector(
      '[data-testid="floating-layer"]'
    ) as HTMLDivElement | null;
    expect(layer).toBeTruthy();
    expect(surfaceLayer?.contains(layer ?? null)).toBe(true);
    expect(surfaceHost?.contains(layer ?? null)).toBe(false);
    expect(layer?.getAttribute('data-floe-local-interaction-surface')).toBe('true');
    expect(layer?.style.left).toBe('312px');
    expect(layer?.style.top).toBe('202px');
  });

  it('uses an explicit owner after the implicit interaction snapshot expires', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let now = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);

    function Harness() {
      const [open, setOpen] = createSignal(false);
      let trigger!: HTMLButtonElement;
      return (
        <div
          data-testid="surface-host"
          data-floe-dialog-surface-host="true"
          style={{ position: 'relative', width: '320px', height: '240px' }}
        >
          <button
            ref={trigger}
            type="button"
            data-testid="trigger"
            onKeyDown={(event) => {
              if (event.key === 'Enter') setOpen(true);
            }}
          >
            Open layer
          </button>
          {open() && (
            <SurfaceFloatingLayer
              owner={trigger}
              position={{ x: 88, y: 96 }}
              estimatedSize={{ width: 120, height: 80 }}
              role="region"
              data-testid="floating-layer"
            >
              Shared layout details
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

    trigger!.focus();
    now += 2_000;
    trigger!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await Promise.resolve();

    const layer = surfaceHost!.querySelector(
      '[data-testid="floating-layer"]'
    ) as HTMLDivElement | null;
    expect(layer).toBeTruthy();
    expect(layer?.className).toContain('absolute');
    expect(layer?.getAttribute('data-floe-local-interaction-surface')).toBe('true');
  });

  it('mounts a Dock popover inside the owning Workbench surface with shared material', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      queueMicrotask(() => callback(0));
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    function Harness() {
      const [open, setOpen] = createSignal(false);
      let trigger!: HTMLButtonElement;
      return (
        <div
          data-testid="workbench-surface"
          data-floe-dialog-surface-host="true"
          data-floe-surface-portal-layer="true"
          style={{ position: 'relative', width: '520px', height: '360px' }}
        >
          <button ref={trigger} type="button" onClick={() => setOpen(true)}>
            Plugins
          </button>
          {open() && (
            <WorkbenchDockPopoverSurface
              owner={trigger}
              estimatedSize={{ width: 200, height: 120 }}
              data-testid="dock-popover"
            >
              Plugin list
            </WorkbenchDockPopoverSurface>
          )}
        </div>
      );
    }

    mount(() => <Harness />, host);
    const surface = host.querySelector('[data-testid="workbench-surface"]') as HTMLElement;
    const trigger = host.querySelector('button') as HTMLButtonElement;
    mockRect(surface, {
      left: 100,
      top: 80,
      right: 620,
      bottom: 440,
      width: 520,
      height: 360,
    });
    mockRect(trigger, {
      left: 300,
      top: 300,
      right: 340,
      bottom: 340,
      width: 40,
      height: 40,
    });

    trigger.click();
    await Promise.resolve();
    await Promise.resolve();

    const layer = surface.querySelector(
      '[data-floe-surface-floating-layer="true"]'
    ) as HTMLElement | null;
    const popover = surface.querySelector('[data-testid="dock-popover"]') as HTMLElement | null;
    expect(layer).toBeTruthy();
    expect(layer?.className).toContain('absolute');
    expect(layer?.className).not.toContain('fixed');
    expect(layer?.getAttribute('data-floe-local-interaction-surface')).toBe('true');
    expect(layer?.style.left).toBe('120px');
    expect(layer?.style.top).toBe('84px');
    expect(popover?.classList.contains('workbench-dock-material')).toBe(true);
    expect(layer?.querySelector('.workbench-dock-popover__arrow')).toBeTruthy();
    expect(document.body.contains(layer)).toBe(true);
    expect(surface.contains(layer)).toBe(true);
  });

  it('keeps the Dock and its popovers on one shared corner radius', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/components/workbench/workbench.css'),
      'utf8'
    );
    const materialBlock = css.match(/\.workbench-dock-material \{[\s\S]*?\n {2}\}/u)?.[0] ?? '';
    const dockBlock = css.match(/\.workbench-dock \{[\s\S]*?\n {2}\}/u)?.[0] ?? '';
    const popoverBlock = css.match(/\.workbench-dock-popover \{[\s\S]*?\n {2}\}/u)?.[0] ?? '';

    expect(materialBlock).toContain('border-radius: 16px;');
    expect(dockBlock).not.toContain('border-radius:');
    expect(popoverBlock).not.toContain('border-radius:');
  });
});
