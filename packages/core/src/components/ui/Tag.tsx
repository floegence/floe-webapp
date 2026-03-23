import { splitProps, type Component, type JSX, type ParentProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';

export type TagVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type TagSize = 'sm' | 'md' | 'lg';
export type TagTone = 'solid' | 'soft';

export interface TagProps extends ParentProps<JSX.HTMLAttributes<HTMLSpanElement>> {
  variant?: TagVariant;
  size?: TagSize;
  tone?: TagTone;
  icon?: Component<{ class?: string }>;
  dot?: boolean;
}

export function Tag(props: TagProps) {
  const [local, rest] = splitProps(props, [
    'variant',
    'size',
    'tone',
    'icon',
    'dot',
    'class',
    'children',
  ]);

  return (
    <span
      class={cn(
        'floe-tag',
        `floe-tag--${local.variant ?? 'neutral'}`,
        `floe-tag--${local.size ?? 'md'}`,
        `floe-tag--${local.tone ?? 'solid'}`,
        local.class
      )}
      {...rest}
    >
      {local.dot && <span class="floe-tag__dot" aria-hidden="true" />}
      {local.icon && <Dynamic component={local.icon} class="floe-tag__icon" />}
      {local.children != null && <span class="floe-tag__label">{local.children}</span>}
    </span>
  );
}
