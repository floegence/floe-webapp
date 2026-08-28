// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';

import {
  ConfirmDialog,
  Dialog,
  DialogPlacementProvider,
  DirectoryPicker,
  FloatingWindow,
  type DialogPlacementMode,
} from '../src/components/ui';
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

async function flushFloatingExit(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 160));
  await flushMicrotasks();
}

function GlobalSurfaceDialogHarness(props: { dialogZIndex?: number }) {
  const [open, setOpen] = createSignal(false);
  const [underlayActionCount, setUnderlayActionCount] = createSignal(0);

  return (
    <DialogPlacementProvider mode="global" globalZIndex={4000}>
      <div data-testid="surface-host" data-floe-dialog-surface-host="true">
        <button type="button" data-testid="dialog-trigger" onClick={() => setOpen(true)}>
          Open dialog
        </button>
        <Dialog
          open={open()}
          onOpenChange={setOpen}
          globalZIndex={props.dialogZIndex}
          title="Global dialog"
        >
          <button type="button">Inside dialog</button>
        </Dialog>
      </div>

      <button
        type="button"
        data-testid="underlay-action"
        onClick={() => setUnderlayActionCount((value) => value + 1)}
      >
        Underlay action
      </button>
      <output data-testid="underlay-action-count">{String(underlayActionCount())}</output>
    </DialogPlacementProvider>
  );
}

function ReactivePlacementHarness() {
  const [mode, setMode] = createSignal<DialogPlacementMode>('auto');

  return (
    <DialogPlacementProvider mode={mode()} globalZIndex={4000}>
      <button
        type="button"
        data-testid="toggle-placement"
        onClick={() => setMode((value) => (value === 'auto' ? 'global' : 'auto'))}
      >
        Toggle placement
      </button>
      <div data-testid="surface-host" data-floe-dialog-surface-host="true">
        <Dialog open onOpenChange={() => undefined} title="Reactive dialog">
          <button type="button">Inside dialog</button>
        </Dialog>
      </div>
    </DialogPlacementProvider>
  );
}

function CompositeDialogHarness(props: { kind: 'confirm' | 'directory' }) {
  return (
    <DialogPlacementProvider mode="global" globalZIndex={4000}>
      <div data-testid="surface-host" data-floe-dialog-surface-host="true">
        {props.kind === 'confirm' ? (
          <ConfirmDialog
            open
            onOpenChange={() => undefined}
            title="Confirm dialog"
            onConfirm={() => undefined}
          />
        ) : (
          <DirectoryPicker
            open
            onOpenChange={() => undefined}
            files={[]}
            title="Directory dialog"
            onSelect={() => undefined}
          />
        )}
      </div>
    </DialogPlacementProvider>
  );
}

function FloatingWindowDialogHarness() {
  const [open, setOpen] = createSignal(false);

  return (
    <DialogPlacementProvider mode="global" globalZIndex={4000}>
      <FloatingWindow open onOpenChange={() => undefined} title="Activity helper">
        <button type="button" data-testid="dialog-trigger" onClick={() => setOpen(true)}>
          Open dialog
        </button>
        <Dialog open={open()} onOpenChange={setOpen} title="Floating dialog">
          <button type="button">Inside dialog</button>
        </Dialog>
      </FloatingWindow>
    </DialogPlacementProvider>
  );
}

