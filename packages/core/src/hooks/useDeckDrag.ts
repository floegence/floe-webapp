import { createEffect, onCleanup } from 'solid-js';
import { useDeck } from '../context/DeckContext';
import { applyDragDelta } from '../utils/gridLayout';
import type { GridPosition } from '../utils/gridCollision';
import { startDeckPointerSession, type DeckPointerSessionController } from '../components/deck/deckPointerSession';

/**
 * Hook to set up drag handling for deck widgets.
 * The drag handle is discovered lazily from `pointerdown`, then the active
 * pointer session is promoted to a document-level controller so release always
 * tears down correctly even when the pointer crosses other surfaces.
 */
export function useDeckDrag() {
  const deck = useDeck();

  let activeSession: DeckPointerSessionController | null = null;
  let currentWidgetId: string | null = null;
  let originalPosition: GridPosition | null = null;

  const stopDragging = (commit: boolean) => {
    activeSession?.stop({ commit });
    activeSession = null;
    currentWidgetId = null;
    originalPosition = null;
  };

  const handlePointerDown = (event: PointerEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const interactiveElement = target.closest('button, input, select, textarea, [role="button"], a');
    if (interactiveElement) return;

    if (target.closest('[data-widget-resize-handle]')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const handle = target.closest('[data-widget-drag-handle]') as HTMLElement | null;
    if (!handle) return;

    const widgetId = handle.dataset.widgetDragHandle;
    if (!widgetId) return;

    const gridEl = handle.closest('.deck-grid') as HTMLElement | null;
    if (!gridEl) return;

    const layout = deck.activeLayout();
    const widget = layout?.widgets.find((item) => item.id === widgetId);
    if (!widget) return;

    event.preventDefault();
    event.stopPropagation();

    stopDragging(false);

    deck.startDrag(widgetId, event.clientX, event.clientY);
    const drag = deck.dragState();
    if (!drag || drag.widgetId !== widgetId) return;

    currentWidgetId = widgetId;
    originalPosition = { ...widget.position };
    activeSession = startDeckPointerSession({
      kind: 'drag',
      widgetId,
      gridEl,
      captureEl: handle,
      pointerEvent: event,
      cursor: 'grabbing',
      onMove: (frame) => {
        if (!currentWidgetId || !originalPosition) return;

        const colDelta = Math.round(frame.deltaX / frame.colPitch);
        const rowDelta = Math.round(frame.deltaY / frame.rowPitch);
        const currentPosition = applyDragDelta(originalPosition, colDelta, rowDelta, frame.cols);
        deck.updateDrag(currentPosition, {
          deltaX: frame.deltaX,
          deltaY: frame.deltaY,
        });
      },
      onEnd: ({ commit }) => {
        activeSession = null;
        currentWidgetId = null;
        originalPosition = null;
        deck.endDrag(commit);
      },
    });
  };

  createEffect(() => {
    if (typeof document === 'undefined') return;

    document.addEventListener('pointerdown', handlePointerDown, true);

    onCleanup(() => {
      stopDragging(false);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    });
  });
}
