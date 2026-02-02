import { splitProps, type JSX, Show, createUniqueId } from 'solid-js';
import { cn } from '../../utils/cn';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input size variant */
  size?: InputSize;
  /** Error message - also sets aria-invalid and aria-describedby */
  error?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Icon displayed on the left side */
  leftIcon?: JSX.Element;
  /** Icon displayed on the right side */
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
    'helperText',
    'leftIcon',
    'rightIcon',
    'class',
    'id',
  ]);

  const inputId = local.id ?? createUniqueId();
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const ariaDescribedBy = () => {
    const ids: string[] = [];
    if (local.error) ids.push(errorId);
    if (local.helperText && !local.error) ids.push(helperId);
    return ids.length > 0 ? ids.join(' ') : undefined;
  };

  return (
    <div class="relative">
      <Show when={local.leftIcon}>
        <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {local.leftIcon}
        </div>
      </Show>

      <input
        id={inputId}
        aria-invalid={local.error ? true : undefined}
        aria-describedby={ariaDescribedBy()}
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
        <p id={errorId} class="mt-1 text-[11px] text-error" role="alert">
          {local.error}
        </p>
      </Show>

      <Show when={local.helperText && !local.error}>
        <p id={helperId} class="mt-1 text-[11px] text-muted-foreground">
          {local.helperText}
        </p>
      </Show>
    </div>
  );
}

/**
 * Textarea variant - Multi-line text input with auto-resize support
 */
export interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Error message - also sets aria-invalid and aria-describedby */
  error?: string;
  /** Helper text displayed below the textarea */
  helperText?: string;
}

export function Textarea(props: TextareaProps) {
  const [local, rest] = splitProps(props, ['error', 'helperText', 'class', 'id']);

  const textareaId = local.id ?? createUniqueId();
  const errorId = `${textareaId}-error`;
  const helperId = `${textareaId}-helper`;

  const ariaDescribedBy = () => {
    const ids: string[] = [];
    if (local.error) ids.push(errorId);
    if (local.helperText && !local.error) ids.push(helperId);
    return ids.length > 0 ? ids.join(' ') : undefined;
  };

  return (
    <div>
      <textarea
        id={textareaId}
        aria-invalid={local.error ? true : undefined}
        aria-describedby={ariaDescribedBy()}
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
        <p id={errorId} class="mt-1 text-[11px] text-error" role="alert">
          {local.error}
        </p>
      </Show>
      <Show when={local.helperText && !local.error}>
        <p id={helperId} class="mt-1 text-[11px] text-muted-foreground">
          {local.helperText}
        </p>
      </Show>
    </div>
  );
}