describe('dialog placement provider', () => {
  afterEach(() => {
    while (disposers.length) {
      disposers.pop()?.();
    }
    document.body.innerHTML = '';
    __resetDialogSurfaceScopeForTests();
  });

  it('forces a surface-owned dialog into the global modal layer', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <GlobalSurfaceDialogHarness />, host);

    const trigger = host.querySelector('[data-testid="dialog-trigger"]') as HTMLButtonElement;
    trigger.focus();
    trigger.click();
    await flushMicrotasks();

    const surfaceHost = host.querySelector('[data-testid="surface-host"]') as HTMLElement;
    const overlayRoot = document.body.querySelector(
      '[data-floe-dialog-overlay-root]'
    ) as HTMLElement;
    expect(surfaceHost.contains(overlayRoot)).toBe(false);
    expect(overlayRoot.dataset.floeDialogMode).toBe('global');
    expect(overlayRoot.style.zIndex).toBe('4000');
    expect(overlayRoot.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');

    (overlayRoot.querySelector('[data-floe-dialog-backdrop]') as HTMLElement).click();
    await flushMicrotasks();

    expect(host.querySelector('[data-testid="underlay-action-count"]')?.textContent).toBe('0');
    expect(overlayRoot.dataset.floatingPresence).toBe('exiting');

    await flushFloatingExit();
    expect(document.body.querySelector('[data-floe-dialog-overlay-root]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('prefers the dialog stacking layer over the provider default', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <GlobalSurfaceDialogHarness dialogZIndex={4500} />, host);

    (host.querySelector('[data-testid="dialog-trigger"]') as HTMLButtonElement).click();
    await flushMicrotasks();

    const overlayRoot = document.body.querySelector(
      '[data-floe-dialog-overlay-root]'
    ) as HTMLElement;
    expect(overlayRoot.style.zIndex).toBe('4500');
  });

  it('reacts to placement changes while the dialog remains open', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <ReactivePlacementHarness />, host);
    await flushMicrotasks();
    await flushMicrotasks();

    const surfaceHost = host.querySelector('[data-testid="surface-host"]') as HTMLElement;
    let overlayRoot = document.body.querySelector('[data-floe-dialog-overlay-root]') as HTMLElement;
    expect(surfaceHost.contains(overlayRoot)).toBe(true);
    expect(overlayRoot.dataset.floeDialogMode).toBe('surface');

    const toggle = host.querySelector('[data-testid="toggle-placement"]') as HTMLButtonElement;
    toggle.click();
    await flushMicrotasks();

    overlayRoot = document.body.querySelector('[data-floe-dialog-overlay-root]') as HTMLElement;
    expect(surfaceHost.contains(overlayRoot)).toBe(false);
    expect(overlayRoot.dataset.floeDialogMode).toBe('global');
    expect(overlayRoot.style.zIndex).toBe('4000');

    toggle.click();
    await flushMicrotasks();

    overlayRoot = document.body.querySelector('[data-floe-dialog-overlay-root]') as HTMLElement;
    expect(surfaceHost.contains(overlayRoot)).toBe(true);
    expect(overlayRoot.dataset.floeDialogMode).toBe('surface');
  });

  it.each(['confirm', 'directory'] as const)(
    'applies global placement to the %s composition',
    async (kind) => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      mount(() => <CompositeDialogHarness kind={kind} />, host);
      await flushMicrotasks();
      await flushMicrotasks();

      const surfaceHost = host.querySelector('[data-testid="surface-host"]') as HTMLElement;
      const overlayRoot = document.body.querySelector(
        '[data-floe-dialog-overlay-root]'
      ) as HTMLElement;
      expect(surfaceHost.contains(overlayRoot)).toBe(false);
      expect(overlayRoot.dataset.floeDialogMode).toBe('global');
      expect(overlayRoot.style.zIndex).toBe('4000');
    }
  );

  it('preserves global placement through a portaled floating window', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(() => <FloatingWindowDialogHarness />, host);

    const trigger = document.querySelector('[data-testid="dialog-trigger"]') as HTMLButtonElement;
    trigger.click();
    await flushMicrotasks();

    const floatingSurface = document.querySelector(
      '[data-floe-floating-window-surface="true"]'
    ) as HTMLElement;
    const overlayRoot = document.querySelector('[data-floe-dialog-overlay-root]') as HTMLElement;
    expect(floatingSurface.contains(overlayRoot)).toBe(false);
    expect(overlayRoot.dataset.floeDialogMode).toBe('global');
    expect(overlayRoot.style.zIndex).toBe('4000');
  });
});
