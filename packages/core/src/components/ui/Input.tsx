import { splitProps, type JSX, Show, createUniqueId, createSignal, For } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { Plus, Minus, ChevronDown } from '../icons';

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

  const fallbackId = createUniqueId();
  const inputId = () => local.id ?? fallbackId;
  const errorId = () => `${inputId()}-error`;
  const helperId = () => `${inputId()}-helper`;

  const ariaDescribedBy = () => {
    const ids: string[] = [];
    if (local.error) ids.push(errorId());
    if (local.helperText && !local.error) ids.push(helperId());
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
        id={inputId()}
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
        <p id={errorId()} class="mt-1 text-[11px] text-error" role="alert">
          {local.error}
        </p>
      </Show>

      <Show when={local.helperText && !local.error}>
        <p id={helperId()} class="mt-1 text-[11px] text-muted-foreground">
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

  const fallbackId = createUniqueId();
  const textareaId = () => local.id ?? fallbackId;
  const errorId = () => `${textareaId()}-error`;
  const helperId = () => `${textareaId()}-helper`;

  const ariaDescribedBy = () => {
    const ids: string[] = [];
    if (local.error) ids.push(errorId());
    if (local.helperText && !local.error) ids.push(helperId());
    return ids.length > 0 ? ids.join(' ') : undefined;
  };

  return (
    <div>
      <textarea
        id={textareaId()}
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
        <p id={errorId()} class="mt-1 text-[11px] text-error" role="alert">
          {local.error}
        </p>
      </Show>
      <Show when={local.helperText && !local.error}>
        <p id={helperId()} class="mt-1 text-[11px] text-muted-foreground">
          {local.helperText}
        </p>
      </Show>
    </div>
  );
}

/**
 * NumberInput - Number input with increment/decrement buttons
 */
export interface NumberInputProps {
  /** Current value */
  value: number;
  /** Called when value changes */
  onChange: (value: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment (default: 1) */
  step?: number;
  /** Input size variant */
  size?: InputSize;
  /** Disabled state (disables both input and buttons) */
  disabled?: boolean;
  /** Disable direct input, only allow button clicks */
  inputDisabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Additional CSS class */
  class?: string;
}

export function NumberInput(props: NumberInputProps) {
  const inputId = createUniqueId();
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const step = () => props.step ?? 1;
  const min = () => props.min ?? -Infinity;
  const max = () => props.max ?? Infinity;

  const clamp = (value: number) => Math.min(max(), Math.max(min(), value));

  const canDecrement = () => !props.disabled && props.value > min();
  const canIncrement = () => !props.disabled && props.value < max();

  const handleDecrement = () => {
    if (canDecrement()) {
      props.onChange(clamp(props.value - step()));
    }
  };

  const handleIncrement = () => {
    if (canIncrement()) {
      props.onChange(clamp(props.value + step()));
    }
  };

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    const val = parseFloat(e.currentTarget.value);
    if (!isNaN(val)) {
      props.onChange(clamp(val));
    }
  };

  const handleBlur: JSX.EventHandler<HTMLInputElement, FocusEvent> = (e) => {
    const val = parseFloat(e.currentTarget.value);
    if (isNaN(val)) {
      props.onChange(min() === -Infinity ? 0 : min());
    } else {
      props.onChange(clamp(val));
    }
  };

  const ariaDescribedBy = () => {
    const ids: string[] = [];
    if (props.error) ids.push(errorId);
    if (props.helperText && !props.error) ids.push(helperId);
    return ids.length > 0 ? ids.join(' ') : undefined;
  };

  const sizeConfig: Record<InputSize, { height: string; btnSize: string; iconSize: string }> = {
    sm: { height: 'h-7', btnSize: 'w-7', iconSize: 'w-3 h-3' },
    md: { height: 'h-8', btnSize: 'w-8', iconSize: 'w-3.5 h-3.5' },
    lg: { height: 'h-9', btnSize: 'w-9', iconSize: 'w-4 h-4' },
  };

  const config = () => sizeConfig[props.size ?? 'md'];

