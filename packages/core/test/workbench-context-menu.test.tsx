// @vitest-environment jsdom

import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Trash } from '../src/icons';
import { WorkbenchContextMenu } from '../src/components/workbench/WorkbenchContextMenu';
import {
  WORKBENCH_CONTEXT_MENU_ATTR,
  installWorkbenchContextMenuDismissListeners,
} from '../src/components/workbench/workbenchContextMenuDismiss';

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

describe('WorkbenchContextMenu', () => {
  let dispose: (() => void) | undefined;

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('keeps action items clickable once the menu is mounted', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onSelect = vi.fn();

    dispose = render(() => (
      <WorkbenchContextMenu
        x={120}
        y={140}
        items={[
          {
            id: 'delete',
            kind: 'action',
            label: 'Delete',
            icon: Trash,
            destructive: true,
            onSelect,
          },
        ]}
      />
    ), host);

    const deleteButton = host.querySelector('.workbench-context-menu__item') as HTMLButtonElement | null;
    expect(deleteButton).toBeTruthy();

    dispatchPointerDown(deleteButton!);
    deleteButton!.click();
    await Promise.resolve();

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('dismisses only when pointerdown lands outside the menu boundary', () => {
    const onDismiss = vi.fn();
    const cleanup = installWorkbenchContextMenuDismissListeners({
      ownerWindow: window,
      onDismiss,
    });

    const menu = document.createElement('div');
    menu.setAttribute(WORKBENCH_CONTEXT_MENU_ATTR, 'true');
    const button = document.createElement('button');
    menu.appendChild(button);
    document.body.appendChild(menu);

    dispatchPointerDown(button);
    expect(onDismiss).not.toHaveBeenCalled();

    dispatchPointerDown(document.body);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('dismisses on escape, resize, and scroll viewport changes', () => {
    const onDismiss = vi.fn();
    const cleanup = installWorkbenchContextMenuDismissListeners({
      ownerWindow: window,
      onDismiss,
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll', { bubbles: true }));

    expect(onDismiss).toHaveBeenCalledTimes(3);

    cleanup();
  });
});
