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
  sm: 'h-8 text-xs px-2',
  md: 'h-9 text-sm px-3',
  lg: 'h-10 text-base px-4',
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
        <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {local.leftIcon}
        </div>
      </Show>

      <input
        class={cn(
          'w-full rounded-md border border-input bg-background',
          'placeholder:text-muted-foreground',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          local.error && 'border-error focus:ring-error',
          local.leftIcon && 'pl-9',
          local.rightIcon && 'pr-9',
          sizeStyles[local.size ?? 'md'],
          local.class
        )}
        {...rest}
      />

      <Show when={local.rightIcon}>
        <div class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {local.rightIcon}
        </div>
      </Show>

      <Show when={local.error}>
        <p class="mt-1 text-xs text-error">{local.error}</p>
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
          'w-full min-h-20 rounded-md border border-input bg-background p-3 text-sm',
          'placeholder:text-muted-foreground',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-y',
          local.error && 'border-error focus:ring-error',
          local.class
        )}
        {...rest}
      />
      <Show when={local.error}>
        <p class="mt-1 text-xs text-error">{local.error}</p>
      </Show>
    </div>
  );
}
