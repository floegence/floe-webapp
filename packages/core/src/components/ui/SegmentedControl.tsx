import {
  splitProps,
  For,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  untrack,
  type JSX,
  type Component,
} from 'solid-js';
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

export interface SegmentedControlProps extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'onChange'
> {
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

/* Segment heights follow the shared control scale so a segmented control and a
 * Button of the same size sit on one baseline in an action row. The padding
 * ring around the segments is the gap half of the concentric radius: a 10px
 * segment inside a 12px rail with 2px of ring lands exactly parallel. */
const sizeStyles: Record<
  SegmentedControlSize,
  { container: string; button: string; icon: string }
> = {
  sm: {
    container: 'p-0.5 gap-0.5',
    button: 'h-[var(--floe-control-height-xs)] px-[var(--floe-control-padding-sm)] rounded-sm',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'p-0.5 gap-0.5',
    button: 'h-[var(--floe-control-height-sm)] px-[var(--floe-control-padding-md)] rounded-sm',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'p-1 gap-0.5',
    button: 'h-[var(--floe-control-height-md)] px-[var(--floe-control-padding-lg)] rounded-md',
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

  let rail: HTMLDivElement | undefined;
  let face: HTMLSpanElement | undefined;
  const buttons = new Map<string, HTMLButtonElement>();
  const [pill, setPill] = createSignal<{ x: number; y: number; width: number; height: number }>();
  let observer: ResizeObserver | undefined;
  let animation: Animation | undefined;
  let selected: string | undefined;
  const measure = () => {
    const button = buttons.get(local.value);
    if (!rail || !button) {
      animation?.cancel();
      setPill(undefined);
      selected = undefined;
      return;
    }
    if (!button.offsetWidth || !rail.getClientRects().length) return;
    const next = {
      x: button.offsetLeft,
      y: button.offsetTop,
      width: button.offsetWidth,
      height: button.offsetHeight,
    };
    const previous = untrack(pill);
    if (
      previous &&
      Object.keys(next).every(
        (key) => next[key as keyof typeof next] === previous[key as keyof typeof next]
      ) &&
      selected === local.value
    )
      return;
    const moving =
      previous &&
      selected !== local.value &&
      face &&
      !window.matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)').matches;
    const before = moving ? getComputedStyle(face!) : undefined;
    const from = before ? { transform: before.transform, width: before.width } : undefined;
    animation?.cancel();
    setPill(next);
    selected = local.value;
    if (from && face) {
      const style = getComputedStyle(rail);
      const durationToken = style.getPropertyValue('--floe-duration-slow').trim();
      const duration = parseFloat(durationToken) * (durationToken.endsWith('ms') ? 1 : 1000);
      animation = face.animate(
        [from, { transform: `translate(${next.x}px, ${next.y}px)`, width: `${next.width}px` }],
        {
          // Position changes need visible travel: the fast entrance curve
          // covers almost 90% of this short rail in its first 60ms.
          duration: Number.isFinite(duration) ? duration : 280,
          easing: style.getPropertyValue('--floe-ease-in-out').trim() || 'ease-in-out',
        }
      );
      animation.id = 'floe-segmented-selection';
    }
  };
  createEffect(() => {
    void local.value;
    void local.options;
    void local.size;
    measure();
  });
  onMount(() => {
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(rail!);
      for (const button of buttons.values()) observer.observe(button);
    }
    measure();
  });
  onCleanup(() => {
    observer?.disconnect();
    animation?.cancel();
  });

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
      ref={rail}
      data-floe-segmented-pill={pill() ? 'true' : undefined}
      data-floe-segmented-motion={pill() ? 'ready' : undefined}
      role="group"
      data-floe-surface="inset"
      data-floe-surface-part="rail"
      class={cn(
        'floe-segmented-control relative inline-flex items-center border',
        'rounded-group',
        'text-[length:var(--floe-type-control)] leading-[var(--floe-line-control)]',
        styles().container,
        local.disabled && 'opacity-50 pointer-events-none',
        local.class
      )}
      {...rest}
    >
      <span
        ref={face}
        aria-hidden="true"
        class={cn('floe-segmented-control__pill', size() === 'lg' ? 'rounded-md' : 'rounded-sm')}
        style={{
          visibility: pill() ? 'visible' : 'hidden',
          transform: `translate(${pill()?.x ?? 0}px, ${pill()?.y ?? 0}px)`,
          width: `${pill()?.width ?? 0}px`,
          height: `${pill()?.height ?? 0}px`,
        }}
      />
      <For each={local.options}>
        {(option) => {
          const isSelected = () => local.value === option.value;
          const isDisabled = () => local.disabled || option.disabled;

          return (
            <button
              ref={(element) => {
                buttons.set(option.value, element);
                observer?.observe(element);
                onCleanup(() => {
                  observer?.unobserve(element);
                  buttons.delete(option.value);
                });
              }}
              aria-label={option.label}
              title={option.label}
              type="button"
              role="radio"
              data-floe-surface={isSelected() ? 'raised' : 'flat'}
              data-floe-surface-part="segment"
              data-floe-interactive="item"
              aria-checked={isSelected()}
              disabled={isDisabled()}
              onClick={() => handleClick(option.value, option.disabled)}
              class={cn(
                'floe-segmented-control__item relative font-medium cursor-pointer border',
                'transition-[background-color,border-color,color,box-shadow] duration-[var(--floe-duration-fast)] ease-[var(--floe-ease-out)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--floe-plane)]',
                styles().button,
                isSelected()
                  ? 'text-[var(--primary-foreground)]'
                  : 'text-[var(--floe-ink-soft)] hover:text-foreground',
                isDisabled() && 'cursor-not-allowed opacity-50'
              )}
            >
              <span class="inline-flex items-center gap-1.5">
                {option.icon && <option.icon class={styles().icon} />}
                <span class="floe-segmented-control__label">{option.label}</span>
              </span>
            </button>
          );
        }}
      </For>
    </div>
  );
}
