import { splitProps, type JSX, Show, For } from 'solid-js';
import { cn } from '../../utils/cn';

export type ProgressSize = 'sm' | 'md' | 'lg';
export type ProgressColor = 'primary' | 'success' | 'warning' | 'error' | 'info';

// ===========================
// Linear Progress
// ===========================
export interface LinearProgressProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Progress value (0-100) */
  value?: number;
  /** Maximum value */
  max?: number;
  /** Size variant */
  size?: ProgressSize;
  /** Color variant */
  color?: ProgressColor;
  /** Show percentage label */
  showLabel?: boolean;
  /** Custom label format */
  labelFormat?: (value: number, max: number) => string;
  /** Show striped pattern */
  striped?: boolean;
  /** Animate stripes */
  animated?: boolean;
  /** Indeterminate state (loading) */
  indeterminate?: boolean;
  /** Show buffer (secondary progress) */
  buffer?: number;
}

const linearSizeStyles: Record<ProgressSize, { track: string; label: string }> = {
  sm: { track: 'h-1', label: 'text-[10px]' },
  md: { track: 'h-2', label: 'text-xs' },
  lg: { track: 'h-3', label: 'text-xs' },
};

const colorStyles: Record<ProgressColor, { bar: string; text: string }> = {
  primary: { bar: 'bg-primary', text: 'text-primary' },
  success: { bar: 'bg-emerald-500', text: 'text-emerald-500' },
  warning: { bar: 'bg-amber-500', text: 'text-amber-500' },
  error: { bar: 'bg-red-500', text: 'text-red-500' },
  info: { bar: 'bg-sky-500', text: 'text-sky-500' },
};

