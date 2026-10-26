import { splitProps, type JSX, type Component, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { Loader2 } from '../icons';

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'ghost-destructive'
  | 'destructive';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: Component<{ class?: string }>;
}

/* Variants derive from the language's state ramp: ink for the one primary
 * action, a well for secondary, a hairline for outline, and a transparent
 * state layer for ghost. No variant carries a resting shadow, so a toolbar of
 * buttons sits flat on its bar and only the pressed/primary pair has weight. */
const variantStyles: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary)_92%,var(--primary-foreground))]',
  primary: 'bg-primary text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary)_92%,var(--primary-foreground))]',
  secondary: 'bg-[var(--floe-well)] text-foreground hover:bg-[var(--floe-well-strong)]',
  outline:
    'border border-[var(--floe-line-strong)] bg-transparent text-foreground hover:bg-[var(--floe-state-hover)] hover:border-[color-mix(in_srgb,var(--foreground)_26%,transparent)]',
  ghost: 'bg-transparent text-[var(--floe-ink-soft)] hover:bg-[var(--floe-state-hover)] hover:text-foreground',
  'ghost-destructive': 'bg-transparent text-[var(--floe-ink-soft)] hover:bg-[color-mix(in_srgb,var(--error)_12%,transparent)] hover:text-error',
  destructive: 'bg-error text-error-foreground hover:bg-[color-mix(in_srgb,var(--error)_88%,var(--foreground))]',
};

/* One control scale: 24 / 28 / 32 / 36. Radius is the language's control
 * radius for the two working sizes and steps down only at xs. */
const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-[var(--floe-control-height-xs)] px-2 text-[length:var(--floe-type-caption)] rounded-sm',
  sm: 'h-[var(--floe-control-height-sm)] px-2.5 text-[length:var(--floe-type-control)] rounded-md',
  md: 'h-[var(--floe-control-height-md)] px-3 text-[length:var(--floe-type-control)] rounded-control',
  lg: 'h-[var(--floe-control-height-lg)] px-3.5 text-[length:var(--floe-type-control)] rounded-control',
  icon: 'h-[var(--floe-control-height-md)] w-[var(--floe-control-height-md)] rounded-control',
};

const iconSizeStyles: Record<ButtonSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
  icon: 'w-4 h-4',
};

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    'variant',
    'size',
    'loading',
    'icon',
    'class',
    'children',
    'disabled',
  ]);

  const iconSize = () => iconSizeStyles[local.size ?? 'md'];

  return (
    <button
      type="button"
      data-floe-control="button"
      data-floe-surface={local.variant === 'ghost' || local.variant === 'ghost-destructive' || local.variant === 'outline' ? undefined : 'flat'}
      data-floe-surface-part="action"
      class={cn(
        'inline-flex min-w-max items-center justify-center gap-1.5 whitespace-nowrap font-medium cursor-pointer',
        'tracking-[var(--floe-tracking-normal)]',
        'transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-[var(--floe-duration-fast)] ease-[var(--floe-ease-out)]',
        'active:scale-[var(--floe-press-scale)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--floe-plane)]',
        'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[local.variant ?? 'default'],
        sizeStyles[local.size ?? 'md'],
        local.class
      )}
      disabled={local.disabled || local.loading}
      aria-busy={local.loading || undefined}
      {...rest}
    >
      <Show when={local.icon || 'loading' in props}>
        <span aria-hidden="true" class={cn('inline-flex shrink-0 items-center justify-center', iconSize())}>
          <Show when={local.loading} fallback={local.icon && <Dynamic component={local.icon} class="h-full w-full" />}>
            <Loader2 class="h-full w-full animate-spin" />
          </Show>
        </span>
      </Show>
      {local.children}
      {/* A loading-capable button with no icon still reserves its leading slot so
          the spinner never displaces the label. Mirror that slot on the trailing
          side: without it the reserved-but-empty box reads as a left indent and
          pushes the label off the control's centre. Symmetric reservation keeps
          the label centred and keeps width identical between rest and pending. */}
      <Show when={!local.icon && 'loading' in props}>
        <span aria-hidden="true" class={cn('inline-flex shrink-0', iconSize())} />
      </Show>
    </button>
  );
}
