// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';

import { Dialog } from '../src/components/ui/Dialog';
import { FloatingWindow } from '../src/components/ui/FloatingWindow';
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
