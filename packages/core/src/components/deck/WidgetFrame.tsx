import { Show, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';
import { useDeck, type DeckWidget } from '../../context/DeckContext';
import type { WidgetDefinition } from '../../context/WidgetRegistry';
import { useLayout } from '../../context/LayoutContext';
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
 * Widget chrome with header drag-handle and resize handles.
 *
 * The header is a persistent, always-on drag handle (notes-style): the grip
 * icon + title region carries `data-widget-drag-handle`, so dragging the
 * header moves the widget while the widget body stays fully interactive.
 * The widget body never blocks pointer events — autosave on every commit
 * means there's no "edit / done" toggle to gate interactions with.
 */
export function WidgetFrame(props: WidgetFrameProps) {
  const deck = useDeck();
  const layout = useLayout();

  const title = () => props.widget.title ?? props.widgetDef?.name ?? props.widget.type;

  // Drag / resize UI is only meaningful on desktop where pointers are precise.
  // On mobile, suppress it so the widget stays fully interactive.
  const interactive = () => !layout.isMobile();

  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    deck.removeWidget(props.widget.id);
  };

  return (
    <div class="h-full flex flex-col">
      {/* Header — four-way-arrow cursor on hover, grabbing while active. */}
      <div
        class={cn(
          'widget-header flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30',
          'select-none',
          interactive() && !props.isDragging && 'cursor-move',
          props.isDragging && 'cursor-grabbing'
        )}
        data-widget-drag-handle={interactive() ? props.widget.id : undefined}
      >
        <Show when={interactive()}>
          <div class="text-muted-foreground/50 pointer-events-none">
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

        {/* Widget type switcher — subtle unless the card is hovered. */}
        <Show when={interactive()}>
          <div class="opacity-0 group-hover:opacity-100 transition-opacity">
            <WidgetTypeSwitcher widget={props.widget} />
          </div>
        </Show>

        {/* Remove button — subtle unless the card is hovered. */}
        <Show when={interactive()}>
          <button
            class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
            onClick={handleRemove}
            title="Remove widget"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </Show>
      </div>

      {/* Content — always interactive. */}
      <div class="flex-1 min-h-0 overflow-auto">{props.children}</div>

      {/* Resize handles — always live on desktop, no edit-mode gate. */}
      <Show when={interactive()}>
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
