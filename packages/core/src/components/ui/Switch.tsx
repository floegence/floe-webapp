import { splitProps, type JSX, Show, createUniqueId } from 'solid-js';
import { cn } from '../../utils/cn';

export type SwitchSize = 'sm' | 'md' | 'lg';

export interface SwitchProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'size'> {
  /** Whether the switch is on */
  checked?: boolean;
  /** Callback when state changes */
  onChange?: (checked: boolean) => void;
  /** Size of the switch */
  size?: SwitchSize;
  /** Label text */
  label?: string;
  /** Description text */
  description?: string;
  /** Position of label relative to switch */
  labelPosition?: 'left' | 'right';
}

const sizeStyles: Record<SwitchSize, {
  track: string;
  thumb: string;
  thumbTranslate: string;
  label: string;
  description: string;
  trackHeight: number;
}> = {
  sm: {
    track: 'w-7 h-4',
    thumb: 'w-3 h-3',
    thumbTranslate: 'translate-x-3',
    label: 'text-xs leading-4',
    description: 'text-[10px] leading-3',
    trackHeight: 16,
  },
  md: {
    track: 'w-9 h-5',
    thumb: 'w-4 h-4',
    thumbTranslate: 'translate-x-4',
    label: 'text-xs leading-5',
    description: 'text-[11px] leading-4',
    trackHeight: 20,
  },
  lg: {
    track: 'w-11 h-6',
    thumb: 'w-5 h-5',
    thumbTranslate: 'translate-x-5',
    label: 'text-sm leading-6',
    description: 'text-xs leading-4',
    trackHeight: 24,
  },
};

export function Switch(props: SwitchProps) {
  const [local, rest] = splitProps(props, [
    'checked',
    'onChange',
    'size',
    'label',
    'description',
    'labelPosition',
    'class',
    'disabled',
    'id',
  ]);

  const id = () => local.id ?? createUniqueId();
  const size = () => local.size ?? 'md';
  const styles = () => sizeStyles[size()];
  const labelPos = () => local.labelPosition ?? 'right';

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    local.onChange?.(target.checked);
  };

  const SwitchControl = () => (
    <div class="relative inline-flex items-center shrink-0">
      <input
        type="checkbox"
        role="switch"
        id={id()}
        checked={local.checked}
        disabled={local.disabled}
        onChange={handleChange}
        class="sr-only peer"
        aria-checked={local.checked}
        {...rest}
      />
      <div
        class={cn(
          'rounded-full transition-colors duration-200 cursor-pointer',
          styles().track,
          local.checked ? 'bg-primary' : 'bg-input',
          local.disabled && 'opacity-50 cursor-not-allowed',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2'
        )}
      >
        <div
          class={cn(
            'rounded-full bg-background shadow-sm transition-transform duration-200',
            styles().thumb,
            'absolute top-0.5 left-0.5',
            local.checked && styles().thumbTranslate
          )}
        />
      </div>
    </div>
  );

  const LabelContent = () => (
    <Show when={local.label || local.description}>
      <div class="flex flex-col justify-center min-h-0">
        <Show when={local.label}>
          <span class={cn('text-foreground', styles().label)}>
            {local.label}
          </span>
        </Show>
        <Show when={local.description}>
          <span class={cn('text-muted-foreground', styles().description)}>
            {local.description}
          </span>
        </Show>
      </div>
    </Show>
  );

  // Use items-center when there's only a label, items-start when there's a description
  const alignmentClass = () => local.description ? 'items-start' : 'items-center';

  return (
    <label
      class={cn(
        'inline-flex gap-2 cursor-pointer select-none',
        alignmentClass(),
        local.disabled && 'opacity-50 cursor-not-allowed',
        local.class
      )}
    >
      <Show when={labelPos() === 'left'}>
        <LabelContent />
      </Show>
      <SwitchControl />
      <Show when={labelPos() === 'right'}>
        <LabelContent />
      </Show>
    </label>
  );
}
