import { For, Show, createMemo, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';
import { useDeck } from '../../context/DeckContext';
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

/**
 * CSS Grid container for the deck layout (24 columns for fine-grained control)
 */
export function DeckGrid(props: DeckGridProps) {
  const deck = useDeck();

  // Access widgets as a function to ensure reactivity for nested property changes
  const widgets = () => deck.activeLayout()?.widgets ?? [];
  const dragState = () => deck.dragState();
  const resizeState = () => deck.resizeState();

  // Calculate the minimum rows needed based on widget positions
  const minRows = createMemo(() => {
    const ws = widgets();
    if (ws.length === 0) return 12;
    return Math.max(12, ...ws.map((w) => w.position.row + w.position.rowSpan));
  });

  return (
    <div
      class={cn(
        'deck-grid relative w-full h-full overflow-auto',
        'grid p-1',
        deck.editMode() && 'bg-muted/20',
        props.class
      )}
      style={{
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
          class="absolute inset-1 pointer-events-none z-0 rounded"
          style={{
            'background-image': `
              linear-gradient(to right, hsl(var(--border) / 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border) / 0.15) 1px, transparent 1px)
            `,
            'background-size': `calc((100% - ${GAP}px) / ${GRID_COLS}) ${ROW_HEIGHT + GAP}px`,
            'background-position': `0 0`,
          }}
        />
      </Show>

      {/* Drop zone preview - shows where the widget will be placed */}
      <Show when={dragState()}>
        {(drag) => (
          <DropZonePreview position={drag().currentPosition} />
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
            return { x: 0, y: 0 };
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
