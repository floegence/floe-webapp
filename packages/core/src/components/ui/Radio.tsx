import { splitProps, type JSX, type Component, For, Show, Match, Switch, createContext, useContext, createUniqueId } from 'solid-js';
import { cn } from '../../utils/cn';

export type RadioSize = 'sm' | 'md' | 'lg';
export type RadioOrientation = 'horizontal' | 'vertical';
export type RadioVariant = 'default' | 'card' | 'button' | 'tile';

export interface RadioGroupProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Current selected value */
  value?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** Size of radio buttons */
  size?: RadioSize;
  /** Layout orientation */
  orientation?: RadioOrientation;
  /** Visual variant */
  variant?: RadioVariant;
  /** Whether the radio group is disabled */
  disabled?: boolean;
  /** Name attribute for form submission */
  name?: string;
}

export interface RadioOptionProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'size'> {
  /** Value of this option */
  value: string;
  /** Label text */
  label?: string;
  /** Description text */
  description?: string;
  /** Icon component for tile variant */
  icon?: Component<{ class?: string }>;
  /** Size override (defaults to group size) */
  size?: RadioSize;
}

interface RadioContextValue {
  value: () => string | undefined;
  onChange: (value: string) => void;
  size: () => RadioSize;
  variant: () => RadioVariant;
  disabled: () => boolean;
  name: () => string;
}

const RadioContext = createContext<RadioContextValue>();

function useRadioContext() {
  const context = useContext(RadioContext);
  if (!context) {
    throw new Error('RadioOption must be used within a RadioGroup');
  }
  return context;
}

const sizeStyles: Record<RadioSize, { outer: string; inner: string; label: string; description: string }> = {
  sm: {
    outer: 'w-3.5 h-3.5',
    inner: 'w-1.5 h-1.5',
    label: 'text-xs',
    description: 'text-[10px]',
  },
  md: {
    outer: 'w-4 h-4',
    inner: 'w-2 h-2',
    label: 'text-xs',
    description: 'text-[11px]',
  },
  lg: {
    outer: 'w-5 h-5',
    inner: 'w-2.5 h-2.5',
    label: 'text-sm',
    description: 'text-xs',
  },
};

const buttonSizeStyles: Record<RadioSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-xs',
  lg: 'px-4 py-2 text-sm',
};

const cardSizeStyles: Record<RadioSize, string> = {
  sm: 'p-2.5',
  md: 'p-3',
  lg: 'p-4',
};

const tileSizeStyles: Record<RadioSize, { container: string; icon: string }> = {
  sm: { container: 'p-3 min-w-[80px]', icon: 'w-5 h-5' },
  md: { container: 'p-4 min-w-[100px]', icon: 'w-6 h-6' },
  lg: { container: 'p-5 min-w-[120px]', icon: 'w-8 h-8' },
};

export function RadioGroup(props: RadioGroupProps) {
  const [local, rest] = splitProps(props, [
    'value',
    'onChange',
    'size',
    'orientation',
    'variant',
    'disabled',
    'name',
    'class',
    'children',
  ]);

  const generatedName = createUniqueId();
  const groupName = () => local.name ?? generatedName;
  const variant = () => local.variant ?? 'default';

  const contextValue: RadioContextValue = {
    value: () => local.value,
    onChange: (v: string) => local.onChange?.(v),
    size: () => local.size ?? 'md',
    variant,
    disabled: () => local.disabled ?? false,
    name: groupName,
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
    <RadioContext.Provider value={contextValue}>
      <div
        role="radiogroup"
        data-floe-surface={variant() === 'button' ? 'inset' : undefined}
        data-floe-surface-part={variant() === 'button' ? 'rail' : undefined}
        class={cn(getContainerClass(), local.class)}
        {...rest}
      >
        {local.children}
      </div>
    </RadioContext.Provider>
  );
}

