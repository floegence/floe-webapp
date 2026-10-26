import { Show, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';
import { useCommand } from '../../context/CommandContext';
import { Search } from '../icons';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';

export interface TopBarProps {
  logo?: JSX.Element;
  title?: string;
  actions?: JSX.Element;
  ariaLabel?: string;
  class?: string;
}

/**
 * Top command bar with logo, search trigger, and actions
 */
export function TopBar(props: TopBarProps) {
  const command = useCommand();
  const floe = useResolvedFloeConfig();
  const paletteEnabled = () => floe.config.commands.palette.enabled;

  return (
    <header
      data-floe-shell-slot="top-bar"
      class={cn(
        // Safe-area padding must not be applied on a fixed-height element (border-box),
        // otherwise the content gets squeezed on iOS notch devices.
        'shrink-0 bg-background border-b border-[var(--floe-line)] safe-top safe-left safe-right',
        props.class
      )}
      style={{ 'background-color': 'var(--activity-bar)', 'border-bottom-color': 'var(--top-bar-border)' }}
      aria-label={props.ariaLabel}
    >
      <div class="h-10 flex items-center gap-2 px-3">
        {/* Logo */}
        <div class="flex items-center gap-2 flex-shrink-0">
          {props.logo || (
            <div class="w-6 h-6 rounded-xs bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              F
            </div>
          )}
          <Show when={props.title}>
            <span class="font-medium text-caption tracking-tight hidden sm:inline">{props.title}</span>
          </Show>
        </div>

        {/* Search / Command Palette Trigger */}
        <button
          type="button"
          disabled={!paletteEnabled()}
          class={cn(
            'flex-1 max-w-sm flex items-center gap-2 h-[26px] px-2.5',
            paletteEnabled() ? 'cursor-pointer' : 'cursor-not-allowed',
            'text-caption text-[var(--floe-ink-soft)] tracking-tight',
            'bg-[var(--floe-well)] hover:bg-[var(--floe-well-strong)] rounded-control',
            'border border-[var(--floe-line)]',
            'transition-[background-color,border-color,color] duration-[var(--floe-duration-fast)] ease-[var(--floe-ease-in-out)]',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            !paletteEnabled() && 'opacity-50 hover:bg-transparent'
          )}
          onClick={() => paletteEnabled() && command.open()}
        >
          <Search class="w-3 h-3 shrink-0" />
          <span class="flex-1 text-left hidden sm:inline truncate">{floe.config.strings.topBar.searchPlaceholder}</span>
          <Show when={paletteEnabled()}>
            <kbd class="hidden md:inline text-caption px-1 py-0.5 rounded-xs bg-background/60 border border-[var(--floe-line)] font-mono shrink-0 leading-none">
              {command.getKeybindDisplay(floe.config.commands.palette.keybind)}
            </kbd>
          </Show>
        </button>

        {/* Actions */}
        <div class="flex items-center gap-0.5">{props.actions}</div>
      </div>
    </header>
  );
}
