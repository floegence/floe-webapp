import { Show, splitProps, type JSX } from 'solid-js';

import { cn } from '../../utils/cn';
import { Tooltip, type TooltipProps } from '../ui/Tooltip';

export interface TopBarIconButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** Used for aria-label and as the default tooltip content. */
  label: string;
  children: JSX.Element;
  /** Defaults to `label`. Set to `false` to disable the tooltip wrapper. */
  tooltip?: TooltipProps['content'] | false;
  tooltipPlacement?: TooltipProps['placement'];
  tooltipDelay?: number;
}

export function TopBarIconButton(props: TopBarIconButtonProps) {
  const [local, rest] = splitProps(props, [
    'label',
    'children',
    'tooltip',
    'tooltipPlacement',
    'tooltipDelay',
    'class',
    'disabled',
  ]);

  const btn = (
    <button
      type="button"
      class={cn(
        'inline-flex items-center justify-center',
        'w-8 h-8 rounded cursor-pointer',
        'hover:bg-muted/60 active:bg-muted/80 transition-colors',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset',
        'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
        local.class
      )}
      aria-label={local.label}
      disabled={local.disabled}
      {...rest}
    >
      {local.children}
    </button>
  );

  return (
    <Show when={local.tooltip !== false} fallback={btn}>
      <Tooltip
        content={local.tooltip ?? local.label}
        placement={local.tooltipPlacement ?? 'bottom'}
        delay={local.tooltipDelay ?? 0}
      >
        {btn}
      </Tooltip>
    </Show>
  );
}
