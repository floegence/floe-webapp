import { createEffect, onCleanup } from 'solid-js';
import { useDeck } from '../context/DeckContext';
import { applyDragDelta } from '../utils/gridLayout';
import { DECK_GRID_CONFIG } from '../components/deck/DeckGrid';

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
  let lastX = 0;
  let lastY = 0;
  let rafId: number | null = null;
  let currentWidgetId: string | null = null;
  let handleEl: HTMLElement | null = null;

  const setGlobalStyles = (active: boolean) => {
    if (typeof document === 'undefined') return;
    document.body.style.cursor = active ? 'grabbing' : '';
    document.body.style.userSelect = active ? 'none' : '';
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
    setGlobalStyles(false);
    deck.endDrag(true);
  };

  const handlePointerDown = (e: PointerEvent) => {
    // Find the drag handle element
    const target = e.target as HTMLElement;

    // Skip if clicking on interactive elements (buttons, inputs, etc.)
    const interactiveElement = target.closest('button, input, select, textarea, [role="button"], a');
    if (interactiveElement) return;

    const handle = target.closest('[data-widget-drag-handle]') as HTMLElement | null;
    if (!handle) return;

    // Only start a mouse drag with the primary button
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const widgetId = handle.dataset.widgetDragHandle;
    if (!widgetId) return;

    e.preventDefault();
    e.stopPropagation();

    activePointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    lastX = startX;
    lastY = startY;
    currentWidgetId = widgetId;
    handleEl = handle;
    setGlobalStyles(true);

    deck.startDrag(widgetId, startX, startY);
    handle.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId || !currentWidgetId) return;

    lastX = e.clientX;
    lastY = e.clientY;

    if (rafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') {
      updatePosition();
      return;
    }

    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (activePointerId === null) return;
      updatePosition();
    });
  };

  const updatePosition = () => {
    if (!currentWidgetId) return;

    const deltaX = lastX - startX;
    const deltaY = lastY - startY;

    // Get grid element and calculate cell sizes
    const gridEl = document.querySelector('.deck-grid');
    if (!gridEl) return;

    const gridRect = gridEl.getBoundingClientRect();
    const { cols, rowHeight, gap } = DECK_GRID_CONFIG;

    // Calculate cell dimensions
    const totalGapWidth = gap * (cols - 1);
    const cellWidth = (gridRect.width - totalGapWidth - gap * 2) / cols; // Account for padding
    const cellHeight = rowHeight + gap;

    // Convert pixel delta to grid units (for snap position)
    const colDelta = Math.round(deltaX / cellWidth);
    const rowDelta = Math.round(deltaY / cellHeight);

    const wsLayout = deck.activeLayout();
    const widget = wsLayout?.widgets.find((w) => w.id === currentWidgetId);
    if (!widget) return;

    const newPosition = applyDragDelta(widget.position, colDelta, rowDelta, cols);

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
