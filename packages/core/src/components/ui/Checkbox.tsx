import { splitProps, type JSX, type Component, For, Show, Match, createEffect, Switch, createContext, useContext, createUniqueId } from 'solid-js';
import { cn } from '../../utils/cn';

export type CheckboxSize = 'sm' | 'md' | 'lg';
export type CheckboxVariant = 'default' | 'card' | 'button' | 'tile';

export interface CheckboxGroupProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Current selected values */
  value?: string[];
  /** Callback when values change */
  onChange?: (value: string[]) => void;
  /** Size of checkboxes */
  size?: CheckboxSize;
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Visual variant */
  variant?: CheckboxVariant;
  /** Whether the checkbox group is disabled */
  disabled?: boolean;
}

export interface CheckboxProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'size'> {
  /** Value of this checkbox */
  value?: string;
  /** Whether the checkbox is checked (for standalone use) */
  checked?: boolean;
  /** Callback when state changes (for standalone use) */
  onChange?: (checked: boolean) => void;
  /** Label text */
  label?: string;
  /** Description text */
  description?: string;
  /** Icon component for tile variant */
  icon?: Component<{ class?: string }>;
  /** Size of the checkbox */
  size?: CheckboxSize;
  /** Visual variant (for standalone use) */
  variant?: CheckboxVariant;
  /** Indeterminate state */
  indeterminate?: boolean;
}

interface CheckboxContextValue {
  value: () => string[];
  onChange: (value: string, checked: boolean) => void;
  size: () => CheckboxSize;
  variant: () => CheckboxVariant;
  disabled: () => boolean;
}

const CheckboxContext = createContext<CheckboxContextValue>();

function useCheckboxContext() {
  return useContext(CheckboxContext);
}

const sizeStyles: Record<CheckboxSize, { box: string; icon: string; label: string; description: string }> = {
  sm: {
    box: 'w-3.5 h-3.5',
    icon: 'w-2.5 h-2.5',
    label: 'text-xs',
    description: 'text-caption',
  },
  md: {
    box: 'w-4 h-4',
    icon: 'w-3 h-3',
    label: 'text-sm',
    description: 'text-caption',
  },
  lg: {
    box: 'w-5 h-5',
    icon: 'w-3.5 h-3.5',
    label: 'text-sm',
    description: 'text-xs',
  },
};

const buttonSizeStyles: Record<CheckboxSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-xs',
  lg: 'px-4 py-2 text-sm',
};

const cardSizeStyles: Record<CheckboxSize, string> = {
  sm: 'p-2.5',
  md: 'p-3',
  lg: 'p-4',
};

const tileSizeStyles: Record<CheckboxSize, { container: string; icon: string }> = {
  sm: { container: 'p-3 min-w-[80px]', icon: 'w-5 h-5' },
  md: { container: 'p-4 min-w-[100px]', icon: 'w-6 h-6' },
  lg: { container: 'p-5 min-w-[120px]', icon: 'w-8 h-8' },
};

// Checkmark icon
function CheckIcon(props: { class?: string }) {
  return (
    <svg class={props.class} viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 6l3 3 5-6" />
    </svg>
  );
}

// Minus icon for indeterminate state
function MinusIcon(props: { class?: string }) {
  return (
    <svg class={props.class} viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M2 6h8" />
    </svg>
  );
}

export function CheckboxGroup(props: CheckboxGroupProps) {
  const [local, rest] = splitProps(props, [
    'value',
    'onChange',
    'size',
    'orientation',
    'variant',
    'disabled',
    'class',
    'children',
  ]);

  const variant = () => local.variant ?? 'default';

  const contextValue: CheckboxContextValue = {
    value: () => local.value ?? [],
    onChange: (itemValue: string, checked: boolean) => {
      const current = local.value ?? [];
      const newValue = checked
        ? [...current, itemValue]
        : current.filter(v => v !== itemValue);
      local.onChange?.(newValue);
    },
    size: () => local.size ?? 'md',
    variant,
    disabled: () => local.disabled ?? false,
  };

  const getContainerClass = () => {
    const v = variant();
    const isHorizontal = local.orientation === 'horizontal';

    if (v === 'button') {
      return cn(
        'inline-flex rounded-group border border-[var(--floe-line)] overflow-hidden',
        isHorizontal ? 'flex-row' : 'flex-col'
      );
    }

    if (v === 'card' || v === 'tile') {
      return cn(
        'grid gap-2',
        isHorizontal ? 'grid-flow-col auto-cols-fr' : 'grid-cols-1'
      );
    }

    return cn(
      'flex',
      isHorizontal ? 'flex-row flex-wrap gap-4' : 'flex-col gap-2'
    );
  };

  return (
    <CheckboxContext.Provider value={contextValue}>
      <div
        role="group"
        data-floe-surface={variant() === 'button' ? 'inset' : undefined}
        data-floe-surface-part={variant() === 'button' ? 'rail' : undefined}
        class={cn(getContainerClass(), local.class)}
        {...rest}
      >
        {local.children}
      </div>
    </CheckboxContext.Provider>
  );
}

