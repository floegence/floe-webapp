// @vitest-environment jsdom
import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLongPressContextMenuHandlers } from '../src/components/file-browser/longPressContextMenu';
import type { FileBrowserContextValue } from '../src/components/file-browser/types';

const file = { id: 'a', name: 'alpha.txt', path: '/alpha.txt', type: 'file' as const };
function gesture() {
  const showContextMenu = vi.fn();
  const ctx = {
    showContextMenu,
    ensureContextMenuSelection: vi.fn(),
    getSelectedItemsList: () => [file],
  } as unknown as FileBrowserContextValue;
  let dispose!: () => void;
  const handlers = createRoot((cleanup) => {
    dispose = cleanup;
    return createLongPressContextMenuHandlers(ctx, file);
  });
  return { ...handlers, showContextMenu, dispose };
}
function pointer(values: Partial<PointerEvent> = {}): PointerEvent {
  return {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    clientX: 40,
    clientY: 70,
    currentTarget: document.body,
    ...values,
  } as PointerEvent;
}
afterEach(() => vi.useRealTimers());
describe('file long press gestures', () => {
  it('opens once after a stationary hold and consumes the release click', () => {
    vi.useFakeTimers();
    const menu = gesture();
    menu.onPointerDown(pointer());
    vi.advanceTimersByTime(500);
    expect(menu.showContextMenu).toHaveBeenCalledTimes(1);
    menu.onPointerUp();
    expect(menu.consumeClickSuppression(new MouseEvent('click'))).toBe(true);
    menu.dispose();
  });
  it.each(['move', 'cancel', 'additional-pointer', 'secondary-pointer'] as const)(
    'cancels %s without opening a menu',
    (action) => {
      vi.useFakeTimers();
      const menu = gesture();
      menu.onPointerDown(pointer());
      if (action === 'move') menu.onPointerMove(pointer({ clientY: 100 }));
      if (action === 'cancel') menu.onPointerCancel();
      if (action === 'secondary-pointer')
        menu.onPointerDown(pointer({ pointerId: 2, isPrimary: false }));
      if (action === 'additional-pointer') {
        const event = new Event('pointerdown');
        Object.defineProperty(event, 'pointerId', { value: 2 });
        document.dispatchEvent(event);
      }
      vi.advanceTimersByTime(600);
      expect(menu.showContextMenu).not.toHaveBeenCalled();
      menu.dispose();
    }
  );
});
