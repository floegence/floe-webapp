import { For, Show, type Component } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { Plus } from '../icons';

export interface DeckContextMenuItem {
  type: string;
  name: string;
  icon?: Component<{ class?: string }>;
}

export interface DeckContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  items: readonly DeckContextMenuItem[];
  onSelect: (type: string) => void;
  onDismiss: () => void;
}

/**
 * Right-click context menu for the Deck grid.
 * Shows when the user right-clicks empty grid space, offering to create
 * a widget of any registered type at the clicked cell.
 */
export function DeckContextMenu(props: DeckContextMenuProps) {
  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="fixed inset-0 z-[9998]"
          onClick={() => props.onDismiss()}
          onContextMenu={(event) => {
            event.preventDefault();
            props.onDismiss();
          }}
        />
        <div
          role="menu"
          class={cn(
            'fixed z-[9999] min-w-[180px] max-h-[320px] overflow-y-auto',
            'bg-popover border border-[var(--floe-line)] rounded-md shadow-[var(--floe-elevation-float-strong)]',
            'animate-in fade-in slide-in-from-top-1 duration-[var(--floe-duration-fast)]',
            'p-1'
          )}
          style={{
            top: `${props.y}px`,
            left: `${props.x}px`,
          }}
        >
          <div class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--floe-ink-quiet)] flex items-center gap-1.5">
            <Plus class="w-2.5 h-2.5" />
            Add widget here
          </div>
          <Show
            when={props.items.length > 0}
            fallback={
              <div class="px-3 py-3 text-xs text-[var(--floe-ink-soft)] text-center">
                No widgets registered
              </div>
            }
          >
            <For each={props.items}>
              {(item) => (
                <button
                  type="button"
                  role="menuitem"
                  class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[var(--floe-state-hover)] transition-colors text-left cursor-pointer"
                  onClick={() => {
                    props.onSelect(item.type);
                  }}
                >
                  <Show
                    when={item.icon}
                    fallback={<div class="w-4 h-4 flex-shrink-0" />}
                  >
                    {(Icon) => {
                      const IconComponent = Icon();
                      return <IconComponent class="w-4 h-4 text-[var(--floe-ink-soft)] flex-shrink-0" />;
                    }}
                  </Show>
                  <span class="text-xs text-foreground">{item.name}</span>
                </button>
              )}
            </For>
          </Show>
        </div>
      </Portal>
    </Show>
  );
}
