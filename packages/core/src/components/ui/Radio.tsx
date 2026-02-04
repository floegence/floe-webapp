import { splitProps, type JSX, For, createContext, useContext, createUniqueId } from 'solid-js';
import { cn } from '../../utils/cn';

export type RadioSize = 'sm' | 'md' | 'lg';
export type RadioOrientation = 'horizontal' | 'vertical';

export interface RadioGroupProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Current selected value */
  value?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** Size of radio buttons */
  size?: RadioSize;
  /** Layout orientation */
  orientation?: RadioOrientation;
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
  /** Size override (defaults to group size) */
  size?: RadioSize;
}

interface RadioContextValue {
  value: () => string | undefined;
  onChange: (value: string) => void;
  size: () => RadioSize;
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

export function RadioGroup(props: RadioGroupProps) {
  const [local, rest] = splitProps(props, [
    'value',
    'onChange',
    'size',
    'orientation',
    'disabled',
    'name',
    'class',
    'children',
  ]);

  const groupName = local.name ?? createUniqueId();

  const contextValue: RadioContextValue = {
    value: () => local.value,
    onChange: (v: string) => local.onChange?.(v),
    size: () => local.size ?? 'md',
    disabled: () => local.disabled ?? false,
    name: () => groupName,
  };

  return (
    <RadioContext.Provider value={contextValue}>
      <div
        role="radiogroup"
        class={cn(
          'flex',
          local.orientation === 'horizontal' ? 'flex-row flex-wrap gap-4' : 'flex-col gap-2',
          local.class
        )}
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
    'size',
    'class',
    'disabled',
    'id',
  ]);

  const id = local.id ?? createUniqueId();
  const size = () => local.size ?? context.size();
  const isDisabled = () => local.disabled ?? context.disabled();
  const isChecked = () => context.value() === local.value;

  const handleChange = () => {
    if (!isDisabled()) {
      context.onChange(local.value);
    }
  };

  return (
    <label
      class={cn(
        'inline-flex items-start gap-2 cursor-pointer select-none',
        isDisabled() && 'opacity-50 cursor-not-allowed',
        local.class
      )}
    >
      <div class="relative flex items-center justify-center pt-0.5">
        <input
          type="radio"
          id={id}
          name={context.name()}
          value={local.value}
          checked={isChecked()}
          disabled={isDisabled()}
          onChange={handleChange}
          class="sr-only peer"
          {...rest}
        />
        <div
          class={cn(
            'rounded-full border-2 transition-colors duration-150',
            'flex items-center justify-center',
            sizeStyles[size()].outer,
            isChecked()
              ? 'border-primary bg-primary'
              : 'border-input bg-background hover:border-primary/50',
            isDisabled() && 'cursor-not-allowed',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2'
          )}
        >
          <div
            class={cn(
              'rounded-full bg-primary-foreground transition-transform duration-150',
              sizeStyles[size()].inner,
              isChecked() ? 'scale-100' : 'scale-0'
            )}
          />
        </div>
      </div>
      {(local.label || local.description) && (
        <div class="flex flex-col">
          {local.label && (
            <span class={cn('text-foreground', sizeStyles[size()].label)}>
              {local.label}
            </span>
          )}
          {local.description && (
            <span class={cn('text-muted-foreground', sizeStyles[size()].description)}>
              {local.description}
            </span>
          )}
        </div>
      )}
    </label>
  );
}

/** Convenience component for rendering a list of radio options */
export interface RadioListProps extends RadioGroupProps {
  /** Options to render */
  options: Array<{ value: string; label: string; description?: string; disabled?: boolean }>;
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
            disabled={option.disabled}
          />
        )}
      </For>
    </RadioGroup>
  );
}
