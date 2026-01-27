import { onCleanup } from 'solid-js';
import type { FileBrowserContextValue, FileItem } from './types';

export function createLongPressContextMenuHandlers(
  ctx: FileBrowserContextValue,
  item: FileItem,
  options?: { delayMs?: number; moveTolerancePx?: number }
) {
  const delayMs = options?.delayMs ?? 500;
  const moveTolerancePx = options?.moveTolerancePx ?? 10;

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

  const openMenuAt = (x: number, y: number) => {
    const id = item.id;
    if (!ctx.isSelected(id)) {
      ctx.selectItem(id, false);
    }

    const selectedIds = ctx.selectedItems();
    const allFiles = ctx.currentFiles();
    const selectedItems =
      selectedIds.size > 0 ? allFiles.filter((f) => selectedIds.has(f.id)) : [item];

    ctx.showContextMenu({ x, y, items: selectedItems });
    suppressNextClick = true;
  };

  const onPointerDown = (e: PointerEvent) => {
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

  onCleanup(() => clear());

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    consumeClickSuppression,
  };
}
