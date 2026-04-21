// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';

import { Dialog } from '../src/components/ui/Dialog';
import { FloatingWindow } from '../src/components/ui/FloatingWindow';
import { InfiniteCanvas } from '../src/components/ui/InfiniteCanvas';
import { __resetDialogSurfaceScopeForTests } from '../src/components/ui/dialogSurfaceScope';

vi.mock('../src/context/LayoutContext', () => ({
  useLayout: () => ({
    isMobile: () => false,
  }),
}));

const disposers: Array<() => void> = [];

function mount(view: () => unknown, host: HTMLElement): void {
  disposers.push(renderSolid(view, host));
}

function flushMicrotasks(): Promise<void> {
  return Promise.resolve();
}

function dispatchEscape(target: EventTarget): void {
  target.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  }));
}

function dispatchPointerDown(target: EventTarget): void {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  const event = new EventCtor('pointerdown', {
    bubbles: true,
    button: 0,
  });
  if (!('pointerId' in event)) {
    Object.defineProperty(event, 'pointerId', { configurable: true, value: 1 });
  }
  if (!('pointerType' in event)) {
    Object.defineProperty(event, 'pointerType', { configurable: true, value: 'mouse' });
  }
  target.dispatchEvent(event);
}

function SurfaceDialogHarness(props: {
  triggerKind?: 'button' | 'div';
}) {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      <div
        data-testid="surface-host"
        data-floe-dialog-surface-host="true"
        style={{ position: 'relative', width: '360px', height: '240px' }}
      >
        {props.triggerKind === 'div' ? (
          <div data-testid="surface-trigger" onClick={() => setOpen(true)}>
            Open dialog
          </div>
        ) : (
          <button type="button" data-testid="surface-trigger" onClick={() => setOpen(true)}>
            Open dialog
          </button>
        )}

        <Dialog
          open={open()}
          onOpenChange={setOpen}
          title="Widget dialog"
          description="Surface-scoped dialog"
        >
          <button type="button" data-testid="dialog-action">Inside dialog</button>
        </Dialog>
      </div>

      <button type="button" data-testid="outside-button">
        Outside button
      </button>
    </>
  );
}

function LayerScopedDialogHarness() {
  const [open, setOpen] = createSignal(false);
  const [actionCount, setActionCount] = createSignal(0);

  return (
    <div
      data-testid="surface-layer"
      data-floe-surface-portal-layer="true"
      style={{ position: 'relative', width: '520px', height: '360px' }}
    >
      <div
        data-testid="surface-host"
        data-floe-dialog-surface-host="true"
        style={{ position: 'absolute', left: '120px', top: '80px', width: '240px', height: '180px' }}
      >
        <button type="button" data-testid="surface-trigger" onClick={() => setOpen(true)}>
          Open layered dialog
        </button>

        <Dialog
          open={open()}
          onOpenChange={setOpen}
          title="Layered dialog"
          description="Boundary from host, mount in layer"
        >
          <button
            type="button"
            data-testid="layered-dialog-action"
            onClick={() => setActionCount((value) => value + 1)}
          >
            Confirm layered dialog
          </button>
        </Dialog>
      </div>

      <output data-testid="layered-dialog-action-count">{String(actionCount())}</output>
    </div>
  );
}

function SurfaceDialogCrossHostHarness() {
  const [open, setOpen] = createSignal(false);
  const [otherHostClickCount, setOtherHostClickCount] = createSignal(0);

  return (
    <>
      <div
        data-testid="surface-host-primary"
        data-floe-dialog-surface-host="true"
        style={{ position: 'relative', width: '360px', height: '240px' }}
      >
        <button type="button" data-testid="surface-trigger" onClick={() => setOpen(true)}>
          Open dialog
        </button>
        <Dialog
          open={open()}
          onOpenChange={setOpen}
          title="Widget dialog"
        >
          <button type="button" data-testid="primary-dialog-action">Inside dialog</button>
        </Dialog>
      </div>

      <div
        data-testid="surface-host-secondary"
        data-floe-dialog-surface-host="true"
        style={{ position: 'relative', width: '360px', height: '240px' }}
      >
        <button
          type="button"
          data-testid="other-widget-button"
          onClick={() => setOtherHostClickCount((value) => value + 1)}
        >
          Other widget action
        </button>
      </div>

      <output data-testid="other-widget-click-count">{String(otherHostClickCount())}</output>
    </>
  );
}

