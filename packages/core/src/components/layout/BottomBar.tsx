import { Show, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';

export interface BottomBarProps {
  children?: JSX.Element;
  class?: string;
}

/**
 * Status bar at the bottom of the application
 */
export function BottomBar(props: BottomBarProps) {
  return (
    <footer
      class={cn(
        'h-6 shrink-0 flex items-center justify-between px-2',
        'bg-background border-t border-border',
        'text-xs text-muted-foreground font-mono',
        props.class
      )}
    >
      {props.children}
    </footer>
  );
}

/**
 * Bottom bar item
 */
export interface BottomBarItemProps {
  children: JSX.Element;
  icon?: JSX.Element;
  onClick?: () => void;
  class?: string;
}

export function BottomBarItem(props: BottomBarItemProps) {
  const baseClass = () => cn(
    'flex items-center gap-1 px-1.5 py-0.5 rounded',
    props.onClick && 'hover:bg-muted cursor-pointer',
    'transition-colors duration-100',
    props.class
  );

  return (
    <Show
      when={props.onClick}
      fallback={
        <span class={baseClass()}>
          <Show when={props.icon}>
            <span class="w-3 h-3">{props.icon}</span>
          </Show>
          {props.children}
        </span>
      }
    >
      <button
        type="button"
        class={baseClass()}
        onClick={() => props.onClick?.()}
      >
        <Show when={props.icon}>
          <span class="w-3 h-3">{props.icon}</span>
        </Show>
        {props.children}
      </button>
    </Show>
  );
}

/**
 * Status indicator dot
 */
export interface StatusIndicatorProps {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  label?: string;
}

export function StatusIndicator(props: StatusIndicatorProps) {
  const statusColors = {
    connected: 'bg-success',
    disconnected: 'bg-muted-foreground',
    connecting: 'bg-warning animate-pulse',
    error: 'bg-error',
  };

  const statusLabels = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    connecting: 'Connecting',
    error: 'Error',
  };

  return (
    <BottomBarItem>
      <span class={cn('w-2 h-2 rounded-full', statusColors[props.status])} />
      <span>{props.label ?? statusLabels[props.status]}</span>
    </BottomBarItem>
  );
}
