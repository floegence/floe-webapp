import { splitProps, type JSX, type Component, For, Show, Match, Switch, createContext, useContext, createUniqueId } from 'solid-js';
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
    description: 'text-[10px]',
  },
  md: {
    box: 'w-4 h-4',
    icon: 'w-3 h-3',
    label: 'text-xs',
    description: 'text-[11px]',
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
        'inline-flex rounded-md border border-border overflow-hidden',
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
    'class',
    'disabled',
    'id',
  ]);

  const id = () => local.id ?? createUniqueId();

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
      class={cn(
        'rounded-[3px] border-2 transition-all duration-150',
        'flex items-center justify-center',
        sizeStyles[size()].box,
        isChecked() || local.indeterminate
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-background hover:border-primary/50',
        isDisabled() && 'cursor-not-allowed opacity-50'
      )}
    >
      <Show when={local.indeterminate}>
        <MinusIcon class={cn(sizeStyles[size()].icon, 'transition-transform duration-150')} />
      </Show>
      <Show when={!local.indeterminate && isChecked()}>
        <CheckIcon class={cn(sizeStyles[size()].icon, 'transition-transform duration-150')} />
      </Show>
    </div>
  );

  // Common checkbox input
  const CheckboxInput = (inputProps: { class?: string }) => (
    <input
      type="checkbox"
      id={id()}
      value={local.value}
      checked={isChecked()}
      disabled={isDisabled()}
      onChange={handleChange}
      class={inputProps.class ?? 'sr-only peer'}
      {...rest}
    />
  );

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
                <span class={cn('text-muted-foreground', sizeStyles[size()].description)}>
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
          class={cn(
            'cursor-pointer select-none transition-colors duration-150',
            'border-r border-border last:border-r-0',
            buttonSizeStyles[size()],
            isChecked()
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-foreground hover:bg-muted',
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
          class={cn(
            'relative cursor-pointer select-none rounded-lg border-2 transition-all duration-150',
            cardSizeStyles[size()],
            isChecked()
              ? 'border-primary bg-primary/5'
              : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50',
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
                <span class={cn('text-muted-foreground mt-0.5', sizeStyles[size()].description)}>
                  {local.description}
                </span>
              </Show>
            </div>
          </div>
          <Show when={isChecked()}>
            <div class="absolute top-2 right-2">
              <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
          </Show>
        </label>
      </Match>

      {/* Tile variant */}
      <Match when={variant() === 'tile'}>
        <label
          class={cn(
            'relative flex flex-col items-center justify-center cursor-pointer select-none',
            'rounded-lg border-2 transition-all duration-150 text-center',
            tileSizeStyles[size()].container,
            isChecked()
              ? 'border-primary bg-primary/5'
              : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50',
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
                  'mb-2 transition-colors duration-150',
                  isChecked() ? 'text-primary' : 'text-muted-foreground'
                )}>
                  <Icon class={tileSizeStyles[size()].icon} />
                </div>
              );
            }}
          </Show>
          <Show when={local.label}>
            <span class={cn(
              'font-medium transition-colors duration-150',
              sizeStyles[size()].label,
              isChecked() ? 'text-primary' : 'text-foreground'
            )}>
              {local.label}
            </span>
          </Show>
          <Show when={local.description}>
            <span class={cn('text-muted-foreground mt-0.5', sizeStyles[size()].description)}>
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