export function Checkbox(props: CheckboxProps) {
  const context = useCheckboxContext();
  const [local, rest] = splitProps(props, [
    'value',
    'checked',
    'onChange',
    'label',
    'description',
    'icon',
    'size',
    'variant',
    'indeterminate',
    'ref',
    'class',
    'disabled',
    'id',
  ]);

  const generatedId = createUniqueId();
  const id = () => local.id ?? generatedId;

  // Determine if we're in a group context
  const isInGroup = () => context !== undefined;

  const size = () => local.size ?? context?.size() ?? 'md';
  const variant = () => local.variant ?? context?.variant() ?? 'default';
  const isDisabled = () => local.disabled ?? context?.disabled() ?? false;

  const isChecked = () => {
    if (isInGroup() && local.value) {
      return context!.value().includes(local.value);
    }
    return local.checked ?? false;
  };

  const handleChange = () => {
    if (isDisabled()) return;

    if (isInGroup() && local.value) {
      context!.onChange(local.value, !isChecked());
    } else {
      local.onChange?.(!isChecked());
    }
  };

  // Checkbox indicator component
  const CheckboxIndicator = () => (
    <div
      data-floe-surface="inset"
      data-floe-surface-part="indicator"
      data-floe-selected={isChecked() || local.indeterminate ? 'true' : undefined}
      class={cn(
        'rounded-xs border-2 transition-[background-color,border-color,color,transform] duration-[var(--floe-duration-fast)] ease-[var(--floe-ease-out)]',
        'flex items-center justify-center',
        sizeStyles[size()].box,
        isChecked() || local.indeterminate
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-[var(--floe-control-edge)] bg-transparent hover:border-[var(--floe-control-edge-hover)]',
        isDisabled() && 'cursor-not-allowed'
      )}
    >
      <Show when={local.indeterminate}>
        <MinusIcon class={cn(sizeStyles[size()].icon, 'transition-transform duration-[var(--floe-duration-fast)]')} />
      </Show>
      <Show when={!local.indeterminate && isChecked()}>
        <CheckIcon class={cn(sizeStyles[size()].icon, 'transition-transform duration-[var(--floe-duration-fast)]')} />
      </Show>
    </div>
  );

  // Common checkbox input
  const CheckboxInput = (inputProps: { class?: string }) => {
    let element: HTMLInputElement | undefined;
    createEffect(() => {
      if (element) element.indeterminate = local.indeterminate ?? false;
    });
    return (
      <input
        data-floe-choice-input
        type="checkbox"
        id={id()}
        value={local.value}
        checked={isChecked()}
        aria-checked={local.indeterminate ? 'mixed' : isChecked()}
        disabled={isDisabled()}
        onChange={handleChange}
        class={inputProps.class ?? 'sr-only peer'}
        {...rest}
        ref={(el) => {
          element = el;
          if (typeof local.ref === 'function') local.ref(el);
        }}
      />
    );
  };

  return (
    <Switch>
      {/* Default variant */}
      <Match when={variant() === 'default'}>
        <label
          class={cn(
            'inline-flex items-start gap-2 cursor-pointer select-none',
            isDisabled() && 'opacity-50 cursor-not-allowed',
            local.class
          )}
        >
          <div class="relative flex items-center justify-center pt-0.5">
            <CheckboxInput />
            <CheckboxIndicator />
          </div>
          <Show when={local.label || local.description}>
            <div class="flex flex-col">
              <Show when={local.label}>
                <span class={cn('text-foreground', sizeStyles[size()].label)}>
                  {local.label}
                </span>
              </Show>
              <Show when={local.description}>
                <span class={cn('text-[var(--floe-ink-soft)]', sizeStyles[size()].description)}>
                  {local.description}
                </span>
              </Show>
            </div>
          </Show>
        </label>
      </Match>

      {/* Button variant */}
      <Match when={variant() === 'button'}>
        <label
          data-floe-surface={isChecked() ? 'inset' : 'raised'}
          data-floe-surface-part="choice"
          data-floe-selected={isChecked() ? 'true' : undefined}
          data-floe-choice-variant={variant()}
          class={cn(
            'cursor-pointer select-none transition-colors duration-[var(--floe-duration-fast)]',
            'border-r border-[var(--floe-line)] last:border-r-0',
            buttonSizeStyles[size()],
            isChecked()
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
              : 'bg-transparent text-[var(--floe-ink-soft)] hover:bg-[var(--floe-state-hover)] hover:text-[var(--floe-ink)]',
            isDisabled() && 'opacity-50 cursor-not-allowed',
            local.class
          )}
        >
          <CheckboxInput class="sr-only" />
          <span class="font-medium">{local.label}</span>
        </label>
      </Match>

      {/* Card variant */}
      <Match when={variant() === 'card'}>
        <label
          data-floe-surface={isChecked() ? 'inset' : 'raised'}
          data-floe-surface-part="choice"
          data-floe-selected={isChecked() ? 'true' : undefined}
          data-floe-choice-variant={variant()}
          class={cn(
            'relative cursor-pointer select-none rounded-group border transition-[background-color,border-color,color] duration-[var(--floe-duration-fast)] ease-[var(--floe-ease-out)]',
            cardSizeStyles[size()],
            isChecked()
              ? 'border-[var(--floe-accent-line)] bg-[var(--floe-state-selected)]'
              : 'border-[var(--floe-line)] bg-transparent hover:border-[var(--floe-line-strong)] hover:bg-[var(--floe-state-hover)]',
            isDisabled() && 'opacity-50 cursor-not-allowed',
            local.class
          )}
        >
          <CheckboxInput class="sr-only" />
          <div class="flex items-start gap-3">
            <div class="flex items-center justify-center pt-0.5">
              <CheckboxIndicator />
            </div>
            <div class="flex flex-col flex-1 min-w-0">
              <Show when={local.label}>
                <span class={cn('font-medium text-foreground', sizeStyles[size()].label)}>
                  {local.label}
                </span>
              </Show>
              <Show when={local.description}>
                <span class={cn('text-[var(--floe-ink-soft)] mt-0.5', sizeStyles[size()].description)}>
                  {local.description}
                </span>
              </Show>
            </div>
          </div>
          <Show when={isChecked()}>
            <div class="absolute top-2 right-2">
              <svg class="w-4 h-4 text-[var(--floe-accent-ink)]" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
          </Show>
        </label>
      </Match>

      {/* Tile variant */}
      <Match when={variant() === 'tile'}>
        <label
          data-floe-surface={isChecked() ? 'inset' : 'raised'}
          data-floe-surface-part="choice"
          data-floe-selected={isChecked() ? 'true' : undefined}
          data-floe-choice-variant={variant()}
          class={cn(
            'relative flex flex-col items-center justify-center cursor-pointer select-none',
            'rounded-control border transition-[background-color,border-color,color] duration-[var(--floe-duration-fast)] ease-[var(--floe-ease-out)] text-center',
            tileSizeStyles[size()].container,
            isChecked()
              ? 'border-[var(--floe-accent-line)] bg-[var(--floe-state-selected)]'
              : 'border-[var(--floe-line)] bg-transparent hover:border-[var(--floe-line-strong)] hover:bg-[var(--floe-state-hover)]',
            isDisabled() && 'opacity-50 cursor-not-allowed',
            local.class
          )}
        >
          <CheckboxInput class="sr-only" />
          <Show when={local.icon}>
            {(getIcon) => {
              const Icon = getIcon();
              return (
                <div class={cn(
                  'mb-2 transition-colors duration-[var(--floe-duration-fast)]',
                  isChecked() ? 'text-[var(--floe-accent-ink)]' : 'text-[var(--floe-ink-quiet)]'
                )}>
                  <Icon class={tileSizeStyles[size()].icon} />
                </div>
              );
            }}
          </Show>
          <Show when={local.label}>
            <span class={cn(
              'font-medium transition-colors duration-[var(--floe-duration-fast)]',
              sizeStyles[size()].label,
              isChecked() ? 'text-[var(--floe-ink)]' : 'text-[var(--floe-ink-soft)]'
            )}>
              {local.label}
            </span>
          </Show>
          <Show when={local.description}>
            <span class={cn('text-[var(--floe-ink-soft)] mt-0.5', sizeStyles[size()].description)}>
              {local.description}
            </span>
          </Show>
          <Show when={isChecked()}>
            <div class="absolute top-1.5 right-1.5">
              <div class="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <CheckIcon class="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            </div>
          </Show>
        </label>
      </Match>
    </Switch>
  );
}

/** Convenience component for rendering a list of checkbox options */
export interface CheckboxListProps extends CheckboxGroupProps {
  /** Options to render */
  options: Array<{
    value: string;
    label: string;
    description?: string;
    icon?: Component<{ class?: string }>;
    disabled?: boolean;
  }>;
}

export function CheckboxList(props: CheckboxListProps) {
  const [local, rest] = splitProps(props, ['options']);

  return (
    <CheckboxGroup {...rest}>
      <For each={local.options}>
        {(option) => (
          <Checkbox
            value={option.value}
            label={option.label}
            description={option.description}
            icon={option.icon}
            disabled={option.disabled}
          />
        )}
      </For>
    </CheckboxGroup>
  );
}
