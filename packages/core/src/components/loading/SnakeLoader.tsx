import { For, createSignal, onCleanup, onMount } from 'solid-js';
import { cn } from '../../utils/cn';

export interface SnakeLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  speed?: 'slow' | 'normal' | 'fast';
  class?: string;
}

const sizeStyles = {
  sm: { grid: 'w-12 h-12', cell: 'w-3 h-3', center: 'w-2.5 h-2.5' },
  md: { grid: 'w-16 h-16', cell: 'w-4 h-4', center: 'w-3 h-3' },
  lg: { grid: 'w-24 h-24', cell: 'w-6 h-6', center: 'w-5 h-5' },
};

const speedMs = {
  slow: 200,
  normal: 120,
  fast: 80,
};

// Trail config: [opacity percentage, scale] for each position (head to tail)
const trailConfig = [
  [100, 1.1],   // head: full opacity, slightly larger
  [85, 1.05],   // trail 1: smooth transition
  [65, 1],      // trail 2
  [40, 0.95],   // trail 3: fading out
];

/**
 * 9-cell grid loader with breathing center and rotating trail
 */
export function SnakeLoader(props: SnakeLoaderProps) {
  const size = () => props.size ?? 'md';
  const speed = () => props.speed ?? 'normal';

  // Outer ring path (clockwise): top-left, top, top-right, right, bottom-right, bottom, bottom-left, left
  const outerRing = [0, 1, 2, 5, 8, 7, 6, 3];

  const [position, setPosition] = createSignal(0);

  onMount(() => {
    const interval = setInterval(() => {
      setPosition((p) => (p + 1) % outerRing.length);
    }, speedMs[speed()]);

    onCleanup(() => clearInterval(interval));
  });

  // Get trail position for each cell (0 = head, 1-3 = trail, -1 = inactive)
  const getTrailPosition = (cellIndex: number) => {
    const pos = position();
    for (let i = 0; i < trailConfig.length; i++) {
      const trailIndex = outerRing[(pos + outerRing.length - i) % outerRing.length];
      if (trailIndex === cellIndex) return i;
    }
    return -1;
  };

  return (
    <div
      class={cn('grid grid-cols-3 gap-1', sizeStyles[size()].grid, props.class)}
      role="status"
      aria-label="Loading"
    >
      <For each={[0, 1, 2, 3, 4, 5, 6, 7, 8]}>
        {(cellIndex) => {
          const isCenter = cellIndex === 4;
          const trailPos = () => isCenter ? -1 : getTrailPosition(cellIndex);

          return (
            <div
              class={cn(
                'flex items-center justify-center rounded-sm',
                sizeStyles[size()].cell,
                isCenter && 'bg-transparent'
              )}
              style={
                isCenter
                  ? {}
                  : {
                      'background-color': trailPos() >= 0
                        ? `color-mix(in srgb, var(--primary) ${trailConfig[trailPos()]?.[0] ?? 0}%, transparent)`
                        : 'var(--muted)',
                      transform: `scale(${trailPos() >= 0 ? trailConfig[trailPos()]?.[1] ?? 1 : 1})`,
                      'transition-property': 'background-color, transform',
                      'transition-duration': `${speedMs[speed()] * 0.9}ms`,
                      'transition-timing-function': 'ease-out',
                    }
              }
            >
              {isCenter && (
                <div
                  class={cn(
                    'rounded-sm bg-primary',
                    sizeStyles[size()].center
                  )}
                  style={{
                    animation: 'snakeBreathing 1.5s ease-in-out infinite',
                  }}
                />
              )}
            </div>
          );
        }}
      </For>
      <style>{`
        @keyframes snakeBreathing {
          0%, 100% {
            opacity: 0.5;
            transform: scale(0.85);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
