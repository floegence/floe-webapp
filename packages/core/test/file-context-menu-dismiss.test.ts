import { describe, expect, it, vi } from 'vitest';
import { installContextMenuDismissListeners } from '../src/components/file-browser/FileContextMenu';

type ListenerEntry = {
  listener: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
};

function invokeListener(listener: EventListenerOrEventListenerObject, event: Event): void {
  if (typeof listener === 'function') {
    listener(event);
    return;
  }

  listener.handleEvent(event);
}

function createWindowMock() {
  const listeners = new Map<string, ListenerEntry[]>();

  return {
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      const current = listeners.get(type) ?? [];
      current.push({ listener, options });
      listeners.set(type, current);
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      const current = listeners.get(type) ?? [];
      listeners.set(type, current.filter((entry) => entry.listener !== listener || entry.options !== options));
    },
    dispatch(type: string, event: Event) {
      const current = listeners.get(type) ?? [];
      for (const entry of current) {
        invokeListener(entry.listener, event);
      }
    },
    getListeners(type: string) {
      return listeners.get(type) ?? [];
    },
  };
}

describe('FileContextMenu dismissal controller', () => {
  it('registers capture-phase pointerdown dismissal while preserving inside-menu clicks', () => {
    const ownerWindow = createWindowMock();
    const onDismiss = vi.fn();

    const cleanup = installContextMenuDismissListeners({
      ownerWindow: ownerWindow as unknown as Window,
      contextMenuId: 'menu-1',
      onDismiss,
    });

    expect(ownerWindow.getListeners('pointerdown')).toHaveLength(1);
    expect(ownerWindow.getListeners('pointerdown')[0]?.options).toBe(true);

    ownerWindow.dispatch('pointerdown', {
      composedPath: () => [{ dataset: { floeContextMenu: 'menu-1' } }],
      target: null,
    } as unknown as PointerEvent);
    expect(onDismiss).not.toHaveBeenCalled();

    ownerWindow.dispatch('pointerdown', {
      composedPath: () => [{ dataset: {} }],
      target: { closest: () => null },
    } as unknown as PointerEvent);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    cleanup();
    expect(ownerWindow.getListeners('pointerdown')).toHaveLength(0);
  });

  it('shares one dismiss path for Escape, resize, and scroll', () => {
    const ownerWindow = createWindowMock();
    const onDismiss = vi.fn();

    installContextMenuDismissListeners({
      ownerWindow: ownerWindow as unknown as Window,
      contextMenuId: 'menu-2',
      onDismiss,
    });

    expect(ownerWindow.getListeners('keydown')[0]?.options).toBe(true);
    expect(ownerWindow.getListeners('scroll')[0]?.options).toBe(true);

    ownerWindow.dispatch('keydown', { key: 'Enter' } as unknown as KeyboardEvent);
    expect(onDismiss).not.toHaveBeenCalled();

    ownerWindow.dispatch('keydown', { key: 'Escape' } as unknown as KeyboardEvent);
    ownerWindow.dispatch('resize', new Event('resize'));
    ownerWindow.dispatch('scroll', new Event('scroll'));

    expect(onDismiss).toHaveBeenCalledTimes(3);
  });
});
