import { For, Show, createSignal, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useDeck, type DeckWidget } from '../../context/DeckContext';
import { useWidgetRegistry } from '../../context/WidgetRegistry';
import { deferNonBlocking } from '../../utils/defer';
import { ArrowRightLeft, ChevronDown } from '../icons';

export interface WidgetTypeSwitcherProps {
  widget: DeckWidget;
  class?: string;
}

/**
 * Dropdown for switching widget type while preserving position
 */
export function WidgetTypeSwitcher(props: WidgetTypeSwitcherProps) {
  const deck = useDeck();
  const widgetRegistry = useWidgetRegistry();

  const [isOpen, setIsOpen] = createSignal(false);
  const [menuPosition, setMenuPosition] = createSignal({ top: 0, left: 0 });
  let triggerRef: HTMLButtonElement | undefined;

  // Access widget type as a function to ensure reactivity
  const currentType = () => props.widget.type;

  const availableWidgets = () => {
    const all = Array.from(widgetRegistry.widgets().values());
    // Exclude current type
    return all.filter((w) => w.type !== currentType());
  };

  const handleSwitch = (e: MouseEvent, newType: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    // Close UI first, then mutate deck state.
    const widgetId = props.widget.id;
    const changeWidgetType = deck.changeWidgetType;
    deferNonBlocking(() => changeWidgetType(widgetId, newType));
  };

  const handleToggle = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isOpen() && triggerRef) {
      const rect = triggerRef.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 160, // Align right edge
      });
    }
    setIsOpen((prev) => !prev);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Only add escape key listener when dropdown is open
  createEffect(() => {
    if (!isOpen()) return;
    if (typeof document === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
  });

  return (
    <>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        class={cn(
          'p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground',
          'transition-colors cursor-pointer pointer-events-auto flex items-center gap-0.5',
          props.class
        )}
        onClick={handleToggle}
        title="Switch widget type"
      >
        <ArrowRightLeft class="w-3.5 h-3.5" />
        <ChevronDown class={cn('w-3 h-3 transition-transform', isOpen() && 'rotate-180')} />
      </button>

      {/* Portal dropdown to body */}
      <Show when={isOpen()}>
        <Portal>
          {/* Backdrop */}
          <div
            class="fixed inset-0 z-[9998]"
            onClick={handleClose}
          />

          {/* Dropdown menu */}
          <div
            class={cn(
              'fixed z-[9999]',
              'min-w-[160px] max-h-[240px] overflow-y-auto',
              'bg-popover border border-border rounded-md shadow-xl',
              'animate-in fade-in slide-in-from-top-1 duration-150'
            )}
            style={{
              top: `${menuPosition().top}px`,
              left: `${Math.max(8, menuPosition().left)}px`,
            }}
          >
            <div class="p-1">
              <div class="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                Switch to
              </div>
              <For each={availableWidgets()}>
                {(widget) => (
                  <button
                    class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors text-left cursor-pointer"
                    onClick={(e) => handleSwitch(e, widget.type)}
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
              <Show when={availableWidgets().length === 0}>
                <div class="px-2 py-3 text-xs text-muted-foreground text-center">
                  No other widget types available
                </div>
              </Show>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}
