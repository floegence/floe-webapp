import { createEffect, onCleanup } from 'solid-js';
import { useDeck } from '../context/DeckContext';
import { applyDragDelta } from '../utils/gridLayout';
import { getGridConfigFromElement } from '../components/deck/DeckGrid';
import { lockBodyStyle } from '../utils/bodyStyleLock';
import type { GridPosition } from '../utils/gridCollision';

/**
 * Hook to set up drag handling for deck widgets
 * Listens for pointer events on elements with data-widget-drag-handle attribute
 * Only active when edit mode is enabled
 */
export function useDeckDrag() {
  const deck = useDeck();

  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startScrollTop = 0;
  let lastX = 0;
  let lastY = 0;
  let lastAppliedX = 0;
  let lastAppliedY = 0;
  let lastAppliedScrollTop = 0;
  let rafId: number | null = null;
  let currentWidgetId: string | null = null;
  let handleEl: HTMLElement | null = null;
  let unlockBody: (() => void) | null = null;
  let gridEl: HTMLElement | null = null;
  let gridRect: DOMRect | null = null;
  let gridPaddingLeft = 0;
  let gridPaddingRight = 0;
  let originalPosition: GridPosition | null = null;

  const setGlobalStyles = (active: boolean) => {
    if (!active) {
      unlockBody?.();
      unlockBody = null;
      return;
    }

    unlockBody?.();
    unlockBody = lockBodyStyle({ cursor: 'grabbing', 'user-select': 'none' });
  };

  const stopDragging = () => {
    if (activePointerId === null) return;
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    activePointerId = null;
    currentWidgetId = null;
    handleEl = null;
    gridEl = null;
    gridRect = null;
    originalPosition = null;
    setGlobalStyles(false);
    deck.endDrag(true);
  };

  const maybeAutoScroll = (): void => {
    if (!gridEl) return;
    // Only vertical auto-scroll is needed (rows are unbounded).
    const rect = gridRect ?? gridEl.getBoundingClientRect();
    const threshold = 48;
    const maxSpeed = 24;

    const distTop = lastY - rect.top;
    const distBottom = rect.bottom - lastY;

    let delta = 0;
    if (distTop < threshold) {
      delta = -Math.ceil(((threshold - distTop) / threshold) * maxSpeed);
    } else if (distBottom < threshold) {
      delta = Math.ceil(((threshold - distBottom) / threshold) * maxSpeed);
    }

    if (delta === 0) return;
    const prev = gridEl.scrollTop;
    const next = Math.max(0, Math.min(prev + delta, gridEl.scrollHeight - gridEl.clientHeight));
    if (next !== prev) gridEl.scrollTop = next;
  };

  const startTick = () => {
    if (rafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') return;

    const tick = () => {
      if (activePointerId === null) {
        rafId = null;
        return;
      }
      updatePosition();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  };

  const handlePointerDown = (e: PointerEvent) => {
    // Find the drag handle element
    const target = e.target as HTMLElement;

    // Skip if clicking on interactive elements (buttons, inputs, etc.)
    const interactiveElement = target.closest('button, input, select, textarea, [role="button"], a');
    if (interactiveElement) return;

    // Skip if clicking on a resize handle (let resize handler take over)
    const resizeHandle = target.closest('[data-widget-resize-handle]');
    if (resizeHandle) return;

    const handle = target.closest('[data-widget-drag-handle]') as HTMLElement | null;
    if (!handle) return;

    // Only start a mouse drag with the primary button
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const widgetId = handle.dataset.widgetDragHandle;
    if (!widgetId) return;

    const nearestGrid = handle.closest('.deck-grid') as HTMLElement | null;
    if (!nearestGrid) return;

    e.preventDefault();
    e.stopPropagation();

    activePointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    lastX = startX;
    lastY = startY;
    lastAppliedX = startX;
    lastAppliedY = startY;
    currentWidgetId = widgetId;
    handleEl = handle;
    gridEl = nearestGrid;
    // Cache the grid rect once per interaction to avoid per-frame layout reads.
    gridRect = nearestGrid.getBoundingClientRect();
    startScrollTop = nearestGrid.scrollTop;
    lastAppliedScrollTop = startScrollTop;
    setGlobalStyles(true);

    const wsLayout = deck.activeLayout();
    const widget = wsLayout?.widgets.find((w) => w.id === widgetId);
    originalPosition = widget ? { ...widget.position } : null;

    // Cache horizontal paddings once per interaction (avoid per-frame getComputedStyle).
    const styles = window.getComputedStyle(nearestGrid);
    gridPaddingLeft = parseFloat(styles.paddingLeft) || 0;
    gridPaddingRight = parseFloat(styles.paddingRight) || 0;

    deck.startDrag(widgetId, startX, startY);
    handle.setPointerCapture(e.pointerId);
    startTick();
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId || !currentWidgetId) return;

    lastX = e.clientX;
    lastY = e.clientY;
    if (typeof requestAnimationFrame === 'undefined') {
      updatePosition();
    }
  };

  const updatePosition = () => {
    if (!currentWidgetId) return;
    if (!gridEl || !originalPosition) return;

    // Keep scrolling responsive even if the pointer is stationary near edges.
    maybeAutoScroll();

    const scrollTop = gridEl.scrollTop;
    if (lastX === lastAppliedX && lastY === lastAppliedY && scrollTop === lastAppliedScrollTop) return;
    lastAppliedX = lastX;
    lastAppliedY = lastY;
    lastAppliedScrollTop = scrollTop;

    const deltaX = lastX - startX;
    // Include scroll delta so the dragged widget stays under the pointer while the canvas scrolls.
    const deltaY = (lastY - startY) + (scrollTop - startScrollTop);

    // Read dynamic row height from the grid element
    const { cols, rowHeight, gap } = getGridConfigFromElement(gridEl);

    // Calculate cell dimensions (use clientWidth to avoid width jitter when scrollbars appear/disappear).
    const innerWidth = gridEl.clientWidth - gridPaddingLeft - gridPaddingRight;
    const totalGapWidth = gap * (cols - 1);
    const cellWidth = (innerWidth - totalGapWidth) / cols;
    if (!Number.isFinite(cellWidth) || cellWidth <= 0) return;
    const cellHeight = rowHeight + gap;

    // Convert pixel delta to grid units (for snap position)
    const colDelta = Math.round(deltaX / cellWidth);
    const rowDelta = Math.round(deltaY / cellHeight);

    const newPosition = applyDragDelta(originalPosition, colDelta, rowDelta, cols);

    // Pass both the snapped grid position and the raw pixel offset for smooth visual
    deck.updateDrag(newPosition, { x: deltaX, y: deltaY });
  };

  const handlePointerUpOrCancel = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId) return;
    try {
      handleEl?.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    stopDragging();
  };

  // Only add event listeners when in edit mode
  createEffect(() => {
    if (!deck.editMode()) return;
    if (typeof document === 'undefined') return;

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('pointerup', handlePointerUpOrCancel, true);
    document.addEventListener('pointercancel', handlePointerUpOrCancel, true);

    onCleanup(() => {
      stopDragging();
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointermove', handlePointerMove, true);
      document.removeEventListener('pointerup', handlePointerUpOrCancel, true);
      document.removeEventListener('pointercancel', handlePointerUpOrCancel, true);
    });
  });
}
