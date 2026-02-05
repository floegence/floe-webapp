import { splitProps, For, type JSX, type Component } from 'solid-js';
import { cn } from '../../utils/cn';

export type SegmentedControlSize = 'sm' | 'md' | 'lg';

export interface SegmentedControlOption {
  /** Unique value for this option */
  value: string;
  /** Display label */
  label: string;
  /** Optional icon component */
  icon?: Component<{ class?: string }>;
  /** Whether this option is disabled */
  disabled?: boolean;
}

export interface SegmentedControlProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Currently selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Available options */
  options: SegmentedControlOption[];
  /** Size variant */
  size?: SegmentedControlSize;
  /** Whether the entire control is disabled */
  disabled?: boolean;
}

const sizeStyles: Record<SegmentedControlSize, { container: string; button: string; icon: string }> = {
  sm: {
    container: 'p-0.5 gap-0.5',
    button: 'px-2 py-1 text-[11px]',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'p-0.5 gap-0.5',
    button: 'px-3 py-1.5 text-xs',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'p-1 gap-1',
    button: 'px-4 py-2 text-sm',
    icon: 'w-4 h-4',
  },
};

/**
 * SegmentedControl - A toggle button group for switching between options
 *
 * Common use cases:
 * - View mode switching (e.g., UI/JSON, List/Grid)
 * - Tab-like navigation within a section
 * - Filter toggles
 *
 * @example
 * ```tsx
 * <SegmentedControl
 *   value={viewMode()}
 *   onChange={setViewMode}
 *   options={[
 *     { value: 'ui', label: 'UI' },
 *     { value: 'json', label: 'JSON' },
 *   ]}
 * />
 * ```
 */
export function SegmentedControl(props: SegmentedControlProps) {
  const [local, rest] = splitProps(props, [
    'value',
    'onChange',
    'options',
    'size',
    'disabled',
    'class',
  ]);

  const size = () => local.size ?? 'md';
  const styles = () => sizeStyles[size()];

  const handleClick = (optionValue: string, optionDisabled?: boolean) => {
    if (local.disabled || optionDisabled) return;
    if (optionValue !== local.value) {
      local.onChange(optionValue);
    }
  };

  return (
    <div
      role="group"
      class={cn(
        'inline-flex items-center rounded-lg border border-border bg-muted/40',
        styles().container,
        local.disabled && 'opacity-50 pointer-events-none',
        local.class
      )}
      {...rest}
    >
      <For each={local.options}>
        {(option) => {
          const isSelected = () => local.value === option.value;
          const isDisabled = () => local.disabled || option.disabled;

          return (
            <button
              type="button"
              role="radio"
              aria-checked={isSelected()}
              disabled={isDisabled()}
              onClick={() => handleClick(option.value, option.disabled)}
              class={cn(
                'font-medium rounded-md transition-all duration-150 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                styles().button,
                isSelected()
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent',
                isDisabled() && 'cursor-not-allowed opacity-50'
              )}
            >
              <span class="inline-flex items-center gap-1.5">
                {option.icon && <option.icon class={styles().icon} />}
                {option.label}
              </span>
            </button>
          );
        }}
      </For>
    </div>
  );
}
