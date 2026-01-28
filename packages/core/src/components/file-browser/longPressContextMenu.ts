import { onCleanup } from 'solid-js';
import type { FileBrowserContextValue, FileItem } from './types';

export function createLongPressContextMenuHandlers(
  ctx: FileBrowserContextValue,
  item: FileItem,
  options?: { delayMs?: number; moveTolerancePx?: number; selectOnOpen?: boolean }
) {
  const delayMs = options?.delayMs ?? 500;
  const moveTolerancePx = options?.moveTolerancePx ?? 10;
  const selectOnOpen = options?.selectOnOpen ?? true;

  let timer: number | null = null;
  let start: { x: number; y: number } | null = null;
  let suppressNextClick = false;

  const clear = () => {
    if (timer !== null && typeof window !== 'undefined') {
      window.clearTimeout(timer);
      timer = null;
    }
    start = null;
  };

  const armSuppressNextClick = () => {
    suppressNextClick = true;
  };

  const openMenuAt = (x: number, y: number) => {
    if (!selectOnOpen) {
      ctx.showContextMenu({ x, y, items: [item] });
      armSuppressNextClick();
      return;
    }

    const id = item.id;
    if (!ctx.isSelected(id)) {
      ctx.selectItem(id, false);
    }

    const selectedIds = ctx.selectedItems();
    const allFiles = ctx.currentFiles();
    const selectedFromCurrent = allFiles.filter((f) => selectedIds.has(f.id));
    const selectedItems = selectedFromCurrent.length > 0 ? selectedFromCurrent : [item];

    ctx.showContextMenu({ x, y, items: selectedItems });
    armSuppressNextClick();
  };

  const onPointerDown = (e: PointerEvent) => {
    // New gesture: clear any stale suppression from previous interactions on this item.
    suppressNextClick = false;

    // Long-press is for touch/pen; keep desktop interactions unchanged.
    if (e.pointerType === 'mouse') return;
    if (typeof window === 'undefined') return;

    clear();
    start = { x: e.clientX, y: e.clientY };
    const x = e.clientX;
    const y = e.clientY;

    timer = window.setTimeout(() => {
      timer = null;
      openMenuAt(x, y);
    }, delayMs);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (timer === null || !start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > moveTolerancePx) {
      clear();
      // Treat as a scroll/drag gesture: suppress the synthetic click that may follow.
      armSuppressNextClick();
    }
  };

  const onPointerUp = () => clear();
  const onPointerCancel = () => clear();

  const consumeClickSuppression = (e: MouseEvent) => {
    if (!suppressNextClick) return false;
    suppressNextClick = false;
    e.preventDefault();
    e.stopPropagation();
    return true;
  };

  onCleanup(() => {
    clear();
  });

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    consumeClickSuppression,
  };
}
