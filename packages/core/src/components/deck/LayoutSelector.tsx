import { For, Show, createSignal } from 'solid-js';
import { cn } from '../../utils/cn';
import { useDeck } from '../../context/DeckContext';
import { deferNonBlocking } from '../../utils/defer';
import { ChevronDown, Check, Trash, Copy, Pencil } from '../icons';

export interface LayoutSelectorProps {
  class?: string;
}

/**
 * Dropdown to switch between deck layouts
 */
export function LayoutSelector(props: LayoutSelectorProps) {
  const deck = useDeck();

  const [isOpen, setIsOpen] = createSignal(false);
  const [isRenaming, setIsRenaming] = createSignal<string | null>(null);
  const [renameValue, setRenameValue] = createSignal('');

  const activeLayout = () => deck.activeLayout();
  const layouts = () => deck.layouts();

  const handleSelect = (id: string) => {
    setIsOpen(false);
    // Close UI first, then mutate deck state.
    deferNonBlocking(() => deck.setActiveLayout(id));
  };

  const handleDuplicate = (id: string, e: Event) => {
    e.stopPropagation();
    const wsLayout = layouts().find((l) => l.id === id);
    if (wsLayout) {
      setIsOpen(false);
      // Close UI first, then mutate deck state.
      deferNonBlocking(() => deck.duplicateLayout(id, `${wsLayout.name} (Copy)`));
      return;
    }
    setIsOpen(false);
  };

  const handleDelete = (id: string, e: Event) => {
    e.stopPropagation();
    setIsOpen(false);
    // Close UI first, then mutate deck state.
    deferNonBlocking(() => deck.deleteLayout(id));
  };

  const startRename = (id: string, currentName: string, e: Event) => {
    e.stopPropagation();
    setIsRenaming(id);
    setRenameValue(currentName);
  };

  const confirmRename = (id: string) => {
    const value = renameValue().trim();
    setIsRenaming(null);
    setRenameValue('');
    if (value) {
      // Close UI first, then mutate deck state.
      deferNonBlocking(() => deck.renameLayout(id, value));
    }
  };

  const cancelRename = () => {
    setIsRenaming(null);
    setRenameValue('');
  };

  return (
    <div class={cn('relative', props.class)}>
      {/* Trigger button */}
      <button
        class={cn(
          'flex items-center gap-1 px-1.5 h-5 rounded',
          'hover:bg-muted/50 transition-colors text-[10px] cursor-pointer',
          isOpen() && 'bg-muted/50'
        )}
        onClick={() => setIsOpen(!isOpen())}
      >
        <span class="truncate max-w-[80px] text-muted-foreground/80 font-medium">{activeLayout()?.name ?? 'Layout'}</span>
        <ChevronDown
          class={cn('w-2.5 h-2.5 text-muted-foreground/50 transition-transform', isOpen() && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      <Show when={isOpen()}>
        <div
          class="absolute top-full left-0 mt-1 w-48 bg-popover border border-border/60 rounded shadow-lg z-50 overflow-hidden"
        >
          <div class="max-h-48 overflow-y-auto py-0.5">
            <For each={layouts()}>
              {(wsLayout) => {
                const isActive = () => wsLayout.id === deck.activeLayoutId();
                const isRenamingThis = () => isRenaming() === wsLayout.id;

                return (
                  <div
                    class={cn(
                      'flex items-center gap-1.5 px-1.5 py-1 hover:bg-muted/60 transition-colors cursor-pointer group',
                      isActive() && 'bg-muted/60'
                    )}
                    onClick={() => !isRenamingThis() && handleSelect(wsLayout.id)}
                  >
                    {/* Check icon for active */}
                    <div class="w-3 h-3 flex-shrink-0">
                      <Show when={isActive()}>
                        <Check class="w-3 h-3 text-primary" />
                      </Show>
                    </div>

                    {/* Name or rename input */}
                    <Show
                      when={!isRenamingThis()}
                      fallback={
                        <input
                          type="text"
                          class="flex-1 text-[10px] bg-background border border-border rounded px-1 py-0.5"
                          value={renameValue()}
                          onInput={(e) => setRenameValue(e.currentTarget.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmRename(wsLayout.id);
                            if (e.key === 'Escape') cancelRename();
                          }}
                          onBlur={() => confirmRename(wsLayout.id)}
                          autofocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    >
                      <span class="flex-1 text-[10px] truncate text-foreground/80">
                        {wsLayout.name}
                        {wsLayout.isPreset && (
                          <span class="ml-1 text-[9px] text-muted-foreground/60">(preset)</span>
                        )}
                      </span>
                    </Show>

                    {/* Actions */}
                    <Show when={!isRenamingThis()}>
                      <div class="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          class="p-0.5 rounded hover:bg-background transition-colors cursor-pointer"
                          onClick={(e) => handleDuplicate(wsLayout.id, e)}
                          title="Duplicate"
                        >
                          <Copy class="w-2.5 h-2.5 text-muted-foreground/70" />
                        </button>
                        <Show when={!wsLayout.isPreset}>
                          <button
                            class="p-0.5 rounded hover:bg-background transition-colors cursor-pointer"
                            onClick={(e) => startRename(wsLayout.id, wsLayout.name, e)}
                            title="Rename"
                          >
                            <Pencil class="w-2.5 h-2.5 text-muted-foreground/70" />
                          </button>
                          <button
                            class="p-0.5 rounded hover:bg-destructive/10 transition-colors cursor-pointer"
                            onClick={(e) => handleDelete(wsLayout.id, e)}
                            title="Delete"
                          >
                            <Trash class="w-2.5 h-2.5 text-destructive/70" />
                          </button>
                        </Show>
                      </div>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>

          {/* Create new layout */}
          <div class="border-t border-border/40 px-1.5 py-1">
            <button
              class="w-full text-left text-[10px] text-primary/80 hover:text-primary cursor-pointer"
              onClick={() => {
                setIsOpen(false);
                // Close UI first, then mutate deck state.
                deferNonBlocking(() => deck.createLayout('New Layout'));
              }}
            >
              + New Layout
            </button>
          </div>
        </div>

        {/* Backdrop */}
        <div class="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      </Show>
    </div>
  );
}
