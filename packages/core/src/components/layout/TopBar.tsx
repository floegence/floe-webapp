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
      <div class="h-12 flex items-center gap-4 px-4">
        {/* Logo */}
        <div class="flex items-center gap-2 flex-shrink-0">
          {props.logo || (
            <div class="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              F
            </div>
          )}
          <Show when={props.title}>
            <span class="font-semibold text-sm hidden sm:inline">{props.title}</span>
          </Show>
        </div>

        {/* Search / Command Palette Trigger */}
        <button
          type="button"
          class={cn(
            'flex-1 max-w-md flex items-center gap-2 h-8 px-3',
            'text-sm text-muted-foreground',
            'bg-muted/50 hover:bg-muted rounded-md',
            'border border-transparent hover:border-border',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          onClick={() => command.open()}
        >
          <Search class="w-4 h-4" />
          <span class="flex-1 text-left hidden sm:inline">Search commands...</span>
          <kbd class="hidden md:inline text-xs px-1.5 py-0.5 rounded bg-background border border-border font-mono">
            {command.getKeybindDisplay('mod+k')}
          </kbd>
        </button>

        {/* Actions */}
        <div class="flex items-center gap-2">{props.actions}</div>
      </div>
    </header>
  );
}
