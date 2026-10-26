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

  // Create a fresh subtree for each branch. Reusing one DOM node across the
  // plain-button and tooltip-wrapped branches can break when responsive callers
  // toggle `tooltip` during mount.
  const renderButton = () => (
    <button
      type="button"
      class={cn(
        'inline-flex items-center justify-center',
        'w-[var(--floe-control-height-md)] h-[var(--floe-control-height-md)]',
        'rounded-control cursor-pointer',
        'text-[var(--floe-ink-soft)] hover:bg-[var(--floe-state-hover)]',
        'active:bg-[var(--floe-state-press)]',
        'transition-[background-color,color] duration-[var(--floe-duration-fast)] ease-[var(--floe-ease-out)]',
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
    <Show when={local.tooltip !== false} fallback={renderButton()}>
      <Tooltip
        content={local.tooltip ?? local.label}
        placement={local.tooltipPlacement ?? 'bottom'}
        delay={local.tooltipDelay ?? 0}
      >
        {renderButton()}
      </Tooltip>
    </Show>
  );
}
