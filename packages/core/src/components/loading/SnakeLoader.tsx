import { For } from 'solid-js';
import { cn } from '../../utils/cn';

export interface SnakeLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  speed?: 'slow' | 'normal' | 'fast';
  class?: string;
}

const sizeStyles = {
  sm: 'w-6 h-6 gap-[2px]',
  md: 'w-9 h-9 gap-[3px]',
  lg: 'w-12 h-12 gap-1',
};

const speedConfig = {
  slow: { duration: '2.4s', step: 0.15 },
  normal: { duration: '1.8s', step: 0.12 },
  fast: { duration: '1.2s', step: 0.08 },
};

// Diagonal wave: delay multiplier = row + col
// 0 1 2
// 1 2 3
// 2 3 4
const waveFactor = [0, 1, 2, 1, 2, 3, 2, 3, 4];

/**
 * 9-cell grid loader with diagonal light wave
 */
export function SnakeLoader(props: SnakeLoaderProps) {
  const size = () => props.size ?? 'md';
  const speed = () => props.speed ?? 'normal';
  const cfg = () => speedConfig[speed()];

  return (
    <div
      class={cn('grid grid-cols-3', sizeStyles[size()], props.class)}
      role="status"
      aria-label="Loading"
    >
      <For each={[0, 1, 2, 3, 4, 5, 6, 7, 8]}>
        {(i) => (
          <div
            class="floe-grid-cell bg-primary"
            style={{
              '--floe-grid-dur': cfg().duration,
              '--floe-grid-delay': `${waveFactor[i] * cfg().step}s`,
            }}
          />
        )}
      </For>
    </div>
  );
}
