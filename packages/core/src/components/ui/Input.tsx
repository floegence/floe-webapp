import { splitProps, type JSX, Show } from 'solid-js';
import { cn } from '../../utils/cn';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  error?: string;
  leftIcon?: JSX.Element;
  rightIcon?: JSX.Element;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-7 text-xs px-2',
  md: 'h-8 text-xs px-2.5',
  lg: 'h-9 text-sm px-3',
};

export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, [
    'size',
    'error',
    'leftIcon',
    'rightIcon',
    'class',
  ]);

  return (
    <div class="relative">
      <Show when={local.leftIcon}>
        <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {local.leftIcon}
        </div>
      </Show>

      <input
        class={cn(
          'w-full rounded border border-input bg-background shadow-sm',
          'placeholder:text-muted-foreground/60',
          'transition-colors duration-100',
          'focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          local.error && 'border-error focus:ring-error',
          sizeStyles[local.size ?? 'md'],
          // Icon padding must come AFTER sizeStyles to override px-*
          local.leftIcon && 'pl-10',
          local.rightIcon && 'pr-10',
          local.class
        )}
        {...rest}
      />

      <Show when={local.rightIcon}>
        <div class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {local.rightIcon}
        </div>
      </Show>

      <Show when={local.error}>
        <p class="mt-1 text-[11px] text-error">{local.error}</p>
      </Show>
    </div>
  );
}

/**
 * Textarea variant
 */
export interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function Textarea(props: TextareaProps) {
  const [local, rest] = splitProps(props, ['error', 'class']);

  return (
    <div>
      <textarea
        class={cn(
          'w-full min-h-16 rounded border border-input bg-background p-2.5 text-xs shadow-sm',
          'placeholder:text-muted-foreground/60',
          'transition-colors duration-100',
          'focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-y',
          local.error && 'border-error focus:ring-error',
          local.class
        )}
        {...rest}
      />
      <Show when={local.error}>
        <p class="mt-1 text-[11px] text-error">{local.error}</p>
      </Show>
    </div>
  );
}
