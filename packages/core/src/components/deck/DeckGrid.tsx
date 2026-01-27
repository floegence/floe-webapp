import { For, Show, createMemo, createSignal, onMount, onCleanup, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';
import { useDeck } from '../../context/DeckContext';
import { hasCollision } from '../../utils/gridCollision';
import { DeckCell } from './DeckCell';
import { DropZonePreview } from './DropZonePreview';

export interface DeckGridProps {
  class?: string;
  children?: JSX.Element;
}

// Grid configuration
const GRID_COLS = 24;
const DEFAULT_ROWS = 24; // Default rows to fill one screen (24x24 grid)
const GAP = 4;
const MIN_ROW_HEIGHT = 20; // Minimum row height to prevent cells from being too small
const PADDING = 4; // p-1 = 4px
const TOTAL_GAP_WIDTH = (GRID_COLS - 1) * GAP;
const ZERO_OFFSET = { x: 0, y: 0 } as const;

/**
 * CSS Grid container for the deck layout (24x24 grid that fills the container)
 *
 * The grid is designed to:
 * 1. Fill exactly one screen with a 24x24 grid (no scrolling by default)
 * 2. Expand vertically when widgets are placed beyond row 24
 * 3. Row height is calculated dynamically based on container height
 */
export function DeckGrid(props: DeckGridProps) {
  const deck = useDeck();
  let gridRef: HTMLDivElement | undefined;

  // Track container dimensions for dynamic row height calculation
  const [containerHeight, setContainerHeight] = createSignal(0);

  // Access widgets as a function to ensure reactivity for nested property changes
  const widgets = () => deck.activeLayout()?.widgets ?? [];
  const dragState = () => deck.dragState();
  const resizeState = () => deck.resizeState();

  const dragPreviewValid = createMemo(() => {
    const drag = dragState();
    if (!drag) return true;
    const layout = deck.activeLayout();
    if (!layout) return true;
    return !hasCollision(drag.currentPosition, layout.widgets, drag.widgetId);
  });

  // Calculate actual rows needed (minimum 24 to fill one screen)
  const actualRows = createMemo(() => {
    const ws = widgets();
    if (ws.length === 0) return DEFAULT_ROWS;
    return Math.max(DEFAULT_ROWS, ...ws.map((w) => w.position.row + w.position.rowSpan));
  });

  // Calculate dynamic row height based on container height
  // Formula: rowHeight = (containerHeight - padding * 2 - (DEFAULT_ROWS - 1) * gap) / DEFAULT_ROWS
  const rowHeight = createMemo(() => {
    const height = containerHeight();
    if (height <= 0) return MIN_ROW_HEIGHT;

    const availableHeight = height - PADDING * 2 - (DEFAULT_ROWS - 1) * GAP;
    const calculated = availableHeight / DEFAULT_ROWS;
    return Math.max(MIN_ROW_HEIGHT, calculated);
  });

  // Set up ResizeObserver to track container dimensions
  onMount(() => {
    if (!gridRef || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(gridRef);
    // Initial measurement
    setContainerHeight(gridRef.clientHeight);

    onCleanup(() => observer.disconnect());
  });

  // Check if content exceeds container (needs scrolling)
  const needsScroll = createMemo(() => actualRows() > DEFAULT_ROWS);

  return (
    <div
      ref={gridRef}
      class={cn(
        'deck-grid relative w-full h-full overflow-x-hidden',
        // Only enable vertical scroll when content exceeds 24 rows
        needsScroll() ? 'overflow-y-scroll' : 'overflow-y-hidden',
        'grid p-1',
        deck.editMode() && 'bg-muted/20',
        props.class
      )}
      style={{
        'scrollbar-gutter': 'stable',
        'grid-template-columns': `repeat(${GRID_COLS}, 1fr)`,
        'grid-auto-rows': `${rowHeight()}px`,
        'gap': `${GAP}px`,
      }}
      data-grid-cols={GRID_COLS}
      data-row-height={rowHeight()}
      data-gap={GAP}
      data-default-rows={DEFAULT_ROWS}
    >
      {/* Invisible placeholder to ensure minimum content height */}
      <div
        class="pointer-events-none"
        style={{
          'grid-column': '1',
          'grid-row': `1 / ${actualRows() + 1}`,
        }}
        aria-hidden="true"
      />

      {/* Grid overlay in edit mode */}
      <Show when={deck.editMode()}>
        <div
          class="absolute inset-0 pointer-events-none z-0 rounded"
          style={{
            padding: 'inherit',
            'background-origin': 'content-box',
            'background-clip': 'content-box',
            'background-image': `
              linear-gradient(to right, color-mix(in srgb, var(--border) 15%, transparent) 1px, transparent 1px),
              linear-gradient(to bottom, color-mix(in srgb, var(--border) 15%, transparent) 1px, transparent 1px)
            `,
            // Dynamic background size based on calculated row height
            'background-size': `calc((100% - ${TOTAL_GAP_WIDTH}px) / ${GRID_COLS} + ${GAP}px) ${rowHeight() + GAP}px`,
            'background-position': '0 0',
          }}
        />
      </Show>

      {/* Drop zone preview - shows where the widget will be placed */}
      <Show when={dragState()}>
        {(drag) => (
          <DropZonePreview position={drag().currentPosition} isValid={dragPreviewValid()} />
        )}
      </Show>

      {/* Widget cells */}
      <For each={widgets()}>
        {(widget) => {
          // During drag: use original position (visual offset handled by transform)
          // During resize: use currentPosition (actual resize preview)
          // Otherwise: use widget position
          const position = createMemo(() => {
            const drag = dragState();
            if (drag && drag.widgetId === widget.id) {
              return widget.position;
            }
            const resize = resizeState();
            if (resize && resize.widgetId === widget.id) {
              return resize.currentPosition;
            }
            return widget.position;
          });

          const isDragging = createMemo(() => {
            const drag = dragState();
            return drag?.widgetId === widget.id;
          });

          const isResizing = createMemo(() => {
            const resize = resizeState();
            return resize?.widgetId === widget.id;
          });

          const pixelOffset = createMemo(() => {
            const drag = dragState();
            if (drag && drag.widgetId === widget.id) {
              return drag.pixelOffset;
            }
            return ZERO_OFFSET;
          });

          return (
            <DeckCell
              widget={widget}
              position={position()}
              isDragging={isDragging()}
              isResizing={isResizing()}
              pixelOffset={pixelOffset()}
            />
          );
        }}
      </For>

      {props.children}
    </div>
  );
}

// Export grid configuration
// Note: rowHeight is now dynamic and should be read from the grid element's data-row-height attribute
export const DECK_GRID_CONFIG = {
  cols: GRID_COLS,
  defaultRows: DEFAULT_ROWS,
  gap: GAP,
  // Deprecated: use getGridConfig() or read from data-row-height attribute instead
  rowHeight: MIN_ROW_HEIGHT,
};

/**
 * Get grid configuration from the DOM element
 * Use this for accurate row height during drag/resize operations
 */
export function getGridConfigFromElement(gridEl: HTMLElement) {
  return {
    cols: parseInt(gridEl.dataset.gridCols || String(GRID_COLS), 10),
    rowHeight: parseFloat(gridEl.dataset.rowHeight || String(MIN_ROW_HEIGHT)),
    gap: parseInt(gridEl.dataset.gap || String(GAP), 10),
    defaultRows: parseInt(gridEl.dataset.defaultRows || String(DEFAULT_ROWS), 10),
  };
}