function FloatingWindowDialogHarness() {
  const [dialogOpen, setDialogOpen] = createSignal(false);

  return (
    <FloatingWindow open onOpenChange={() => undefined} title="Workspace helper">
      <div class="flex h-full min-h-0 flex-col gap-2 p-3">
        <button type="button" data-testid="floating-dialog-trigger" onClick={() => setDialogOpen(true)}>
          Open dialog
        </button>
        <Dialog
          open={dialogOpen()}
          onOpenChange={setDialogOpen}
          title="Floating dialog"
        >
          <button type="button" data-testid="floating-dialog-action">Confirm</button>
        </Dialog>
      </div>
    </FloatingWindow>
  );
}

function FloatingWindowEscapeHarness() {
  const [open, setOpen] = createSignal(true);

  return (
    <>
      <button type="button" data-testid="outside-button">
        Outside button
      </button>
      <FloatingWindow open={open()} onOpenChange={setOpen} title="Scoped escape">
        <div class="h-full min-h-0 p-3">Floating content</div>
      </FloatingWindow>
    </>
  );
}

function CanvasDialogHarness() {
  const [open, setOpen] = createSignal(false);
  const [actionCount, setActionCount] = createSignal(0);
  const [viewport, setViewport] = createSignal({ x: 0, y: 0, scale: 1 });

  return (
    <>
      <InfiniteCanvas
        viewport={viewport()}
        onViewportChange={setViewport}
        ariaLabel="Canvas dialog harness"
      >
        <div
          data-testid="canvas-surface-host"
          data-floe-dialog-surface-host="true"
          style={{ position: 'relative', width: '360px', height: '240px' }}
        >
          <div data-floe-canvas-interactive="true">
            <button type="button" data-testid="canvas-dialog-trigger" onClick={() => setOpen(true)}>
              Open canvas dialog
            </button>
          </div>

          <Dialog
            open={open()}
            onOpenChange={setOpen}
            title="Canvas dialog"
            description="Canvas-scoped dialog"
          >
            <button
              type="button"
              data-testid="canvas-dialog-action"
              onClick={() => setActionCount((value) => value + 1)}
            >
              Confirm canvas dialog
            </button>
          </Dialog>
        </div>
      </InfiniteCanvas>

      <output data-testid="canvas-dialog-action-count">{String(actionCount())}</output>
    </>
  );
}

function CanvasFloatingWindowHarness() {
  const [actionCount, setActionCount] = createSignal(0);
  const [viewport, setViewport] = createSignal({ x: 0, y: 0, scale: 1 });

  return (
    <>
      <InfiniteCanvas
        viewport={viewport()}
        onViewportChange={setViewport}
        ariaLabel="Canvas floating window harness"
      >
        <div
          data-testid="canvas-floating-host"
          data-floe-dialog-surface-host="true"
          style={{ position: 'relative', width: '360px', height: '240px' }}
        >
          <FloatingWindow open onOpenChange={() => undefined} title="Canvas floating window">
            <div class="flex h-full min-h-0 flex-col gap-2 p-3">
              <button
                type="button"
                data-testid="canvas-floating-action"
                onClick={() => setActionCount((value) => value + 1)}
              >
                Perform floating action
              </button>
            </div>
          </FloatingWindow>
        </div>
      </InfiniteCanvas>

      <output data-testid="canvas-floating-action-count">{String(actionCount())}</output>
    </>
  );
}

