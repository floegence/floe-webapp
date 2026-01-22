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
          'flex items-center gap-2 px-3 py-1.5 rounded-md border border-border',
          'hover:bg-muted transition-colors text-xs cursor-pointer',
          isOpen() && 'bg-muted'
        )}
        onClick={() => setIsOpen(!isOpen())}
      >
        <span class="truncate max-w-[120px]">{activeLayout()?.name ?? 'Select Layout'}</span>
        <ChevronDown
          class={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen() && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      <Show when={isOpen()}>
        <div
          class="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden"
        >
          <div class="max-h-64 overflow-y-auto py-1">
            <For each={layouts()}>
              {(wsLayout) => {
                const isActive = () => wsLayout.id === deck.activeLayoutId();
                const isRenamingThis = () => isRenaming() === wsLayout.id;

                return (
                  <div
                    class={cn(
                      'flex items-center gap-2 px-2 py-1.5 hover:bg-muted transition-colors cursor-pointer group',
                      isActive() && 'bg-muted'
                    )}
                    onClick={() => !isRenamingThis() && handleSelect(wsLayout.id)}
                  >
                    {/* Check icon for active */}
                    <div class="w-4 h-4 flex-shrink-0">
                      <Show when={isActive()}>
                        <Check class="w-4 h-4 text-primary" />
                      </Show>
                    </div>

                    {/* Name or rename input */}
                    <Show
                      when={!isRenamingThis()}
                      fallback={
                        <input
                          type="text"
                          class="flex-1 text-xs bg-background border border-border rounded px-1.5 py-0.5"
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
                      <span class="flex-1 text-xs truncate">
                        {wsLayout.name}
                        {wsLayout.isPreset && (
                          <span class="ml-1 text-[10px] text-muted-foreground">(preset)</span>
                        )}
                      </span>
                    </Show>

                    {/* Actions */}
                    <Show when={!isRenamingThis()}>
                      <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          class="p-1 rounded hover:bg-background transition-colors cursor-pointer"
                          onClick={(e) => handleDuplicate(wsLayout.id, e)}
                          title="Duplicate"
                        >
                          <Copy class="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <Show when={!wsLayout.isPreset}>
                          <button
                            class="p-1 rounded hover:bg-background transition-colors cursor-pointer"
                            onClick={(e) => startRename(wsLayout.id, wsLayout.name, e)}
                            title="Rename"
                          >
                            <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            class="p-1 rounded hover:bg-destructive/10 transition-colors cursor-pointer"
                            onClick={(e) => handleDelete(wsLayout.id, e)}
                            title="Delete"
                          >
                            <Trash class="w-3.5 h-3.5 text-destructive" />
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
          <div class="border-t border-border px-2 py-1.5">
            <button
              class="w-full text-left text-xs text-primary hover:underline cursor-pointer"
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
