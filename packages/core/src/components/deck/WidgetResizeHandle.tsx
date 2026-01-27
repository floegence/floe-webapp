import { createSignal, onCleanup } from 'solid-js';
import { cn } from '../../utils/cn';
import { useDeck, type DeckWidget, type ResizeState } from '../../context/DeckContext';
import { applyResizeDelta } from '../../utils/gridLayout';
import { getGridConfigFromElement } from './DeckGrid';
import { lockBodyStyle } from '../../utils/bodyStyleLock';

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
 * Resize handle for a specific edge of a widget
 */
export function WidgetResizeHandle(props: WidgetResizeHandleProps) {
  const deck = useDeck();

  const [isActive, setIsActive] = createSignal(false);
  let handleRef: HTMLDivElement | undefined;
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let rafId: number | null = null;
  let unlockBody: (() => void) | null = null;
  let gridEl: HTMLElement | null = null;
  let gridPaddingLeft = 0;
  let gridPaddingRight = 0;

  const setGlobalStyles = (active: boolean) => {
    if (!active) {
      unlockBody?.();
      unlockBody = null;
      return;
    }

    unlockBody?.();
    unlockBody = lockBodyStyle({ cursor: EDGE_CURSORS[props.edge], 'user-select': 'none' });
  };

  const stopResizing = () => {
    if (!isActive()) return;
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    setIsActive(false);
    activePointerId = null;
    gridEl = null;
    setGlobalStyles(false);
    deck.endResize(true);
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const nearestGrid = (e.currentTarget as HTMLElement | null)?.closest('.deck-grid') as HTMLElement | null;
    if (!nearestGrid) return;

    activePointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    lastX = startX;
    lastY = startY;
    setIsActive(true);
    setGlobalStyles(true);
    gridEl = nearestGrid;

    // Cache horizontal paddings once per interaction (avoid per-frame getComputedStyle).
    const styles = window.getComputedStyle(nearestGrid);
    gridPaddingLeft = parseFloat(styles.paddingLeft) || 0;
    gridPaddingRight = parseFloat(styles.paddingRight) || 0;

    deck.startResize(props.widget.id, props.edge, startX, startY);
    handleRef?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isActive() || activePointerId !== e.pointerId) return;

    lastX = e.clientX;
    lastY = e.clientY;

    // RAF throttle for performance
    if (rafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') {
      updatePosition();
      return;
    }

    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!isActive()) return;
      updatePosition();
    });
  };

  const updatePosition = () => {
    const deltaX = lastX - startX;
    const deltaY = lastY - startY;

    // Get grid element and calculate cell sizes
    if (!gridEl) return;

    // Read dynamic row height from the grid element
    const { cols, rowHeight, gap } = getGridConfigFromElement(gridEl);

    // Calculate cell dimensions
    // Use clientWidth (excludes scrollbar) to avoid jitter when scrollbars appear/disappear.
    const innerWidth = gridEl.clientWidth - gridPaddingLeft - gridPaddingRight;
    const totalGapWidth = gap * (cols - 1);
    const cellWidth = (innerWidth - totalGapWidth) / cols;
    if (!Number.isFinite(cellWidth) || cellWidth <= 0) return;
    const cellHeight = rowHeight + gap;

    // Convert pixel delta to grid units
    const colDelta = Math.round(deltaX / cellWidth);
    const rowDelta = Math.round(deltaY / cellHeight);

    const constraints = deck.getWidgetMinConstraints(props.widget.type);
    const newPosition = applyResizeDelta(
      props.widget.position,
      props.edge,
      colDelta,
      rowDelta,
      constraints.minColSpan,
      constraints.minRowSpan,
      cols
    );

    deck.updateResize(newPosition);
  };

  const handlePointerUpOrCancel = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId) return;
    try {
      handleRef?.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    stopResizing();
  };

  onCleanup(() => stopResizing());

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
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
    />
  );
}