describe('dialog surface scope', () => {
  afterEach(() => {
    while (disposers.length) {
      disposers.pop()?.();
    }
    document.body.innerHTML = '';
    __resetDialogSurfaceScopeForTests();
  });

  it('mounts a widget dialog into the local surface host even when opened by a non-focusable trigger', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <SurfaceDialogHarness triggerKind="div" />, host);

    const surfaceHost = host.querySelector('[data-testid="surface-host"]') as HTMLElement | null;
    const trigger = host.querySelector('[data-testid="surface-trigger"]') as HTMLElement | null;
    expect(surfaceHost).toBeTruthy();
    expect(trigger).toBeTruthy();

    dispatchPointerDown(trigger!);
    trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushMicrotasks();

    const overlayRoot = host.querySelector('[data-floe-dialog-overlay-root]') as HTMLElement | null;
    expect(overlayRoot).toBeTruthy();
    expect(surfaceHost?.contains(overlayRoot ?? null)).toBe(true);
    expect(overlayRoot?.getAttribute('data-floe-dialog-mode')).toBe('surface');
  });

  it('mounts a transformed-surface dialog into the nearest portal layer while keeping boundary-relative geometry', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <LayerScopedDialogHarness />, host);

    const surfaceLayer = host.querySelector('[data-testid="surface-layer"]') as HTMLElement | null;
    const surfaceHost = host.querySelector('[data-testid="surface-host"]') as HTMLElement | null;
    const trigger = host.querySelector('[data-testid="surface-trigger"]') as HTMLButtonElement | null;
    expect(surfaceLayer).toBeTruthy();
    expect(surfaceHost).toBeTruthy();
    expect(trigger).toBeTruthy();

    Object.defineProperty(surfaceLayer!, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 20,
        top: 30,
        right: 540,
        bottom: 390,
        width: 520,
        height: 360,
        x: 20,
        y: 30,
        toJSON: () => undefined,
      }),
    });
    Object.defineProperty(surfaceHost!, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 120,
        top: 80,
        right: 360,
        bottom: 260,
        width: 240,
        height: 180,
        x: 120,
        y: 80,
        toJSON: () => undefined,
      }),
    });

    dispatchPointerDown(trigger!);
    trigger!.click();
    await flushMicrotasks();

    const overlayRoot = surfaceLayer!.querySelector('[data-floe-dialog-overlay-root]') as HTMLElement | null;
    expect(overlayRoot).toBeTruthy();
    expect(surfaceLayer?.contains(overlayRoot ?? null)).toBe(true);
    expect(surfaceHost?.contains(overlayRoot ?? null)).toBe(false);
    expect(overlayRoot?.style.left).toBe('100px');
    expect(overlayRoot?.style.top).toBe('50px');
    expect(overlayRoot?.style.width).toBe('240px');
    expect(overlayRoot?.style.height).toBe('180px');

    const action = surfaceLayer!.querySelector('[data-testid="layered-dialog-action"]') as HTMLButtonElement | null;
    expect(action).toBeTruthy();
    dispatchPointerDown(action!);
    action!.click();
    await flushMicrotasks();

    expect(host.querySelector('[data-testid="layered-dialog-action-count"]')?.textContent).toBe('1');
  });

  it('keeps the dialog open when clicking outside the host and closes only from the local backdrop', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <SurfaceDialogHarness />, host);

    const trigger = host.querySelector('[data-testid="surface-trigger"]') as HTMLButtonElement | null;
    const outsideButton = host.querySelector('[data-testid="outside-button"]') as HTMLButtonElement | null;
    expect(trigger).toBeTruthy();
    expect(outsideButton).toBeTruthy();

    dispatchPointerDown(trigger!);
    trigger!.click();
    await flushMicrotasks();

    outsideButton!.click();
    await flushMicrotasks();
    expect(host.querySelector('[data-floe-dialog-overlay-root]')).toBeTruthy();

    const backdrop = host.querySelector('[data-floe-dialog-backdrop]') as HTMLElement | null;
    expect(backdrop).toBeTruthy();
    backdrop!.click();
    await flushMicrotasks();

    expect(host.querySelector('[data-floe-dialog-overlay-root]')).toBeNull();
  });

  it('does not swallow clicks for a different local host while the dialog stays open', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <SurfaceDialogCrossHostHarness />, host);

    const trigger = host.querySelector('[data-testid="surface-trigger"]') as HTMLButtonElement | null;
    const otherWidgetButton = host.querySelector('[data-testid="other-widget-button"]') as HTMLButtonElement | null;
    const clickCount = host.querySelector('[data-testid="other-widget-click-count"]') as HTMLOutputElement | null;
    expect(trigger).toBeTruthy();
    expect(otherWidgetButton).toBeTruthy();
    expect(clickCount).toBeTruthy();

    dispatchPointerDown(trigger!);
    trigger!.click();
    await flushMicrotasks();

    otherWidgetButton!.click();
    await flushMicrotasks();

    expect(clickCount?.textContent).toBe('1');
    expect(host.querySelector('[data-floe-dialog-overlay-root]')).toBeTruthy();
  });

  it('responds to Escape only when focus belongs to the current dialog boundary', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <SurfaceDialogHarness />, host);

    const trigger = host.querySelector('[data-testid="surface-trigger"]') as HTMLButtonElement | null;
    const outsideButton = host.querySelector('[data-testid="outside-button"]') as HTMLButtonElement | null;
    expect(trigger).toBeTruthy();
    expect(outsideButton).toBeTruthy();

    dispatchPointerDown(trigger!);
    trigger!.click();
    await flushMicrotasks();

    outsideButton!.focus();
    dispatchEscape(outsideButton!);
    await flushMicrotasks();
    expect(host.querySelector('[data-floe-dialog-overlay-root]')).toBeTruthy();

    const dialogAction = host.querySelector('[data-testid="dialog-action"]') as HTMLButtonElement | null;
    expect(dialogAction).toBeTruthy();
    dialogAction!.focus();
    dispatchEscape(dialogAction!);
    await flushMicrotasks();

    expect(host.querySelector('[data-floe-dialog-overlay-root]')).toBeNull();
  });

  it('keeps a surface dialog clickable when mounted inside an infinite-canvas host', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <CanvasDialogHarness />, host);

    const trigger = host.querySelector('[data-testid="canvas-dialog-trigger"]') as HTMLButtonElement | null;
    expect(trigger).toBeTruthy();

    dispatchPointerDown(trigger!);
    trigger!.click();
    await flushMicrotasks();

    const dialogAction = host.querySelector('[data-testid="canvas-dialog-action"]') as HTMLButtonElement | null;
    const canvas = host.querySelector('.floe-infinite-canvas') as HTMLDivElement | null;
    expect(dialogAction).toBeTruthy();
    expect(canvas).toBeTruthy();

    dispatchPointerDown(dialogAction!);
    await flushMicrotasks();
    expect(canvas?.classList.contains('is-panning')).toBe(false);

    dialogAction!.click();
    await flushMicrotasks();

    const actionCount = host.querySelector('[data-testid="canvas-dialog-action-count"]');
    expect(actionCount?.textContent).toBe('1');
  });

  it('does not let infinite-canvas wheel routing steal surface-dialog events', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <CanvasDialogHarness />, host);

    const trigger = host.querySelector('[data-testid="canvas-dialog-trigger"]') as HTMLButtonElement | null;
    expect(trigger).toBeTruthy();

    dispatchPointerDown(trigger!);
    trigger!.click();
    await flushMicrotasks();

    const dialogAction = host.querySelector('[data-testid="canvas-dialog-action"]') as HTMLButtonElement | null;
    expect(dialogAction).toBeTruthy();

    const wheelEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    });
    dialogAction!.dispatchEvent(wheelEvent);

    expect(wheelEvent.defaultPrevented).toBe(false);
  });

  it('mounts floating-window dialogs into the floating surface instead of document.body', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <FloatingWindowDialogHarness />, host);

    const trigger = document.querySelector('[data-testid="floating-dialog-trigger"]') as HTMLButtonElement | null;
    expect(trigger).toBeTruthy();

    dispatchPointerDown(trigger!);
    trigger!.click();
    await flushMicrotasks();

    const floatingSurface = document.querySelector('[data-floe-floating-window-surface="true"]') as HTMLElement | null;
    const overlayRoot = document.querySelector('[data-floe-dialog-overlay-root]') as HTMLElement | null;
    expect(floatingSurface).toBeTruthy();
    expect(overlayRoot).toBeTruthy();
    expect(floatingSurface?.contains(overlayRoot ?? null)).toBe(true);
    expect(overlayRoot?.getAttribute('data-floe-dialog-mode')).toBe('surface');
  });

  it('treats floating-window content actions as local surfaces inside an infinite canvas host', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <CanvasFloatingWindowHarness />, host);

    const actionButton = document.querySelector('[data-testid="canvas-floating-action"]') as HTMLButtonElement | null;
    const canvas = host.querySelector('.floe-infinite-canvas') as HTMLDivElement | null;
    expect(actionButton).toBeTruthy();
    expect(canvas).toBeTruthy();

    dispatchPointerDown(actionButton!);
    await flushMicrotasks();
    expect(canvas?.classList.contains('is-panning')).toBe(false);

    actionButton!.click();
    await flushMicrotasks();

    expect(host.querySelector('[data-testid="canvas-floating-action-count"]')?.textContent).toBe('1');
  });

  it('treats floating-window resize handles as local surfaces inside an infinite canvas host', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <CanvasFloatingWindowHarness />, host);

    const resizeHandle = document.querySelector('[data-floe-floating-window-resize-handle="se"]') as HTMLElement | null;
    const canvas = host.querySelector('.floe-infinite-canvas') as HTMLDivElement | null;
    expect(resizeHandle).toBeTruthy();
    expect(canvas).toBeTruthy();

    dispatchPointerDown(resizeHandle!);
    await flushMicrotasks();
    expect(canvas?.classList.contains('is-panning')).toBe(false);
  });

  it('scopes floating-window Escape handling to the focused window only', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <FloatingWindowEscapeHarness />, host);

    const outsideButton = host.querySelector('[data-testid="outside-button"]') as HTMLButtonElement | null;
    const floatingWindow = document.querySelector('[data-floe-geometry-surface="floating-window"]') as HTMLElement | null;
    expect(outsideButton).toBeTruthy();
    expect(floatingWindow).toBeTruthy();

    outsideButton!.focus();
    dispatchEscape(outsideButton!);
    await flushMicrotasks();
    expect(document.querySelector('[data-floe-geometry-surface="floating-window"]')).toBeTruthy();

    floatingWindow!.focus();
    expect(document.activeElement).toBe(floatingWindow);

    dispatchEscape(floatingWindow!);
    await flushMicrotasks();
    expect(document.querySelector('[data-floe-geometry-surface="floating-window"]')).toBeNull();
  });
});
