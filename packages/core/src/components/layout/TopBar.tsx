import { Show, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';
import { useCommand } from '../../context/CommandContext';
import { Search } from '../icons';

export interface TopBarProps {
  logo?: JSX.Element;
  title?: string;
  actions?: JSX.Element;
  class?: string;
}

/**
 * Top command bar with logo, search trigger, and actions
 */
export function TopBar(props: TopBarProps) {
  const command = useCommand();

  return (
    <header
      class={cn(
        // Safe-area padding must not be applied on a fixed-height element (border-box),
        // otherwise the content gets squeezed on iOS notch devices.
        'shrink-0 bg-background border-b border-border safe-top safe-left safe-right',
        props.class
      )}
    >
      <div class="h-10 flex items-center gap-3 px-3">
        {/* Logo */}
        <div class="flex items-center gap-2 flex-shrink-0">
          {props.logo || (
            <div class="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              F
            </div>
          )}
          <Show when={props.title}>
            <span class="font-medium text-xs hidden sm:inline">{props.title}</span>
          </Show>
        </div>

        {/* Search / Command Palette Trigger */}
        <button
          type="button"
          class={cn(
            'flex-1 max-w-sm flex items-center gap-2 h-7 px-2.5 cursor-pointer',
            'text-xs text-muted-foreground',
            'bg-muted/40 hover:bg-muted/70 rounded',
            'border border-transparent hover:border-border/50',
            'transition-colors duration-100',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
          )}
          onClick={() => command.open()}
        >
          <Search class="w-3.5 h-3.5 shrink-0" />
          <span class="flex-1 text-left hidden sm:inline truncate">Search commands...</span>
          <kbd class="hidden md:inline text-[10px] px-1 py-0.5 rounded bg-background/80 border border-border/50 font-mono shrink-0">
            {command.getKeybindDisplay('mod+k')}
          </kbd>
        </button>

        {/* Actions */}
        <div class="flex items-center gap-1">{props.actions}</div>
      </div>
    </header>
  );
}