export function LinearProgress(props: LinearProgressProps) {
  const [local, rest] = splitProps(props, [
    'value',
    'max',
    'size',
    'color',
    'showLabel',
    'labelFormat',
    'striped',
    'animated',
    'indeterminate',
    'buffer',
    'class',
  ]);

  const size = () => local.size ?? 'md';
  const color = () => local.color ?? 'primary';
  const max = () => local.max ?? 100;
  const value = () => Math.min(Math.max(local.value ?? 0, 0), max());
  const percentage = () => (value() / max()) * 100;
  const bufferPercentage = () => local.buffer ? Math.min((local.buffer / max()) * 100, 100) : 0;

  const label = () => {
    if (local.labelFormat) {
      return local.labelFormat(value(), max());
    }
    return `${Math.round(percentage())}%`;
  };

  return (
    <div class={cn('w-full', local.class)} {...rest}>
      <Show when={local.showLabel}>
        <div class="flex justify-between mb-1">
          <span class={cn('text-muted-foreground', linearSizeStyles[size()].label)}>
            Progress
          </span>
          <span class={cn('font-medium tabular-nums', linearSizeStyles[size()].label, colorStyles[color()].text)}>
            {label()}
          </span>
        </div>
      </Show>
      <div
        class={cn(
          'relative w-full overflow-hidden rounded-full bg-muted',
          linearSizeStyles[size()].track
        )}
        role="progressbar"
        aria-valuenow={local.indeterminate ? undefined : value()}
        aria-valuemin={0}
        aria-valuemax={max()}
      >
        {/* Buffer bar */}
        <Show when={local.buffer}>
          <div
            class="absolute inset-0 bg-muted-foreground/20 transition-all duration-300 rounded-full"
            style={{ width: `${bufferPercentage()}%` }}
          />
        </Show>

        {/* Main progress bar */}
        <div
          class={cn(
            'h-full rounded-full transition-all duration-300',
            colorStyles[color()].bar,
            local.striped && 'bg-striped',
            local.animated && local.striped && 'animate-stripe',
            local.indeterminate && 'animate-indeterminate w-1/3'
          )}
          style={local.indeterminate ? undefined : { width: `${percentage()}%` }}
        />
      </div>

      {/* Inline styles for animations */}
      <style>{`
        .bg-striped {
          background-image: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.15) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 255, 255, 0.15) 75%,
            transparent 75%,
            transparent
          );
          background-size: 1rem 1rem;
        }
        @keyframes stripe {
          from { background-position: 1rem 0; }
          to { background-position: 0 0; }
        }
        .animate-stripe {
          animation: stripe 1s linear infinite;
        }
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .animate-indeterminate {
          animation: indeterminate 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// ===========================
// Circular Progress
// ===========================
export interface CircularProgressProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Progress value (0-100) */
  value?: number;
  /** Maximum value */
  max?: number;
  /** Size in pixels or preset */
  size?: ProgressSize | number;
  /** Stroke width */
  strokeWidth?: number;
  /** Color variant */
  color?: ProgressColor;
  /** Show percentage label in center */
  showLabel?: boolean;
  /** Custom label format */
  labelFormat?: (value: number, max: number) => string;
  /** Indeterminate state (loading) */
  indeterminate?: boolean;
  /** Track color visible */
  showTrack?: boolean;
}

const circularSizeMap: Record<ProgressSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

export function CircularProgress(props: CircularProgressProps) {
  const [local, rest] = splitProps(props, [
    'value',
    'max',
    'size',
    'strokeWidth',
    'color',
    'showLabel',
    'labelFormat',
    'indeterminate',
    'showTrack',
    'class',
  ]);

  const pixelSize = () => {
    const s = local.size ?? 'md';
    return typeof s === 'number' ? s : circularSizeMap[s];
  };

  const strokeWidth = () => local.strokeWidth ?? (pixelSize() / 10);
  const color = () => local.color ?? 'primary';
  const max = () => local.max ?? 100;
  const value = () => Math.min(Math.max(local.value ?? 0, 0), max());
  const percentage = () => (value() / max()) * 100;

  const radius = () => (pixelSize() - strokeWidth()) / 2;
  const circumference = () => 2 * Math.PI * radius();
  const strokeDashoffset = () => circumference() - (percentage() / 100) * circumference();

  const label = () => {
    if (local.labelFormat) {
      return local.labelFormat(value(), max());
    }
    return `${Math.round(percentage())}%`;
  };

  const labelSize = () => {
    const s = pixelSize();
    if (s <= 32) return 'text-[8px]';
    if (s <= 48) return 'text-[10px]';
    if (s <= 64) return 'text-xs';
    return 'text-sm';
  };

  return (
    <div
      class={cn('relative inline-flex items-center justify-center', local.class)}
      style={{ width: `${pixelSize()}px`, height: `${pixelSize()}px` }}
      role="progressbar"
      aria-valuenow={local.indeterminate ? undefined : value()}
      aria-valuemin={0}
      aria-valuemax={max()}
      {...rest}
    >
      <svg
        class={cn('transform -rotate-90', local.indeterminate && 'animate-spin')}
        width={pixelSize()}
        height={pixelSize()}
      >
        {/* Track */}
        <Show when={local.showTrack !== false}>
          <circle
            cx={pixelSize() / 2}
            cy={pixelSize() / 2}
            r={radius()}
            fill="none"
            stroke="currentColor"
            stroke-width={strokeWidth()}
            class="text-muted"
          />
        </Show>

        {/* Progress */}
        <circle
          cx={pixelSize() / 2}
          cy={pixelSize() / 2}
          r={radius()}
          fill="none"
          stroke="currentColor"
          stroke-width={strokeWidth()}
          stroke-linecap="round"
          stroke-dasharray={String(circumference())}
          stroke-dashoffset={local.indeterminate ? circumference() * 0.75 : strokeDashoffset()}
          class={cn(
            'transition-all duration-300',
            colorStyles[color()].text
          )}
        />
      </svg>

      {/* Label */}
      <Show when={local.showLabel && !local.indeterminate}>
        <span class={cn(
          'absolute font-medium tabular-nums',
          labelSize(),
          colorStyles[color()].text
        )}>
          {label()}
        </span>
      </Show>
    </div>
  );
}

// ===========================
// Segmented Progress
// ===========================
export interface SegmentedProgressProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Progress value (0-100) */
  value?: number;
  /** Maximum value */
  max?: number;
  /** Number of segments */
  segments?: number;
  /** Size variant */
  size?: ProgressSize;
  /** Color variant */
  color?: ProgressColor;
  /** Show percentage label */
  showLabel?: boolean;
  /** Gap between segments */
  gap?: number;
}

export function SegmentedProgress(props: SegmentedProgressProps) {
  const [local, rest] = splitProps(props, [
    'value',
    'max',
    'segments',
    'size',
    'color',
    'showLabel',
    'gap',
    'class',
  ]);

  const size = () => local.size ?? 'md';
  const color = () => local.color ?? 'primary';
  const max = () => local.max ?? 100;
  const segments = () => local.segments ?? 5;
  const gap = () => local.gap ?? 2;
  const value = () => Math.min(Math.max(local.value ?? 0, 0), max());
  const percentage = () => (value() / max()) * 100;

  const filledSegments = () => Math.round((percentage() / 100) * segments());

  return (
    <div class={cn('w-full', local.class)} {...rest}>
      <Show when={local.showLabel}>
        <div class="flex justify-between mb-1">
          <span class={cn('text-muted-foreground', linearSizeStyles[size()].label)}>
            Progress
          </span>
          <span class={cn('font-medium tabular-nums', linearSizeStyles[size()].label, colorStyles[color()].text)}>
            {Math.round(percentage())}%
          </span>
        </div>
      </Show>
      <div
        class="flex"
        style={{ gap: `${gap()}px` }}
        role="progressbar"
        aria-valuenow={value()}
        aria-valuemin={0}
        aria-valuemax={max()}
      >
        <For each={Array.from({ length: segments() })}>
          {(_, index) => (
            <div
              class={cn(
                'flex-1 rounded-full transition-colors duration-200',
                linearSizeStyles[size()].track,
                index() < filledSegments() ? colorStyles[color()].bar : 'bg-muted'
              )}
            />
          )}
        </For>
      </div>
    </div>
  );
}

// ===========================
// Steps Progress
// ===========================
export interface StepsProgressProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Current step (0-indexed) */
  current: number;
  /** Step labels */
  steps: string[];
  /** Size variant */
  size?: ProgressSize;
  /** Color variant */
  color?: ProgressColor;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
}

const stepSizeStyles: Record<ProgressSize, { dot: string; label: string; connector: string }> = {
  sm: { dot: 'w-5 h-5 text-[10px]', label: 'text-[10px]', connector: 'h-0.5' },
  md: { dot: 'w-6 h-6 text-xs', label: 'text-xs', connector: 'h-0.5' },
  lg: { dot: 'w-8 h-8 text-sm', label: 'text-sm', connector: 'h-1' },
};

export function StepsProgress(props: StepsProgressProps) {
  const [local, rest] = splitProps(props, [
    'current',
    'steps',
    'size',
    'color',
    'orientation',
    'class',
  ]);

  const size = () => local.size ?? 'md';
  const color = () => local.color ?? 'primary';
  const isVertical = () => local.orientation === 'vertical';

  const getStepState = (index: number) => {
    if (index < local.current) return 'completed';
    if (index === local.current) return 'current';
    return 'pending';
  };

  return (
    <div
      class={cn(
        'flex',
        isVertical() ? 'flex-col' : 'flex-row items-start',
        local.class
      )}
      {...rest}
    >
      <For each={local.steps}>
        {(step, index) => {
          const state = () => getStepState(index());
          const isLast = () => index() === local.steps.length - 1;

          return (
            <div class={cn(
              'flex',
              isVertical() ? 'flex-row' : 'flex-col items-center',
              !isLast() && 'flex-1'
            )}>
              <div class={cn(
                'flex items-center',
                isVertical() ? 'flex-col' : 'flex-row w-full'
              )}>
                {/* Step dot */}
                <div class={cn(
                  'flex items-center justify-center rounded-full font-medium transition-colors duration-200 shrink-0',
                  stepSizeStyles[size()].dot,
                  state() === 'completed' && cn(colorStyles[color()].bar, 'text-primary-foreground'),
                  state() === 'current' && cn('border-2', `border-current ${colorStyles[color()].text}`, 'bg-background'),
                  state() === 'pending' && 'bg-muted text-muted-foreground'
                )}>
                  {state() === 'completed' ? (
                    <svg class="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 6l3 3 5-6" />
                    </svg>
                  ) : (
                    index() + 1
                  )}
                </div>

                {/* Connector */}
                <Show when={!isLast()}>
                  <div class={cn(
                    'transition-colors duration-200',
                    isVertical()
                      ? cn('w-0.5 h-8 my-1', index() < local.current ? colorStyles[color()].bar : 'bg-muted')
                      : cn('flex-1 mx-2', stepSizeStyles[size()].connector, index() < local.current ? colorStyles[color()].bar : 'bg-muted')
                  )} />
                </Show>
              </div>

              {/* Label */}
              <span class={cn(
                'mt-2 text-center',
                stepSizeStyles[size()].label,
                state() === 'current' ? 'text-foreground font-medium' : 'text-muted-foreground',
                isVertical() && 'ml-3 mt-0'
              )}>
                {step}
              </span>
            </div>
          );
        }}
      </For>
    </div>
  );
}
