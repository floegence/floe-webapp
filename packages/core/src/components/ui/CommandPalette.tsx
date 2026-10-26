import { Show, For, createEffect, createMemo, createSignal } from 'solid-js';
import { Portal, Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { useCommand, type Command } from '../../context/CommandContext';
import { Search } from '../icons';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';
import { useOverlayMask } from '../../hooks/useOverlayMask';
import { matchKeybind } from '../../utils/keybind';
import { createFloatingPresence } from './floatingPresence';

/**
 * Command palette / search modal
 */
export interface CommandPaletteProps {
  /** Optional global stacking layer shared by the backdrop and palette panel. */
  zIndex?: number;
}

const KBD =
  'px-1.5 py-0.5 rounded-[var(--floe-radius-xs)] border border-[var(--floe-line)] ' +
  'bg-[var(--floe-well)] text-[var(--floe-ink-quiet)] ' +
  'text-[length:var(--floe-type-caption)] font-mono leading-none';

export function CommandPalette(props: CommandPaletteProps = {}) {
  const command = useCommand();
  const floe = useResolvedFloeConfig();
  let inputRef: HTMLInputElement | undefined;
  let rootRef: HTMLDivElement | undefined;
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const palettePresence = createFloatingPresence({
    open: command.isOpen,
    element: () => rootRef,
  });

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
    autoFocus: { selector: 'input' },
    restoreFocus: true,
  });

  // Reset selection when search changes
  createEffect(() => {
    if (!command.isOpen()) return;
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
    <Show when={palettePresence.mounted()}>
      <Portal>
        {/* Backdrop */}
        <div
          class={cn(
            'fixed inset-0 bg-[color-mix(in_srgb,var(--background)_62%,transparent)] backdrop-blur-[2px]',
            'floe-floating-presence floe-floating-backdrop',
            props.zIndex === undefined && 'z-50'
          )}
          style={{ 'z-index': props.zIndex }}
          data-floating-presence={palettePresence.state()}
          aria-hidden={palettePresence.exiting() ? 'true' : undefined}
          onClick={() => command.close()}
        />

        {/* Palette */}
        <div
          ref={rootRef}
          class={cn(
            'fixed left-1/2 top-[20%] -translate-x-1/2',
            props.zIndex === undefined && 'z-50',
            'w-full max-w-xl',
            'bg-popover text-popover-foreground',
            'rounded-[var(--floe-radius-panel)]',
            'border border-[var(--floe-line)]',
            'shadow-[var(--floe-elevation-float-strong)]',
            'floe-floating-presence floe-floating-dialog-panel',
            'overflow-hidden'
          )}
          style={{ 'z-index': props.zIndex }}
          data-floe-surface="floating"
          data-floating-presence={palettePresence.state()}
          aria-hidden={palettePresence.exiting() ? 'true' : undefined}
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div
            data-floe-input-surface
            class="flex items-center gap-3 px-4 border-b border-[var(--floe-line)]"
          >
            <Search class="w-4 h-4 text-[var(--floe-ink-quiet)] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder={floe.config.strings.commandPalette.placeholder}
              class={cn(
                'flex-1 h-12 bg-transparent',
                'text-[length:var(--floe-type-body)] leading-[var(--floe-line-body)]',
                'placeholder:text-[var(--floe-ink-ghost)]',
                'focus:outline-none'
              )}
              value={command.search()}
              onInput={(e) => command.setSearch(e.currentTarget.value)}
            />
            <kbd class={KBD}>{floe.config.strings.commandPalette.esc}</kbd>
          </div>

          {/* Results */}
          <div class="max-h-80 overflow-y-auto overscroll-contain py-2">
            <Show
              when={command.filteredCommands().length > 0}
              fallback={
                <div class="px-4 py-10 text-center text-[length:var(--floe-type-supporting)] text-[var(--floe-ink-soft)]">
                  {floe.config.strings.commandPalette.empty}
                </div>
              }
            >
              <For each={groupedCommands()}>
                {([category, commands]) => (
                  <div>
                    <div class="px-3 pt-3 pb-1 text-[length:var(--floe-type-caption)] font-semibold uppercase tracking-[0.06em] text-[var(--floe-ink-quiet)]">
                      {category}
                    </div>
                    <For each={commands}>
                      {(entry) => {
                        return (
                          <button
                            type="button"
                            class={cn(
                              'w-full flex items-center gap-3 px-3 mx-1 rounded-[var(--floe-radius-md)]',
                              'min-h-[var(--floe-row-height)] cursor-pointer',
                              'text-[length:var(--floe-type-control)] leading-[var(--floe-line-control)]',
                              'text-[var(--floe-ink-soft)] hover:text-foreground',
                              'focus:outline-none',
                              selectedIndex() === entry.index &&
                                'bg-[var(--floe-state-selected)] text-foreground'
                            )}
                            onClick={() => command.execute(entry.cmd.id)}
                            onMouseEnter={() => setSelectedIndex(entry.index)}
                          >
                            <Show when={entry.cmd.icon}>
                              <span class="w-4 h-4 flex items-center justify-center text-[var(--floe-ink-quiet)]">
                                <Dynamic component={entry.cmd.icon} class="w-4 h-4" />
                              </span>
                            </Show>
                            <div class="flex-1 text-left">
                              <span>{entry.cmd.title}</span>
                              <Show when={entry.cmd.description}>
                                <span class="ml-2 text-[length:var(--floe-type-caption)] text-[var(--floe-ink-quiet)]">
                                  {entry.cmd.description}
                                </span>
                              </Show>
                            </div>
                            <Show when={entry.cmd.keybind}>
                              <kbd class={KBD}>{command.getKeybindDisplay(entry.cmd.keybind!)}</kbd>
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
