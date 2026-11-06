// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createSignal, Show } from 'solid-js';
import { render } from 'solid-js/web';
import {
  ContextMenuActions,
  ContextMenuActionItems,
} from '../src/components/ui/ContextMenuActions';
let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  document.body.replaceChildren();
});
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
it('opens a fallback on blank surfaces and freezes the original target', async () => {
  const selected = vi.fn();
  const host = document.createElement('main');
  document.body.append(host);
  dispose = render(
    () => (
      <ContextMenuActions
        label="Actions"
        actions={(request) => [
          { id: 'ask', label: 'Ask', onSelect: () => selected(request.target.id) },
        ]}
      >
        <div id="source" />
      </ContextMenuActions>
    ),
    host
  );
  document
    .querySelector('#source')!
    .dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 12, clientY: 24 })
    );
  await flush();
  const item = document.querySelector<HTMLButtonElement>('[data-context-action-id="ask"]')!;
  expect(item).toBeTruthy();
  item.click();
  expect(selected).toHaveBeenCalledWith('source');
  expect(document.querySelector('[role=menu]')).toBeNull();
});
it('mounts an explicitly viewport-scoped menu outside its local source surface', async () => {
  const selected = vi.fn();
  const host = document.createElement('main');
  document.body.append(host);
  dispose = render(
    () => (
      <ContextMenuActions
        label="Actions"
        portalScope="viewport"
        actions={(request) => [
          { id: 'ask', label: 'Ask', onSelect: () => selected(request.target.id) },
        ]}
      >
        <div data-floe-dialog-surface-host="true">
          <button id="scoped-source">Source</button>
        </div>
      </ContextMenuActions>
    ),
    host
  );
  document
    .querySelector('#scoped-source')!
    .dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 12, clientY: 24 })
    );
  await flush();
  const menu = document.querySelector<HTMLElement>('[role=menu]')!;
  expect(menu.closest('[data-floe-dialog-surface-host]')).toBeNull();
  menu.querySelector<HTMLButtonElement>('[role=menuitem]')!.click();
  expect(selected).toHaveBeenCalledWith('scoped-source');
});
it('ignores unrelated scrolling and dismisses when the source scrolls', async () => {
  const host = document.createElement('main');
  document.body.append(host);
  dispose = render(
    () => (
      <ContextMenuActions
        label="Actions"
        actions={() => [{ id: 'ask', label: 'Ask', onSelect: vi.fn() }]}
      >
        <div id="source-scroll">
          <button id="scroll-source">Source</button>
        </div>
        <div id="other-scroll">Independent content</div>
      </ContextMenuActions>
    ),
    host
  );
  const open = async () => {
    document
      .querySelector('#scroll-source')!
      .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await flush();
  };
  await open();
  document.querySelector('#other-scroll')!.dispatchEvent(new Event('scroll'));
  await flush();
  expect(document.querySelector('[role=menu]')).not.toBeNull();
  document.querySelector('[role=menu]')!.dispatchEvent(new Event('scroll'));
  expect(document.querySelector('[role=menu]')).not.toBeNull();
  document.querySelector('#source-scroll')!.dispatchEvent(new Event('scroll'));
  await flush();
  expect(document.querySelector('[role=menu]')).toBeNull();
  await open();
  document.dispatchEvent(new Event('scroll'));
  await flush();
  expect(document.querySelector('[role=menu]')).toBeNull();
});
it('contributes to a stopped local menu without opening a second menu or duplicating semantic actions', async () => {
  const host = document.createElement('main');
  document.body.append(host);
  dispose = render(() => {
    const [open, setOpen] = createSignal(false);
    return (
      <ContextMenuActions
        label="Actions"
        actions={() => [{ id: 'ask', label: 'Ask', onSelect: vi.fn() }]}
      >
        <div
          id="source"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        />
        <Show when={open()}>
          <div role="menu">
            <button role="menuitem">Original</button>
            <ContextMenuActionItems onClose={() => setOpen(false)} />
          </div>
        </Show>
      </ContextMenuActions>
    );
  }, host);
  document
    .querySelector('#source')!
    .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  await flush();
  expect(document.querySelectorAll('[role=menu]')).toHaveLength(1);
  expect(document.querySelectorAll('[role=menuitem]')).toHaveLength(2);
});
it('respects a local input owner that consumes contextmenu', async () => {
  const host = document.createElement('main');
  document.body.append(host);
  dispose = render(
    () => (
      <ContextMenuActions
        label="Actions"
        actions={() => [{ id: 'ask', label: 'Ask', onSelect: vi.fn() }]}
      >
        <div id="remote" onContextMenu={(e) => e.preventDefault()} />
      </ContextMenuActions>
    ),
    host
  );
  document
    .querySelector('#remote')!
    .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  await flush();
  expect(document.querySelector('[role=menu]')).toBeNull();
});
it('does not contribute to an unrelated dropdown after an unhandled event has finished', async () => {
  const host = document.createElement('main');
  document.body.append(host);
  let open!: () => void;
  dispose = render(() => {
    const [visible, setVisible] = createSignal(false);
    open = () => setVisible(true);
    return (
      <ContextMenuActions
        label="Actions"
        actions={() => [{ id: 'ask', label: 'Ask', onSelect: vi.fn() }]}
      >
        <div id="source" onContextMenu={(e) => e.preventDefault()} />
        <Show when={visible()}>
          <div role="menu">
            <ContextMenuActionItems onClose={() => {}} />
          </div>
        </Show>
      </ContextMenuActions>
    );
  }, host);
  document
    .querySelector('#source')!
    .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  open();
  await flush();
  expect(document.querySelector('[data-context-action-id]')).toBeNull();
});
