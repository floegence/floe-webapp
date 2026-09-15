import { onCleanup } from 'solid-js';
import type { FileBrowserContextValue, FileItem } from './types';
import { createItemContextMenuEvent } from './contextMenuEvent';

export function createLongPressContextMenuHandlers(
  ctx: FileBrowserContextValue,
  item: FileItem,
  options?: {
    delayMs?: number;
    moveTolerancePx?: number;
    selectOnOpen?: boolean;
    source?: 'list' | 'grid' | 'tree';
  }
) {
  const delayMs = options?.delayMs ?? 500;
  const moveTolerancePx = options?.moveTolerancePx ?? 10;
  const selectOnOpen = options?.selectOnOpen ?? true;
  const source = options?.source ?? 'list';

  let timer: number | null = null;
  let start: { x: number; y: number } | null = null;
  let suppressNextClick = false;
  let ownerDocument: Document | null = null;
  let pointerId: number | null = null;

  const clear = () => {
    if (timer !== null && typeof window !== 'undefined') {
      window.clearTimeout(timer);
      timer = null;
    }
    start = null;
    ownerDocument?.removeEventListener('pointerdown', onAdditionalPointer, true);
    ownerDocument = null;
    pointerId = null;
  };

  const onAdditionalPointer = (event: PointerEvent) => {
    if (pointerId !== null && event.pointerId !== pointerId) {
      clear();
      suppressNextClick = true;
    }
  };

  const armSuppressNextClick = () => {
    suppressNextClick = true;
  };

  const openMenuAt = (x: number, y: number) => {
    if (!selectOnOpen) {
      ctx.showContextMenu(
        createItemContextMenuEvent({
          x,
          y,
          triggerItem: item,
          items: [item],
          source,
        })
      );
      armSuppressNextClick();
      return;
    }

    ctx.ensureContextMenuSelection(item.id);

    const selectedFromCurrent = ctx.getSelectedItemsList();
    const selectedItems = selectedFromCurrent.length > 0 ? selectedFromCurrent : [item];

    ctx.showContextMenu(
      createItemContextMenuEvent({
        x,
        y,
        triggerItem: item,
        items: selectedItems,
        source,
      })
    );
    armSuppressNextClick();
  };

  const onPointerDown = (e: PointerEvent) => {
    // New gesture: clear any stale suppression from previous interactions on this item.
    suppressNextClick = false;

    // Long-press is for touch/pen; keep desktop interactions unchanged.
    if (e.pointerType === 'mouse') return;
    if (e.isPrimary === false) {
      clear();
      armSuppressNextClick();
      return;
    }
    if (typeof window === 'undefined') return;

    clear();
    pointerId = e.pointerId;
    ownerDocument = e.currentTarget instanceof Node ? e.currentTarget.ownerDocument : document;
    ownerDocument?.addEventListener('pointerdown', onAdditionalPointer, true);
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
  const onPointerCancel = () => {
    clear();
    armSuppressNextClick();
  };

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
