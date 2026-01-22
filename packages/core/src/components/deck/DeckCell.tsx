import { Show, createMemo, type Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useDeck, type DeckWidget } from '../../context/DeckContext';
import { useWidgetRegistry } from '../../context/WidgetRegistry';
import { positionToGridArea } from '../../utils/gridLayout';
import type { GridPosition } from '../../utils/gridCollision';
import { WidgetFrame } from './WidgetFrame';

export interface DeckCellProps {
  widget: DeckWidget;
  position: GridPosition;
  isDragging?: boolean;
  isResizing?: boolean;
  /** Pixel offset for smooth drag following */
  pixelOffset?: { x: number; y: number };
}

/**
 * Widget cell wrapper positioned via CSS grid-area
 */
export function DeckCell(props: DeckCellProps) {
  const deck = useDeck();
  const widgetRegistry = useWidgetRegistry();
  const editMode = () => deck.editMode();

  // Access widget type as a function to ensure reactivity
  const widgetType = () => props.widget.type;
  const widgetDef = createMemo(() => widgetRegistry.getWidget(widgetType()));
  const gridArea = createMemo(() => positionToGridArea(props.position));

  // Get the component to render - using a function ensures reactivity
  const WidgetComponent = () => {
    const def = widgetDef();
    return def?.component as Component<{ widgetId: string; config?: Record<string, unknown>; isEditMode?: boolean }> | undefined;
  };

  // Compute transform style for smooth drag
  const transformStyle = createMemo(() => {
    if (!props.isDragging || !props.pixelOffset) return {};
    const { x, y } = props.pixelOffset;
    if (x === 0 && y === 0) return {};
    return {
      transform: `translate(${x}px, ${y}px)`,
    };
  });

  return (
    <div
      class={cn(
        'deck-cell relative rounded-md overflow-hidden',
        'bg-card border border-border',
        // Smooth transition when not dragging (for snap-back animation)
        !props.isDragging && 'transition-transform duration-200 ease-out',
        props.isDragging && 'shadow-xl z-50 ring-2 ring-primary scale-[1.02]',
        props.isResizing && 'shadow-lg z-50 ring-2 ring-primary',
        editMode() && !props.isDragging && !props.isResizing && 'hover:ring-1 hover:ring-primary/50',
        // Edit mode: disable selection and show grab cursor
        editMode() && 'select-none cursor-grab',
        props.isDragging && 'cursor-grabbing'
      )}
      style={{
        'grid-area': gridArea(),
        ...transformStyle(),
      }}
      // In edit mode, entire cell is draggable
      data-widget-drag-handle={editMode() ? props.widget.id : undefined}
    >
      <WidgetFrame
        widget={props.widget}
        widgetDef={widgetDef()}
        isDragging={props.isDragging}
        isResizing={props.isResizing}
      >
        {/* Content wrapper - disable pointer events in edit mode */}
        <div class={cn('h-full', editMode() && 'pointer-events-none')}>
          <Show when={WidgetComponent()} fallback={<PlaceholderWidget type={widgetType()} />}>
            {/* Use Dynamic to properly re-render when component changes */}
            <Dynamic
              component={WidgetComponent()}
              widgetId={props.widget.id}
              config={props.widget.config}
              isEditMode={editMode()}
            />
          </Show>
        </div>
      </WidgetFrame>
    </div>
  );
}

function PlaceholderWidget(props: { type: string }) {
  return (
    <div class="h-full flex items-center justify-center text-muted-foreground text-xs">
      <span>Widget: {props.type}</span>
    </div>
  );
}
