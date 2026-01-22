import { Show, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';
import { useDeck, type DeckWidget } from '../../context/DeckContext';
import type { WidgetDefinition } from '../../context/WidgetRegistry';
import { GripVertical, X } from '../icons';
import { WidgetResizeHandle } from './WidgetResizeHandle';
import { WidgetTypeSwitcher } from './WidgetTypeSwitcher';

export interface WidgetFrameProps {
  widget: DeckWidget;
  widgetDef?: WidgetDefinition;
  isDragging?: boolean;
  isResizing?: boolean;
  children: JSX.Element;
}

/**
 * Widget chrome with header, drag handle, and resize handles
 */
export function WidgetFrame(props: WidgetFrameProps) {
  const deck = useDeck();
  const editMode = () => deck.editMode();

  const title = () => props.widget.title ?? props.widgetDef?.name ?? props.widget.type;

  const handleRemove = (e: MouseEvent) => {
    // Stop propagation to prevent drag from starting
    e.stopPropagation();
    e.preventDefault();
    deck.removeWidget(props.widget.id);
  };

  return (
    <div class="h-full flex flex-col">
      {/* Header - no longer a drag handle, entire cell handles drag */}
      <div
        class={cn(
          'widget-header flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30',
          'select-none'
        )}
      >
        {/* Drag indicator icon (edit mode only) - visual only */}
        <Show when={editMode()}>
          <div class="text-muted-foreground/50">
            <GripVertical class="w-3.5 h-3.5" />
          </div>
        </Show>

        {/* Icon */}
        <Show when={props.widgetDef?.icon}>
          {(Icon) => {
            const IconComponent = Icon();
            return <IconComponent class="w-3.5 h-3.5 text-muted-foreground" />;
          }}
        </Show>

        {/* Title */}
        <span class="flex-1 text-xs font-medium text-foreground truncate">{title()}</span>

        {/* Widget type switcher (edit mode only) */}
        <Show when={editMode()}>
          <WidgetTypeSwitcher widget={props.widget} />
        </Show>

        {/* Remove button (edit mode only) - needs pointer-events to work */}
        <Show when={editMode()}>
          <button
            class="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer pointer-events-auto"
            onClick={handleRemove}
            title="Remove widget"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </Show>
      </div>

      {/* Content */}
      <div class="flex-1 min-h-0 overflow-auto">{props.children}</div>

      {/* Resize handles (edit mode only) */}
      <Show when={editMode()}>
        <WidgetResizeHandle widget={props.widget} edge="e" />
        <WidgetResizeHandle widget={props.widget} edge="s" />
        <WidgetResizeHandle widget={props.widget} edge="se" />
        <WidgetResizeHandle widget={props.widget} edge="w" />
        <WidgetResizeHandle widget={props.widget} edge="n" />
        <WidgetResizeHandle widget={props.widget} edge="sw" />
        <WidgetResizeHandle widget={props.widget} edge="ne" />
        <WidgetResizeHandle widget={props.widget} edge="nw" />
      </Show>
    </div>
  );
}
