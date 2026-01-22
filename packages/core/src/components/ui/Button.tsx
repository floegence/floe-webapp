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
  icon?: Component<{ class?: string }>;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]',
  primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]',
  secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.98]',
  outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
  ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
  destructive: 'bg-error text-error-foreground shadow-sm hover:bg-error/90 active:scale-[0.98]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs rounded',
  md: 'h-8 px-3 text-xs rounded-md',
  lg: 'h-9 px-4 text-sm rounded-md',
  icon: 'h-8 w-8 rounded-md',
};

const iconSizeStyles: Record<ButtonSize, string> = {
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
      class={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium cursor-pointer',
        'transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[local.variant ?? 'default'],
        sizeStyles[local.size ?? 'md'],
        local.class
      )}
      disabled={local.disabled || local.loading}
      {...rest}
    >
      <Show
        when={local.loading}
        fallback={
          local.icon && (
            <Dynamic component={local.icon} class={iconSize()} />
          )
        }
      >
        <Loader2 class={cn(iconSize(), 'animate-spin')} />
      </Show>
      {local.children}
    </button>
  );
}
