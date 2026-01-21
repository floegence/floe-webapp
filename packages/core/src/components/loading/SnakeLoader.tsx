import { For, createSignal, onCleanup, onMount } from 'solid-js';
import { cn } from '../../utils/cn';

export interface SnakeLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  speed?: 'slow' | 'normal' | 'fast';
  class?: string;
}

const sizeStyles = {
  sm: { grid: 'w-12 h-12', cell: 'w-3 h-3' },
  md: { grid: 'w-16 h-16', cell: 'w-4 h-4' },
  lg: { grid: 'w-24 h-24', cell: 'w-6 h-6' },
};

const speedMs = {
  slow: 200,
  normal: 120,
  fast: 80,
};

/**
 * 9-cell grid snake animation loader
 * The snake travels through cells in a continuous loop
 */
export function SnakeLoader(props: SnakeLoaderProps) {
  const size = () => props.size ?? 'md';
  const speed = () => props.speed ?? 'normal';

  // Snake path through the 3x3 grid (0-8)
  // Path: clockwise spiral - 0,1,2,5,8,7,6,3,4
  const snakePath = [0, 1, 2, 5, 8, 7, 6, 3, 4];

  const [position, setPosition] = createSignal(0);

  onMount(() => {
    const interval = setInterval(() => {
      setPosition((p) => (p + 1) % snakePath.length);
    }, speedMs[speed()]);

    onCleanup(() => clearInterval(interval));
  });

  // Get cells to highlight (snake body - 3 cells)
  const activeCells = () => {
    const pos = position();
    return [
      snakePath[pos],
      snakePath[(pos + snakePath.length - 1) % snakePath.length],
      snakePath[(pos + snakePath.length - 2) % snakePath.length],
    ];
  };

  return (
    <div
      class={cn('grid grid-cols-3 gap-1', sizeStyles[size()].grid, props.class)}
      role="status"
      aria-label="Loading"
    >
      <For each={[0, 1, 2, 3, 4, 5, 6, 7, 8]}>
        {(cellIndex) => {
          const isHead = () => activeCells()[0] === cellIndex;
          const isBody = () => activeCells().includes(cellIndex);

          return (
            <div
              class={cn(
                'rounded-sm transition-all',
                sizeStyles[size()].cell,
                isHead()
                  ? 'bg-primary scale-110'
                  : isBody()
                    ? 'bg-primary/60'
                    : 'bg-muted'
              )}
              style={{
                'transition-duration': `${speedMs[speed()] * 0.8}ms`,
              }}
            />
          );
        }}
      </For>
    </div>
  );
}
