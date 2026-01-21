import { splitProps, type JSX, type Component, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { Loader2 } from '../icons';

export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: Component;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  destructive: 'bg-error text-error-foreground hover:bg-error/90',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-9 px-4 text-sm rounded-md',
  lg: 'h-10 px-6 text-base rounded-md',
  icon: 'h-9 w-9 rounded-md',
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

  return (
    <button
      type="button"
      class={cn(
        'inline-flex items-center justify-center gap-2 font-medium',
        'transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantStyles[local.variant ?? 'default'],
        sizeStyles[local.size ?? 'md'],
        local.class
      )}
      disabled={local.disabled || local.loading}
      {...rest}
    >
      <Show
        when={local.loading}
        fallback={local.icon && <Dynamic component={local.icon} />}
      >
        <Loader2 class="w-4 h-4 animate-spin" />
      </Show>
      {local.children}
    </button>
  );
}
