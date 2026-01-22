import { Show, For, createEffect, onCleanup, createMemo, createSignal } from 'solid-js';
import { Portal, Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useCommand, type Command } from '../../context/CommandContext';
import { Search } from '../icons';

/**
 * Command palette / search modal
 */
export function CommandPalette() {
  const command = useCommand();
  let inputRef: HTMLInputElement | undefined;
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  // Focus input when opened
  createEffect(() => {
    if (command.isOpen() && inputRef) {
      inputRef.focus();
      setSelectedIndex(0);
    }
  });

  // Reset selection when search changes
  createEffect(() => {
    command.search();
    setSelectedIndex(0);
  });

  // Keyboard navigation
  createEffect(() => {
    if (!command.isOpen()) return;

    const handleKeydown = (e: KeyboardEvent) => {
      const filtered = command.filteredCommands();

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[selectedIndex()]) {
            command.execute(filtered[selectedIndex()].id);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeydown);
    onCleanup(() => window.removeEventListener('keydown', handleKeydown));
  });

  // Prevent body scroll
  createEffect(() => {
    if (command.isOpen()) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    onCleanup(() => {
      document.body.style.overflow = '';
    });
  });

  const groupedCommands = createMemo(() => {
    const filtered = command.filteredCommands();
    const groups = new Map<string, Array<{ cmd: Command; index: number }>>();

    filtered.forEach((cmd, index) => {
      const category = cmd.category ?? 'Commands';
      const group = groups.get(category);
      if (group) {
        group.push({ cmd, index });
      } else {
        groups.set(category, [{ cmd, index }]);
      }
    });

    return Array.from(groups.entries());
  });

  return (
    <Show when={command.isOpen()}>
      <Portal>
        {/* Backdrop */}
        <div
          class="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => command.close()}
        />

        {/* Palette */}
        <div
          class={cn(
            'fixed left-1/2 top-[20%] z-50 -translate-x-1/2',
            'w-full max-w-xl',
            'bg-popover text-popover-foreground rounded-lg shadow-2xl',
            'border border-border',
            'animate-in fade-in slide-in-from-top-4',
            'overflow-hidden'
          )}
        >
          {/* Search input */}
          <div class="flex items-center gap-3 px-4 pt-1 border-b border-border">
            <Search class="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              class={cn(
                'flex-1 h-12 bg-transparent text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none'
              )}
              value={command.search()}
              onInput={(e) => command.setSearch(e.currentTarget.value)}
            />
            <kbd class="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted font-mono">
              esc
            </kbd>
          </div>

          {/* Results */}
          <div class="max-h-80 overflow-y-auto py-2">
            <Show
              when={command.filteredCommands().length > 0}
              fallback={
                <div class="px-4 py-8 text-center text-sm text-muted-foreground">
                  No commands found
                </div>
              }
            >
              <For each={groupedCommands()}>
                {([category, commands]) => (
                  <div>
                    <div class="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {category}
                    </div>
                    <For each={commands}>
                      {(entry) => {
                        return (
                          <button
                            type="button"
                            class={cn(
                              'w-full flex items-center gap-3 px-4 py-2 text-sm',
                              'transition-colors duration-75',
                              'focus:outline-none',
                              selectedIndex() === entry.index
                                ? 'bg-accent text-accent-foreground'
                                : 'hover:bg-accent/50'
                            )}
                            onClick={() => command.execute(entry.cmd.id)}
                            onMouseEnter={() => setSelectedIndex(entry.index)}
                          >
                            <Show when={entry.cmd.icon}>
                              <span class="w-5 h-5 flex items-center justify-center text-muted-foreground">
                                <Dynamic component={entry.cmd.icon} class="w-5 h-5" />
                              </span>
                            </Show>
                            <div class="flex-1 text-left">
                              <span>{entry.cmd.title}</span>
                              <Show when={entry.cmd.description}>
                                <span class="ml-2 text-muted-foreground text-xs">
                                  {entry.cmd.description}
                                </span>
                              </Show>
                            </div>
                            <Show when={entry.cmd.keybind}>
                              <kbd class="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted font-mono">
                                {command.getKeybindDisplay(entry.cmd.keybind!)}
                              </kbd>
                            </Show>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
