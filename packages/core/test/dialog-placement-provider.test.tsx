// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';

import {
  ConfirmDialog,
  Dialog,
  DialogPlacementProvider,
  Dropdown,
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
  await new Promise((resolve) => setTimeout(resolve, 190));
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
    const panel = overlayRoot.querySelector('[role="dialog"]') as HTMLElement;
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.classList.contains('pointer-events-auto')).toBe(true);
    expect(panel.parentElement?.classList.contains('pointer-events-none')).toBe(true);

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

describe('dialog editor controls', () => {
  afterEach(() => {
    for (const dispose of disposers.splice(0)) dispose();
    document.body.innerHTML = '';
  });
  it('lets an input consume Escape before closing and ignores composition', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const close = vi.fn();
    mount(
      () => (
        <Dialog open title="Editor" onOpenChange={close} escapeKeyPhase="bubble">
          <input
            aria-label="Connection"
            onKeyDown={(event) => {
              if (event.key === 'Escape') event.preventDefault();
            }}
          />
          <button data-testid="plain-editor-control">Save</button>
        </Dialog>
      ),
      host
    );
    await flushMicrotasks();
    const input = document.querySelector('input')!;
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    expect(close).not.toHaveBeenCalled();
    const button = document.querySelector('[data-testid="plain-editor-control"]')!;
    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, isComposing: true })
    );
    expect(close).not.toHaveBeenCalled();
    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    expect(close).toHaveBeenCalledWith(false);
  });

  it('can keep backdrop clicks inert while retaining a localized close action and panel shortcuts', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const close = vi.fn();
    const shortcut = vi.fn();
    mount(
      () => (
        <Dialog
          open
          title="Editor"
          onOpenChange={close}
          closeOnBackdropClick={false}
          closeLabel="Close editor"
          onKeyDown={shortcut}
        >
          <input aria-label="Name" />
        </Dialog>
      ),
      host
    );
    await flushMicrotasks();
    document.querySelector<HTMLElement>('[data-floe-dialog-backdrop]')!.click();
    expect(close).not.toHaveBeenCalled();
    document
      .querySelector('input')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    expect(shortcut).toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('[aria-label="Close editor"]')!.click();
    expect(close).toHaveBeenCalledWith(false);
  });
});

describe('bottom drawer ownership', () => {
  afterEach(() => {
    for (const dispose of disposers.splice(0)) dispose();
    document.body.replaceChildren();
    __resetDialogSurfaceScopeForTests();
  });

  it('keeps the drawer outside an inert canvas and retains its accessible title without default chrome', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const presence = vi.fn();
    const [open, setOpen] = createSignal(false);
    mount(
      () => (
        <>
          <div data-floe-dialog-surface-host="true" inert={open()}>
            <button data-testid="dock" onClick={() => setOpen(true)}>
              Manage
            </button>
          </div>
          <DialogPlacementProvider mode="global" globalZIndex={4000}>
            <Dialog
              open={open()}
              onOpenChange={setOpen}
              title="Plugin management"
              presentation="bottom-drawer"
              header={null}
              contentClass="p-0 overflow-hidden"
              onPresenceChange={presence}
            >
              <input aria-label="Search plugins" />
            </Dialog>
          </DialogPlacementProvider>
        </>
      ),
      host
    );
    const trigger = host.querySelector<HTMLButtonElement>('[data-testid="dock"]')!;
    trigger.focus();
    trigger.click();
    await flushMicrotasks();
    const root = document.querySelector<HTMLElement>('[data-floe-dialog-overlay-root]')!;
    expect(root.dataset.floeDialogPresentation).toBe('bottom-drawer');
    expect(root.closest('[inert]')).toBeNull();
    expect(root.dataset.floeDialogMode).toBe('global');
    const panel = root.querySelector('[role="dialog"]')!;
    expect(document.getElementById(panel.getAttribute('aria-labelledby')!)?.textContent).toBe(
      'Plugin management'
    );
    expect(panel.querySelector('button')).toBeNull();
    expect(panel.querySelector('input')?.parentElement?.classList.contains('p-0')).toBe(true);
    expect(presence).toHaveBeenLastCalledWith(true);
    setOpen(false);
    expect(presence).toHaveBeenLastCalledWith(true);
    expect(root.classList.contains('pointer-events-none')).toBe(false);
    await vi.waitFor(() => expect(presence).toHaveBeenLastCalledWith(false));
  });

  it('gives a nested confirmation sole Escape ownership and restores its trigger', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const parentClose = vi.fn();
    const [child, setChild] = createSignal(false);
    mount(
      () => (
        <DialogPlacementProvider mode="global" globalZIndex={4000}>
          <Dialog open title="Manager" onOpenChange={parentClose} presentation="bottom-drawer">
            <button data-testid="review" onClick={() => setChild(true)}>
              Review
            </button>
            <Dialog open={child()} title="Confirm install" onOpenChange={setChild}>
              <button data-testid="confirm">Install</button>
            </Dialog>
          </Dialog>
        </DialogPlacementProvider>
      ),
      host
    );
    await flushMicrotasks();
    const review = document.querySelector<HTMLButtonElement>('[data-testid="review"]')!;
    review.focus();
    review.click();
    await flushMicrotasks();
    const confirm = document.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!;
    confirm.focus();
    confirm.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    expect(child()).toBe(false);
    expect(parentClose).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(document.activeElement).toBe(review));
  });

  it('hosts owned menus above the drawer and closes the menu before the drawer', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const close = vi.fn();
    mount(
      () => (
        <DialogPlacementProvider mode="global" globalZIndex={4000}>
          <Dialog open title="Manager" onOpenChange={close} presentation="bottom-drawer">
            <Dropdown
              trigger={<button>Filter plugins</button>}
              items={[{ id: 'all', label: 'All plugins' }]}
              onSelect={() => undefined}
            />
          </Dialog>
        </DialogPlacementProvider>
      ),
      host
    );
    await flushMicrotasks();
    const trigger = document.querySelector<HTMLElement>('[aria-haspopup="menu"]')!;
    trigger.focus();
    trigger.click();
    await flushMicrotasks();
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    expect(menu.closest('[data-floe-dialog-overlay-root]')).not.toBeNull();
    menu.focus();
    menu.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(close).not.toHaveBeenCalled();
  });
});