  return (
    <div class={props.class}>
      <div
        class={cn(
          'inline-flex items-center rounded border border-input bg-background shadow-sm',
          'transition-colors duration-100',
          'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
          props.disabled && 'opacity-50 cursor-not-allowed',
          props.error && 'border-error focus-within:ring-error',
          config().height
        )}
      >
        {/* Decrement button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!canDecrement()}
          class={cn(
            'flex items-center justify-center border-r border-input',
            'text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-foreground',
            'focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground',
            config().btnSize,
            config().height
          )}
          aria-label="Decrease value"
        >
          <Minus class={config().iconSize} />
        </button>

        {/* Input */}
        <input
          id={inputId}
          type="number"
          value={props.value}
          onInput={handleInput}
          onBlur={handleBlur}
          min={props.min}
          max={props.max}
          step={props.step}
          disabled={props.disabled}
          readOnly={props.inputDisabled}
          placeholder={props.placeholder}
          aria-invalid={props.error ? true : undefined}
          aria-describedby={ariaDescribedBy()}
          class={cn(
            'w-16 text-center text-xs bg-transparent border-none',
            'outline-none focus:outline-none focus:ring-0',
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            props.inputDisabled && 'cursor-default'
          )}
        />

        {/* Increment button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={!canIncrement()}
          class={cn(
            'flex items-center justify-center border-l border-input',
            'text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-foreground',
            'focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground',
            config().btnSize,
            config().height
          )}
          aria-label="Increase value"
        >
          <Plus class={config().iconSize} />
        </button>
      </div>

      <Show when={props.error}>
        <p id={errorId} class="mt-1 text-[11px] text-error" role="alert">
          {props.error}
        </p>
      </Show>

      <Show when={props.helperText && !props.error}>
        <p id={helperId} class="mt-1 text-[11px] text-muted-foreground">
          {props.helperText}
        </p>
      </Show>
    </div>
  );
}

/**
 * AffixInput - Input with selectable prefix and/or suffix
 */
export interface AffixOption {
  value: string;
  label: string;
}

export interface AffixInputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  /** Input size variant */
  size?: InputSize;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Fixed prefix text (non-selectable) */
  prefix?: string;
  /** Fixed suffix text (non-selectable) */
  suffix?: string;
  /** Selectable prefix options */
  prefixOptions?: AffixOption[];
  /** Selected prefix value */
  prefixValue?: string;
  /** Called when prefix selection changes */
  onPrefixChange?: (value: string) => void;
  /** Selectable suffix options */
  suffixOptions?: AffixOption[];
  /** Selected suffix value */
  suffixValue?: string;
  /** Called when suffix selection changes */
  onSuffixChange?: (value: string) => void;
}

/** Viewport margin for dropdown positioning */
const AFFIX_VIEWPORT_MARGIN = 8;

export function AffixInput(props: AffixInputProps) {
  const [local, rest] = splitProps(props, [
    'size',
    'error',
    'helperText',
    'prefix',
    'suffix',
    'prefixOptions',
    'prefixValue',
    'onPrefixChange',
    'suffixOptions',
    'suffixValue',
    'onSuffixChange',
    'class',
    'id',
  ]);

  const fallbackId = createUniqueId();
  const inputId = () => local.id ?? fallbackId;
  const errorId = () => `${inputId()}-error`;
  const helperId = () => `${inputId()}-helper`;

  const ariaDescribedBy = () => {
    const ids: string[] = [];
    if (local.error) ids.push(errorId());
    if (local.helperText && !local.error) ids.push(helperId());
    return ids.length > 0 ? ids.join(' ') : undefined;
  };

  const sizeConfig: Record<InputSize, { height: string; text: string; px: string }> = {
    sm: { height: 'h-7', text: 'text-xs', px: 'px-2' },
    md: { height: 'h-8', text: 'text-xs', px: 'px-2.5' },
    lg: { height: 'h-9', text: 'text-sm', px: 'px-3' },
  };

  const config = () => sizeConfig[local.size ?? 'md'];

  const hasPrefix = () => !!local.prefix || (local.prefixOptions && local.prefixOptions.length > 0);
  const hasSuffix = () => !!local.suffix || (local.suffixOptions && local.suffixOptions.length > 0);

  const selectedPrefixLabel = () => {
    if (local.prefix) return local.prefix;
    return local.prefixOptions?.find((o) => o.value === local.prefixValue)?.label ?? local.prefixOptions?.[0]?.label;
  };

  const selectedSuffixLabel = () => {
    if (local.suffix) return local.suffix;
    return local.suffixOptions?.find((o) => o.value === local.suffixValue)?.label ?? local.suffixOptions?.[0]?.label;
  };

  return (
    <div class={local.class}>
      <div
        class={cn(
          'inline-flex items-center rounded border border-input bg-background shadow-sm',
          'transition-colors duration-100',
          'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
          rest.disabled && 'opacity-50 cursor-not-allowed',
          local.error && 'border-error focus-within:ring-error',
          config().height
        )}
      >
        {/* Prefix */}
        <Show when={hasPrefix()}>
          <Show
            when={local.prefixOptions && local.prefixOptions.length > 0}
            fallback={
              <span
                class={cn(
                  'flex items-center border-r border-input bg-muted/50 text-muted-foreground',
                  config().text,
                  config().px,
                  config().height
                )}
              >
                {local.prefix}
              </span>
            }
          >
            <AffixSelect
              options={local.prefixOptions!}
              value={local.prefixValue}
              onChange={local.onPrefixChange}
              label={selectedPrefixLabel()}
              size={local.size}
              position="prefix"
              disabled={rest.disabled}
            />
          </Show>
        </Show>

        {/* Input */}
        <input
          id={inputId()}
          aria-invalid={local.error ? true : undefined}
          aria-describedby={ariaDescribedBy()}
          class={cn(
            'flex-1 min-w-0 bg-transparent border-none',
            'placeholder:text-muted-foreground/60',
            'outline-none focus:outline-none focus:ring-0',
            'disabled:cursor-not-allowed',
            config().text,
            config().px
          )}
          {...rest}
        />

        {/* Suffix */}
        <Show when={hasSuffix()}>
          <Show
            when={local.suffixOptions && local.suffixOptions.length > 0}
            fallback={
              <span
                class={cn(
                  'flex items-center border-l border-input bg-muted/50 text-muted-foreground',
                  config().text,
                  config().px,
                  config().height
                )}
              >
                {local.suffix}
              </span>
            }
          >
            <AffixSelect
              options={local.suffixOptions!}
              value={local.suffixValue}
              onChange={local.onSuffixChange}
              label={selectedSuffixLabel()}
              size={local.size}
              position="suffix"
              disabled={rest.disabled}
            />
          </Show>
        </Show>
      </div>

      <Show when={local.error}>
        <p id={errorId()} class="mt-1 text-[11px] text-error" role="alert">
          {local.error}
        </p>
      </Show>

      <Show when={local.helperText && !local.error}>
        <p id={helperId()} class="mt-1 text-[11px] text-muted-foreground">
          {local.helperText}
        </p>
      </Show>
    </div>
  );
}

/** Internal component for prefix/suffix dropdown select */
interface AffixSelectProps {
  options: AffixOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  size?: InputSize;
  position: 'prefix' | 'suffix';
  disabled?: boolean;
}

function AffixSelect(props: AffixSelectProps) {
  const [open, setOpen] = createSignal(false);
  const [menuPosition, setMenuPosition] = createSignal({ x: -9999, y: -9999 });
  let triggerRef: HTMLButtonElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  const sizeConfig: Record<InputSize, { height: string; text: string; px: string }> = {
    sm: { height: 'h-7', text: 'text-xs', px: 'px-2' },
    md: { height: 'h-8', text: 'text-xs', px: 'px-2.5' },
    lg: { height: 'h-9', text: 'text-sm', px: 'px-3' },
  };

  const config = () => sizeConfig[props.size ?? 'md'];

  const updateMenuPosition = () => {
    if (!triggerRef || !menuRef) return;
    const triggerRect = triggerRef.getBoundingClientRect();
    const menuRect = menuRef.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = triggerRect.left;
    let y = triggerRect.bottom + 2;

    // Check right boundary
    if (x + menuRect.width > viewportWidth - AFFIX_VIEWPORT_MARGIN) {
      x = triggerRect.right - menuRect.width;
    }
    x = Math.max(AFFIX_VIEWPORT_MARGIN, x);

    // Check bottom boundary
    if (y + menuRect.height > viewportHeight - AFFIX_VIEWPORT_MARGIN) {
      y = triggerRect.top - menuRect.height - 2;
    }
    y = Math.max(AFFIX_VIEWPORT_MARGIN, y);

    setMenuPosition({ x, y });
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (
      triggerRef &&
      !triggerRef.contains(e.target as Node) &&
      menuRef &&
      !menuRef.contains(e.target as Node)
    ) {
      setOpen(false);
    }
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  };

  const handleSelect = (value: string) => {
    props.onChange?.(value);
    setOpen(false);
  };

  // Event listeners for closing
  const setupListeners = () => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    requestAnimationFrame(updateMenuPosition);
  };

  const cleanupListeners = () => {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('keydown', handleEscape);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={props.disabled}
        onClick={() => {
          if (open()) {
            setOpen(false);
            cleanupListeners();
          } else {
            setOpen(true);
            setupListeners();
          }
        }}
        class={cn(
          'flex items-center gap-1 bg-muted/50 text-muted-foreground',
          'hover:bg-muted hover:text-foreground transition-colors',
          'focus:outline-none',
          'disabled:cursor-not-allowed disabled:hover:bg-muted/50 disabled:hover:text-muted-foreground',
          props.position === 'prefix' ? 'border-r border-input' : 'border-l border-input',
          config().text,
          config().px,
          config().height
        )}
      >
        <span>{props.label}</span>
        <ChevronDown class="w-3 h-3 opacity-60" />
      </button>

      <Show when={open()}>
        <Portal>
          <div
            ref={menuRef}
            class={cn(
              'fixed z-50 min-w-24 py-0.5',
              'bg-popover text-popover-foreground',
              'rounded border border-border shadow-md',
              'animate-in fade-in slide-in-from-top-1'
            )}
            style={{
              left: `${menuPosition().x}px`,
              top: `${menuPosition().y}px`,
            }}
            role="listbox"
          >
            <For each={props.options}>
              {(option) => (
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  class={cn(
                    'w-full flex items-center px-2.5 py-1.5 text-xs cursor-pointer',
                    'transition-colors duration-75',
                    'hover:bg-accent',
                    'focus:outline-none focus:bg-accent',
                    props.value === option.value && 'bg-accent/50 font-medium'
                  )}
                  role="option"
                  aria-selected={props.value === option.value}
                >
                  {option.label}
                </button>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </>
  );
}
