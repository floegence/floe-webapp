import { For, Show, createMemo, createSignal, onMount, onCleanup, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';
import { useDeck } from '../../context/DeckContext';
import { useLayout } from '../../context/LayoutContext';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';
import { useWidgetRegistry } from '../../context/WidgetRegistry';
import { hasCollision } from '../../utils/gridCollision';
import { DeckCell } from './DeckCell';
import { DeckContextMenu, type DeckContextMenuItem } from './DeckContextMenu';
import { DropZonePreview } from './DropZonePreview';
import {
  DECK_DEFAULT_ROWS,
  DECK_GAP,
  DECK_GRID_COLS,
  DECK_GRID_CONFIG,
  DECK_MIN_ROW_HEIGHT,
  DECK_PADDING,
  getGridConfigFromElement,
} from './deckGridMetrics';

export interface DeckGridProps {
  class?: string;
  children?: JSX.Element;
}

// Grid configuration
const TOTAL_GAP_WIDTH = (DECK_GRID_COLS - 1) * DECK_GAP;

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
  const layout = useLayout();
  const widgetRegistry = useWidgetRegistry();
  const floe = useResolvedFloeConfig();
  let gridRef: HTMLDivElement | undefined;

  // Track container dimensions for dynamic row height calculation
  const [containerHeight, setContainerHeight] = createSignal(0);

  // Right-click "add widget here" context menu state.
  const [menuState, setMenuState] = createSignal<
    | { x: number; y: number; col: number; row: number }
    | null
  >(null);

  // Access widgets as a function to ensure reactivity for nested property changes
  const widgets = () => deck.activeLayout()?.widgets ?? [];
  const dragState = () => deck.dragState();
  const resizeState = () => deck.resizeState();

  const showGridBackground = () => !layout.isMobile();

  const immutablePreset = () =>
    (floe.config.deck.presetsMode ?? 'mutable') === 'immutable' &&
    Boolean(deck.activeLayout()?.isPreset);

  const menuItems = createMemo<DeckContextMenuItem[]>(() =>
    Array.from(widgetRegistry.widgets().values()).map((widget) => ({
      type: widget.type,
      name: widget.name,
      icon: widget.icon,
    }))
  );

  const handleGridContextMenu: JSX.EventHandler<HTMLDivElement, MouseEvent> = (event) => {
    if (layout.isMobile() || immutablePreset()) return;
    // Only open the menu when right-clicking empty grid space — a right-click
    // landing on a widget cell should be free to do its own thing.
    const target = event.target as HTMLElement | null;
    if (target?.closest('.deck-cell')) return;
    if (!gridRef) return;

    event.preventDefault();

    const rect = gridRef.getBoundingClientRect();
    const { cols, rowHeight, gap } = getGridConfigFromElement(gridRef);
    const styles = window.getComputedStyle(gridRef);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const innerWidth =
      gridRef.clientWidth -
      paddingLeft -
      (parseFloat(styles.paddingRight) || 0);
    const cellWidth = (innerWidth - gap * (cols - 1)) / cols;
    const cellHeight = rowHeight + gap;
    if (!Number.isFinite(cellWidth) || cellWidth <= 0) return;

    const localX = event.clientX - rect.left + gridRef.scrollLeft - paddingLeft;
    const localY = event.clientY - rect.top + gridRef.scrollTop - paddingTop;

    const col = Math.max(0, Math.min(cols - 1, Math.floor(localX / (cellWidth + gap))));
    const row = Math.max(0, Math.floor(localY / cellHeight));

    setMenuState({ x: event.clientX, y: event.clientY, col, row });
  };

  const handleMenuSelect = (type: string) => {
    const state = menuState();
    setMenuState(null);
    if (!state) return;
    deck.addWidget(type, { col: state.col, row: state.row });
  };

  const dragPreviewValid = createMemo(() => {
    const drag = dragState();
    if (!drag) return true;
    const layout = deck.activeLayout();
    if (!layout) return true;
    return !hasCollision(drag.currentPosition, layout.widgets, drag.widgetId);
  });

  // Calculate actual rows needed (minimum 24 to fill one screen)
  const widgetRows = createMemo(() => {
    const ws = widgets();
    if (ws.length === 0) return DECK_DEFAULT_ROWS;
    let max = DECK_DEFAULT_ROWS;
    for (const w of ws) {
      const end = w.position.row + w.position.rowSpan;
      if (end > max) max = end;
    }
    return max;
  });

  // Include drag/resize preview so the canvas can grow (and become scrollable) during the interaction.
  const previewRows = createMemo(() => {
    let max = widgetRows();

    const drag = dragState();
    if (drag) {
      const end = drag.currentPosition.row + drag.currentPosition.rowSpan;
      if (end > max) max = end;
    }

    const resize = resizeState();
    if (resize) {
      const end = resize.currentPosition.row + resize.currentPosition.rowSpan;
      if (end > max) max = end;
    }

    return Math.max(DECK_DEFAULT_ROWS, max);
  });

  // Calculate dynamic row height based on container height
  // Formula: rowHeight = (containerHeight - padding * 2 - (DEFAULT_ROWS - 1) * gap) / DEFAULT_ROWS
  const rowHeight = createMemo(() => {
    const height = containerHeight();
    if (height <= 0) return DECK_MIN_ROW_HEIGHT;

    const availableHeight = height - DECK_PADDING * 2 - (DECK_DEFAULT_ROWS - 1) * DECK_GAP;
    const calculated = availableHeight / DECK_DEFAULT_ROWS;
    return Math.max(DECK_MIN_ROW_HEIGHT, calculated);
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
  const needsScroll = createMemo(() => {
    if (previewRows() > DECK_DEFAULT_ROWS) return true;
    if (containerHeight() <= 0) return false;

    // If the container is too short to fit 24 rows at the minimum row height, allow scrolling
    // instead of clipping content (e.g. small viewport / embedded container).
    const baseHeight = DECK_DEFAULT_ROWS * rowHeight() + (DECK_DEFAULT_ROWS - 1) * DECK_GAP + DECK_PADDING * 2;
    return baseHeight > containerHeight() + 1;
  });

  return (
    <div
      ref={gridRef}
      class={cn(
        'deck-grid relative w-full h-full overflow-x-hidden',
        // Only enable vertical scroll when content exceeds 24 rows
        needsScroll() ? 'overflow-y-scroll' : 'overflow-y-hidden',
        'grid p-1',
        showGridBackground() && 'bg-muted/20',
        props.class
      )}
      style={{
        'scrollbar-gutter': 'stable',
        'grid-template-columns': `repeat(${DECK_GRID_COLS}, 1fr)`,
        'grid-auto-rows': `${rowHeight()}px`,
        'gap': `${DECK_GAP}px`,
      }}
      data-grid-cols={DECK_GRID_COLS}
      data-row-height={rowHeight()}
      data-gap={DECK_GAP}
      data-default-rows={DECK_DEFAULT_ROWS}
      onContextMenu={handleGridContextMenu}
    >
      {/* Invisible placeholder to ensure minimum content height */}
      <div
        class="pointer-events-none"
        style={{
          'grid-column': '1 / -1',
          'grid-row': `1 / ${previewRows() + 1}`,
        }}
        aria-hidden="true"
      />

      {/* Grid background — always visible on desktop (autosave is always on). */}
      <Show when={showGridBackground()}>
        <div
          class="pointer-events-none z-0"
          style={{
            'grid-column': '1 / -1',
            'grid-row': `1 / ${previewRows() + 1}`,
            '--deck-grid-unit-x': `calc((100% - ${TOTAL_GAP_WIDTH}px) / ${DECK_GRID_COLS} + ${DECK_GAP}px)`,
            '--deck-grid-unit-y': `${rowHeight() + DECK_GAP}px`,
            // Fine grid + major gridlines every 6 / 12 cells (Grafana style)
            'background-image': [
              // Fine
              'linear-gradient(to right, color-mix(in srgb, var(--border) 35%, transparent) 1px, transparent 1px)',
              'linear-gradient(to bottom, color-mix(in srgb, var(--border) 35%, transparent) 1px, transparent 1px)',
              // Major (6)
              'linear-gradient(to right, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px)',
              'linear-gradient(to bottom, color-mix(in srgb, var(--border) 55%, transparent) 1px, transparent 1px)',
              // Major (12)
              'linear-gradient(to right, color-mix(in srgb, var(--border) 75%, transparent) 2px, transparent 2px)',
              'linear-gradient(to bottom, color-mix(in srgb, var(--border) 75%, transparent) 2px, transparent 2px)',
            ].join(', '),
            'background-size': [
              // Fine
              'var(--deck-grid-unit-x) var(--deck-grid-unit-y)',
              'var(--deck-grid-unit-x) var(--deck-grid-unit-y)',
              // Major (6)
              'calc(var(--deck-grid-unit-x) * 6) calc(var(--deck-grid-unit-y) * 6)',
              'calc(var(--deck-grid-unit-x) * 6) calc(var(--deck-grid-unit-y) * 6)',
              // Major (12)
              'calc(var(--deck-grid-unit-x) * 12) calc(var(--deck-grid-unit-y) * 12)',
              'calc(var(--deck-grid-unit-x) * 12) calc(var(--deck-grid-unit-y) * 12)',
            ].join(', '),
            'background-position': '0 0, 0 0, 0 0, 0 0, 0 0, 0 0',
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
              return drag.currentPosition;
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

          return (
            <DeckCell
              widget={widget}
              position={position()}
              isDragging={isDragging()}
              isResizing={isResizing()}
            />
          );
        }}
      </For>

      {props.children}

      <DeckContextMenu
        open={menuState() !== null}
        x={menuState()?.x ?? 0}
        y={menuState()?.y ?? 0}
        items={menuItems()}
        onSelect={handleMenuSelect}
        onDismiss={() => setMenuState(null)}
      />
    </div>
  );
}

export { DECK_GRID_CONFIG, getGridConfigFromElement };
