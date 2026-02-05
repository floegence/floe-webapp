import { Show, For, createEffect, createMemo, createSignal } from 'solid-js';
import { Portal, Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useCommand, type Command } from '../../context/CommandContext';
import { Search } from '../icons';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';
import { useOverlayMask } from '../../hooks/useOverlayMask';
import { matchKeybind } from '../../utils/keybind';

/**
 * Command palette / search modal
 */
export function CommandPalette() {
  const command = useCommand();
  const floe = useResolvedFloeConfig();
  let inputRef: HTMLInputElement | undefined;
  let rootRef: HTMLDivElement | undefined;
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  useOverlayMask({
    open: command.isOpen,
    root: () => rootRef,
    onClose: () => command.close(),
    lockBodyScroll: true,
    trapFocus: true,
    closeOnEscape: true,
    blockHotkeys: true,
    // Prevent scroll bleed on the backdrop while keeping the results list scrollable.
    blockWheel: 'outside',
    blockTouchMove: 'outside',
    restoreFocus: true,
  });

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

  const handleKeyDown = (e: KeyboardEvent) => {
    // Mirror CommandContext behavior: allow the palette keybind to toggle/close while open.
    if (matchKeybind(e, floe.config.commands.palette.keybind)) {
      e.preventDefault();
      command.close();
      return;
    }

    const filtered = command.filteredCommands();

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const len = filtered.length;
        if (len <= 0) return;
        setSelectedIndex((i) => Math.max(0, Math.min(i + 1, len - 1)));
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const len = filtered.length;
        if (len <= 0) return;
        setSelectedIndex((i) => Math.max(0, Math.min(i - 1, len - 1)));
        break;
      }
      case 'Enter':
        e.preventDefault();
        if (filtered[selectedIndex()]) {
          command.execute(filtered[selectedIndex()].id);
        }
        break;
    }
  };

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
          ref={rootRef}
          class={cn(
            'fixed left-1/2 top-[20%] z-50 -translate-x-1/2',
            'w-full max-w-xl',
            'bg-popover text-popover-foreground rounded-lg shadow-2xl',
            'border border-border',
            'animate-in fade-in slide-in-from-top-4',
            'overflow-hidden'
          )}
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div class="flex items-center gap-3 px-4 pt-1 border-b border-border">
            <Search class="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder={floe.config.strings.commandPalette.placeholder}
              class={cn(
                'flex-1 h-12 bg-transparent text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none'
              )}
              value={command.search()}
              onInput={(e) => command.setSearch(e.currentTarget.value)}
            />
            <kbd class="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted font-mono">
              {floe.config.strings.commandPalette.esc}
            </kbd>
          </div>

          {/* Results */}
          <div class="max-h-80 overflow-y-auto overscroll-contain py-2">
            <Show
              when={command.filteredCommands().length > 0}
              fallback={
                <div class="px-4 py-8 text-center text-sm text-muted-foreground">
                  {floe.config.strings.commandPalette.empty}
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
                              'w-full flex items-center gap-3 px-4 py-2 text-sm cursor-pointer',
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
