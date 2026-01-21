import { type JSX } from 'solid-js';
import { cn } from '../../utils/cn';

export interface PanelProps {
  children: JSX.Element;
  class?: string;
}

/**
 * Generic panel container
 */
export function Panel(props: PanelProps) {
  return (
    <div
      class={cn(
        'flex flex-col h-full overflow-hidden',
        'bg-card text-card-foreground',
        props.class
      )}
    >
      {props.children}
    </div>
  );
}

/**
 * Panel header with title and actions
 */
export interface PanelHeaderProps {
  children: JSX.Element;
  actions?: JSX.Element;
  class?: string;
}

export function PanelHeader(props: PanelHeaderProps) {
  return (
    <div
      class={cn(
        'flex items-center justify-between px-3 py-2',
        'border-b border-border',
        'text-sm font-medium',
        props.class
      )}
    >
      <span class="truncate">{props.children}</span>
      {props.actions && <div class="flex items-center gap-1 ml-2">{props.actions}</div>}
    </div>
  );
}

/**
 * Panel content area with optional padding
 */
export interface PanelContentProps {
  children: JSX.Element;
  noPadding?: boolean;
  class?: string;
}

export function PanelContent(props: PanelContentProps) {
  return (
    <div
      class={cn(
        'flex-1 overflow-auto',
        !props.noPadding && 'p-3',
        props.class
      )}
    >
      {props.children}
    </div>
  );
}