export function RadioOption(props: RadioOptionProps) {
  const context = useRadioContext();
  const [local, rest] = splitProps(props, [
    'value',
    'label',
    'description',
    'icon',
    'size',
    'class',
    'disabled',
    'id',
  ]);

  const generatedId = createUniqueId();
  const id = () => local.id ?? generatedId;
  const size = () => local.size ?? context.size();
  const variant = () => context.variant();
  const isDisabled = () => local.disabled ?? context.disabled();
  const isChecked = () => context.value() === local.value;

  const handleChange = () => {
    if (!isDisabled()) {
      context.onChange(local.value);
    }
  };

  // Common radio input for all variants
  const RadioInput = (inputProps: { class?: string }) => (
    <input
      data-floe-choice-input
      type="radio"
      id={id()}
      name={context.name()}
      value={local.value}
      checked={isChecked()}
      disabled={isDisabled()}
      onChange={handleChange}
      class={inputProps.class ?? 'sr-only peer'}
      {...rest}
    />
  );

  // Radio indicator for default and card variants
  const RadioIndicator = () => (
    <div
      data-floe-surface="inset"
      data-floe-surface-part="indicator"
      data-floe-selected={isChecked() ? 'true' : undefined}
      class={cn(
        'rounded-full border-2 transition-colors duration-150',
        'flex items-center justify-center',
        sizeStyles[size()].outer,
        isChecked()
          ? 'border-primary bg-primary'
          : cn('border-input bg-background', variant() === 'default' && 'hover:border-primary/50'),
        isDisabled() && 'cursor-not-allowed',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2'
      )}
    >
      <div
        data-floe-surface="raised"
        data-floe-surface-part="radio-dot"
        class={cn(
          'rounded-full bg-primary-foreground transition-transform duration-150',
          sizeStyles[size()].inner,
          isChecked() ? 'scale-100' : 'scale-0'
        )}
      />
    </div>
  );

  return (
    <Switch>
      {/* Default variant - classic radio button */}
      <Match when={variant() === 'default'}>
        <label
          class={cn(
            'inline-flex items-start gap-2 cursor-pointer select-none',
            isDisabled() && 'opacity-50 cursor-not-allowed',
            local.class
          )}
        >
          <div class="relative flex items-center justify-center pt-0.5">
            <RadioInput />
            <RadioIndicator />
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

      {/* Button variant - segmented control style */}
      <Match when={variant() === 'button'}>
        <label
          data-floe-surface={isChecked() ? 'inset' : 'raised'}
          data-floe-surface-part="choice"
          data-floe-selected={isChecked() ? 'true' : undefined}
          data-floe-choice-variant={variant()}
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
          <RadioInput class="sr-only" />
          <span class="font-medium">{local.label}</span>
        </label>
      </Match>

      {/* Card variant - bordered card with radio indicator */}
      <Match when={variant() === 'card'}>
        <label
          data-floe-surface={isChecked() ? 'inset' : 'raised'}
          data-floe-surface-part="choice"
          data-floe-selected={isChecked() ? 'true' : undefined}
          data-floe-choice-variant={variant()}
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
          <RadioInput />
          <div class="flex items-start gap-3">
            <div class="flex items-center justify-center pt-0.5">
              <RadioIndicator />
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
          {/* Checkmark indicator */}
          <Show when={isChecked()}>
            <div class="absolute top-2 right-2">
              <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
          </Show>
        </label>
      </Match>

      {/* Tile variant - icon-centric card */}
      <Match when={variant() === 'tile'}>
        <label
          data-floe-surface={isChecked() ? 'inset' : 'raised'}
          data-floe-surface-part="choice"
          data-floe-selected={isChecked() ? 'true' : undefined}
          data-floe-choice-variant={variant()}
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
          <RadioInput class="sr-only" />
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
          {/* Selection indicator */}
          <Show when={isChecked()}>
            <div class="absolute top-1.5 right-1.5">
              <div class="w-2 h-2 rounded-full bg-primary" />
            </div>
          </Show>
        </label>
      </Match>
    </Switch>
  );
}

/** Convenience component for rendering a list of radio options */
export interface RadioListProps extends RadioGroupProps {
  /** Options to render */
  options: Array<{
    value: string;
    label: string;
    description?: string;
    icon?: Component<{ class?: string }>;
    disabled?: boolean;
  }>;
}

export function RadioList(props: RadioListProps) {
  const [local, rest] = splitProps(props, ['options']);

  return (
    <RadioGroup {...rest}>
      <For each={local.options}>
        {(option) => (
          <RadioOption
            value={option.value}
            label={option.label}
            description={option.description}
            icon={option.icon}
            disabled={option.disabled}
          />
        )}
      </For>
    </RadioGroup>
  );
}
