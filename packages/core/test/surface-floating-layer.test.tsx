// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { SurfaceFloatingPanel } from '../src/components/ui/SurfaceFloatingPanel';
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
    const themeCss = readFileSync(
      resolve(process.cwd(), 'src/components/workbench/workbench-themes.css'),
      'utf8'
    );
    const materialBlock = css.match(/\.workbench-dock-material \{[\s\S]*?\n {2}\}/u)?.[0] ?? '';
    const dockBlock = css.match(/\.workbench-dock \{[\s\S]*?\n {2}\}/u)?.[0] ?? '';
    const popoverBlock = css.match(/\.workbench-dock-popover \{[\s\S]*?\n {2}\}/u)?.[0] ?? '';
    const themeDockBlocks = Array.from(
      themeCss.matchAll(
        /\.workbench-surface\[data-workbench-theme='[^']+'\] \.workbench-dock \{[\s\S]*?\n {2}\}/gu
      ),
      (match) => match[0]
    );

    expect(materialBlock).toContain('border-radius: 16px;');
    expect(dockBlock).not.toContain('border-radius:');
    expect(popoverBlock).not.toContain('border-radius:');
    expect(themeDockBlocks.length).toBeGreaterThan(0);
    expect(themeDockBlocks.every((block) => !block.includes('border-radius:'))).toBe(true);
  });
});

describe('SurfaceFloatingPanel', () => {
  it('keeps collapsed content reachable and moves only from its handle', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const activate = vi.fn();
    let collapse!: (value: boolean) => void;
    const dispose = renderSolid(() => {
      const [small, setSmall] = createSignal(false);
      collapse = setSmall;
      return (
        <SurfaceFloatingPanel data-testid="draggable-panel">
          {(handle) => (
            <>
              <button {...handle} data-testid="grip" onClick={activate}>
                Move
              </button>
              <div data-testid="content">{small() ? 'small' : 'large'}</div>
            </>
          )}
        </SurfaceFloatingPanel>
      );
    }, host);
    try {
      const panel = document.querySelector('[data-testid="draggable-panel"]') as HTMLElement;
      const grip = panel.querySelector('button')!;
      let size = 200;
      Object.defineProperty(panel, 'getBoundingClientRect', {
        value: () => ({ width: size, height: size }),
      });
      const tick = () => {
        const frame = frames.shift();
        frame?.(0);
      };
      tick();
      const right = Number.parseFloat(panel.style.left);
      grip.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
      );
      expect(Number.parseFloat(panel.style.left)).toBe(right - 10);
      expect(activate).not.toHaveBeenCalled();
      const pointer = (target: EventTarget, type: string, x: number, y: number) => {
        const event = new MouseEvent(type, {
          clientX: x,
          clientY: y,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(event, 'pointerId', { value: 1 });
        target.dispatchEvent(event);
      };
      const dragStart = Number.parseFloat(panel.style.left);
      pointer(grip, 'pointerdown', 400, 300);
      pointer(document, 'pointermove', 360, 300);
      pointer(document, 'pointerup', 360, 300);
      expect(Number.parseFloat(panel.style.left)).toBe(dragStart - 40);
      grip.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      expect(activate).not.toHaveBeenCalled();
      pointer(grip, 'pointerdown', 360, 300);
      pointer(document, 'pointermove', 340, 300);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(Number.parseFloat(panel.style.left)).toBe(dragStart - 40);
      grip.click();
      expect(activate).toHaveBeenCalledTimes(1);
      collapse(true);
      size = 48;
      tick();
      expect(Number.parseFloat(panel.style.left) + 48).toBeLessThanOrEqual(window.innerWidth - 8);
      const before = panel.style.left;
      panel
        .querySelector('[data-testid="content"]')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      expect(panel.style.left).toBe(before);
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 120 });
      tick();
      expect(Number.parseFloat(panel.style.left) + 48).toBeLessThanOrEqual(112);
    } finally {
      dispose();
      host.remove();
      vi.unstubAllGlobals();
    }
  });
});

it('projects draggable panel geometry into its scaled owner without body escape', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
  const host = document.createElement('div');
  document.body.append(host);
  host.setAttribute('data-floe-dialog-surface-host', 'true');
  mockRect(host, { left: 100, top: 100, right: 500, bottom: 400, width: 400, height: 300 });
  Object.defineProperty(host, 'offsetWidth', { configurable: true, value: 800 });
  Object.defineProperty(host, 'offsetHeight', { configurable: true, value: 600 });
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const dispose = renderSolid(
    () => (
      <SurfaceFloatingPanel owner={host} data-testid="scaled-panel">
        {(handle) => <button {...handle}>Move</button>}
      </SurfaceFloatingPanel>
    ),
    host
  );
  try {
    const panel = host.querySelector('[data-testid="scaled-panel"]') as HTMLElement;
    expect(panel).not.toBeNull();
    Object.defineProperty(panel, 'getBoundingClientRect', {
      value: () => ({ width: 100, height: 80 }),
    });
    frames.shift()?.(0);
    expect(panel.classList.contains('absolute')).toBe(true);
    expect(panel.classList.contains('fixed')).toBe(false);
    expect(panel.getAttribute('data-floe-local-interaction-surface')).toBe('true');
    expect(panel.style.left).toBe('584px');
    expect(panel.style.top).toBe('424px');
    panel
      .querySelector('button')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true, bubbles: true })
      );
    expect(panel.style.left).toBe('504px');
  } finally {
    dispose();
    host.remove();
    vi.unstubAllGlobals();
  }
});
