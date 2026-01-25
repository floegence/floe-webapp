import { For, Show, createMemo, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';
import { useDeck } from '../../context/DeckContext';
import { hasCollision } from '../../utils/gridCollision';
import { DeckCell } from './DeckCell';
import { DropZonePreview } from './DropZonePreview';

export interface DeckGridProps {
  class?: string;
  children?: JSX.Element;
}

// Grid configuration - 24 columns for finer control
const GRID_COLS = 24;
const ROW_HEIGHT = 40; // Smaller rows for finer control
const GAP = 4;
const TOTAL_GAP_WIDTH = (GRID_COLS - 1) * GAP;
const ZERO_OFFSET = { x: 0, y: 0 } as const;

/**
 * CSS Grid container for the deck layout (24 columns for fine-grained control)
 */
export function DeckGrid(props: DeckGridProps) {
  const deck = useDeck();

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

  // Calculate the minimum rows needed based on widget positions
  const minRows = createMemo(() => {
    const ws = widgets();
    if (ws.length === 0) return 12;
    return Math.max(12, ...ws.map((w) => w.position.row + w.position.rowSpan));
  });

  return (
    <div
      class={cn(
        // Reserve scrollbar gutter to avoid width jitter when drop previews change scrollability.
        'deck-grid relative w-full h-full overflow-y-scroll overflow-x-hidden',
        'grid p-1',
        deck.editMode() && 'bg-muted/20',
        props.class
      )}
      style={{
        // Safe to ignore in browsers without support; helps avoid layout jitter when supported.
        'scrollbar-gutter': 'stable',
        'grid-template-columns': `repeat(${GRID_COLS}, 1fr)`,
        'grid-auto-rows': `${ROW_HEIGHT}px`,
        'gap': `${GAP}px`,
        'min-height': `${minRows() * (ROW_HEIGHT + GAP)}px`,
      }}
      data-grid-cols={GRID_COLS}
      data-row-height={ROW_HEIGHT}
      data-gap={GAP}
    >
      {/* Grid overlay in edit mode */}
      <Show when={deck.editMode()}>
        <div
          class="absolute inset-0 pointer-events-none z-0 rounded"
          style={{
            // Keep the overlay aligned with the grid even if consumers override padding (e.g. `p-0`).
            padding: 'inherit',
            'background-origin': 'content-box',
            'background-clip': 'content-box',
            'background-image': `
              linear-gradient(to right, color-mix(in srgb, var(--border) 15%, transparent) 1px, transparent 1px),
              linear-gradient(to bottom, color-mix(in srgb, var(--border) 15%, transparent) 1px, transparent 1px)
            `,
            // Match CSS grid math: cellWidth = (W - (cols - 1) * gap) / cols
            // Background tile is (cellWidth + gap) so the vertical lines align with column boundaries.
            'background-size': `calc((100% - ${TOTAL_GAP_WIDTH}px) / ${GRID_COLS} + ${GAP}px) ${ROW_HEIGHT + GAP}px`,
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
              // Keep at original position during drag, transform handles visual offset
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

          // Get pixel offset for smooth drag
          const pixelOffset = createMemo(() => {
            const drag = dragState();
            if (drag && drag.widgetId === widget.id) {
              return drag.pixelOffset;
            }
            // Important: keep a stable reference for non-dragging widgets.
            // Otherwise, every mousemove would create a new object and trigger
            // unnecessary updates/reflows in heavy widgets (e.g. FileBrowser).
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

// Export grid configuration for use in drag/resize calculations
export const DECK_GRID_CONFIG = {
  cols: GRID_COLS,
  rowHeight: ROW_HEIGHT,
  gap: GAP,
};
