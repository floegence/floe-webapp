import { createSignal, onCleanup } from 'solid-js';
import { cn } from '../../utils/cn';
import { useDeck, type DeckWidget, type ResizeState } from '../../context/DeckContext';
import { applyResizeDelta } from '../../utils/gridLayout';
import { startDeckPointerSession, type DeckPointerSessionController } from './deckPointerSession';

export interface WidgetResizeHandleProps {
  widget: DeckWidget;
  edge: ResizeState['edge'];
}

const EDGE_STYLES: Record<ResizeState['edge'], string> = {
  n: 'top-0 left-2 right-2 h-2 cursor-ns-resize',
  s: 'bottom-0 left-2 right-2 h-2 cursor-ns-resize',
  e: 'right-0 top-2 bottom-2 w-2 cursor-ew-resize',
  w: 'left-0 top-2 bottom-2 w-2 cursor-ew-resize',
  ne: 'top-0 right-0 w-4 h-4 cursor-nesw-resize',
  nw: 'top-0 left-0 w-4 h-4 cursor-nwse-resize',
  se: 'bottom-0 right-0 w-4 h-4 cursor-nwse-resize',
  sw: 'bottom-0 left-0 w-4 h-4 cursor-nesw-resize',
};

const EDGE_CURSORS: Record<ResizeState['edge'], string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  sw: 'nesw-resize',
};

/**
 * Resize handle for a specific edge of a widget.
 * The active pointer session is owned by the shared Deck pointer-session helper,
 * so pointer release remains reliable even when the cursor crosses other widgets.
 */
export function WidgetResizeHandle(props: WidgetResizeHandleProps) {
  const deck = useDeck();

  const [isActive, setIsActive] = createSignal(false);
  let handleRef: HTMLDivElement | undefined;
  let activeSession: DeckPointerSessionController | null = null;

  const stopResizing = (commit: boolean) => {
    activeSession?.stop({ commit });
    activeSession = null;
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const gridEl = (event.currentTarget as HTMLElement | null)?.closest('.deck-grid') as HTMLElement | null;
    if (!gridEl) return;

    stopResizing(false);

    deck.startResize(props.widget.id, props.edge, event.clientX, event.clientY);
    const resize = deck.resizeState();
    if (!resize || resize.widgetId !== props.widget.id || resize.edge !== props.edge) return;

    setIsActive(true);
    activeSession = startDeckPointerSession({
      kind: 'resize',
      widgetId: props.widget.id,
      gridEl,
      captureEl: handleRef,
      pointerEvent: event,
      cursor: EDGE_CURSORS[props.edge],
      onMove: (frame) => {
        const colDelta = Math.round(frame.deltaX / frame.colPitch);
        const rowDelta = Math.round(frame.deltaY / frame.rowPitch);
        const constraints = deck.getWidgetMinConstraints(props.widget.type);
        const currentPosition = applyResizeDelta(
          props.widget.position,
          props.edge,
          colDelta,
          rowDelta,
          constraints.minColSpan,
          constraints.minRowSpan,
          frame.cols
        );

        deck.updateResize(currentPosition);
      },
      onEnd: ({ commit }) => {
        activeSession = null;
        setIsActive(false);
        deck.endResize(commit);
      },
    });
  };

  onCleanup(() => stopResizing(false));

  return (
    <div
      ref={handleRef}
      class={cn(
        'absolute z-30',
        EDGE_STYLES[props.edge],
        'hover:bg-primary/30 transition-colors',
        isActive() && 'bg-primary/50'
      )}
      style={{ 'touch-action': 'none' }}
      data-widget-resize-handle={props.edge}
      onPointerDown={handlePointerDown}
    />
  );
}
