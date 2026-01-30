import { Show, type JSX, createSignal, createEffect, For, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useDeck } from '../../context/DeckContext';
import { useLayout } from '../../context/LayoutContext';
import { useWidgetRegistry } from '../../context/WidgetRegistry';
import { deferNonBlocking } from '../../utils/defer';
import { LayoutSelector } from './LayoutSelector';
import { Pencil, Check, Plus, ChevronDown } from '../icons';

export interface DeckTopBarProps {
  class?: string;
  actions?: JSX.Element;
}

/**
 * Deck header with edit mode toggle and layout selector
 */
export function DeckTopBar(props: DeckTopBarProps) {
  const deck = useDeck();
  const layout = useLayout();
  const widgetRegistry = useWidgetRegistry();

  const [showWidgetMenu, setShowWidgetMenu] = createSignal(false);
  const [menuPosition, setMenuPosition] = createSignal({ top: 0, left: 0 });
  let triggerRef: HTMLButtonElement | undefined;

  const isMobile = () => layout.isMobile();

  const handleAddWidget = (e: MouseEvent, type: string) => {
    e.stopPropagation();
    e.preventDefault();
    setShowWidgetMenu(false);
    // Close UI first, then mutate deck state.
    deferNonBlocking(() => deck.addWidget(type));
  };

  const handleToggle = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!showWidgetMenu() && triggerRef) {
      const rect = triggerRef.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setShowWidgetMenu((prev) => !prev);
  };

  const handleClose = () => {
    setShowWidgetMenu(false);
  };

  // Only add escape key listener when dropdown is open
  createEffect(() => {
    if (!showWidgetMenu()) return;
    if (typeof document === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowWidgetMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
  });

  return (
    <div
      class={cn(
        'deck-topbar flex items-center gap-1.5 h-7 px-2',
        'bg-gradient-to-b from-background to-background/95',
        'border-b border-border/30',
        props.class
      )}
    >
      {/* Layout selector */}
      <LayoutSelector />

      {/* Separator */}
      <div class="w-px h-3.5 bg-border/40" />

      {/* Add Widget button (edit mode only) */}
      <Show when={deck.editMode()}>
        <button
          ref={triggerRef}
          onClick={handleToggle}
          class={cn(
            'flex items-center gap-1 px-1.5 h-5 rounded text-[10px]',
            'text-muted-foreground/70 hover:text-foreground hover:bg-muted/50',
            'transition-colors cursor-pointer'
          )}
        >
          <Plus class="w-2.5 h-2.5" />
          <span>Add</span>
          <ChevronDown class={cn('w-2.5 h-2.5 opacity-50 transition-transform', showWidgetMenu() && 'rotate-180')} />
        </button>

        {/* Portal dropdown to body */}
        <Show when={showWidgetMenu()}>
          <Portal>
            {/* Backdrop */}
            <div
              class="fixed inset-0 z-[9998]"
              onClick={handleClose}
            />

            {/* Widget dropdown menu */}
            <div
              class={cn(
                'fixed z-[9999]',
                'min-w-[180px] max-h-[300px] overflow-y-auto',
                'bg-popover border border-border rounded-md shadow-xl',
                'animate-in fade-in slide-in-from-top-1 duration-150'
              )}
              style={{
                top: `${menuPosition().top}px`,
                left: `${Math.max(8, menuPosition().left)}px`,
              }}
            >
              <div class="p-1">
                <For each={Array.from(widgetRegistry.widgets().values())}>
                  {(widget) => (
                    <button
                      class="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-muted transition-colors text-left cursor-pointer"
                      onClick={(e) => handleAddWidget(e, widget.type)}
                    >
                      <Show when={widget.icon} fallback={<div class="w-4 h-4" />}>
                        {(Icon) => {
                          const IconComponent = Icon();
                          return <IconComponent class="w-4 h-4 text-muted-foreground" />;
                        }}
                      </Show>
                      <span class="text-xs">{widget.name}</span>
                    </button>
                  )}
                </For>

                {/* Empty state */}
                <Show when={widgetRegistry.widgets().size === 0}>
                  <div class="px-3 py-4 text-xs text-muted-foreground text-center">
                    No widgets available
                  </div>
                </Show>
              </div>
            </div>
          </Portal>
        </Show>
      </Show>

      {/* Spacer */}
      <div class="flex-1" />

      {/* Edit mode toggle (desktop only) */}
      <Show when={!isMobile()}>
        <button
          onClick={() => deck.toggleEditMode()}
          class={cn(
            'flex items-center gap-1 px-1.5 h-5 rounded text-[10px] transition-colors cursor-pointer',
            deck.editMode()
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Show
            when={deck.editMode()}
            fallback={
              <>
                <Pencil class="w-2.5 h-2.5" />
                <span>Edit</span>
              </>
            }
          >
            <Check class="w-2.5 h-2.5" />
            <span>Done</span>
          </Show>
        </button>
      </Show>

      {/* Custom actions */}
      {props.actions}
    </div>
  );
}
