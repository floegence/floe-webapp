import { For } from 'solid-js';
import { cn } from '../../utils/cn';

export interface SkeletonProps {
  class?: string;
}

/**
 * Skeleton placeholder with shimmer sweep effect
 */
export function Skeleton(props: SkeletonProps) {
  return (
    <div
      class={cn(
        'rounded-md floe-skeleton',
        props.class
      )}
    />
  );
}

/**
 * Common skeleton patterns
 */
export function SkeletonText(props: { lines?: number; class?: string }) {
  const lines = () => props.lines ?? 3;
  const indices = () => Array.from({ length: lines() }, (_, i) => i);

  return (
    <div class={cn('space-y-2', props.class)}>
      <For each={indices()}>
        {(i) => (
          <Skeleton
            class={cn('h-4', i === lines() - 1 ? 'w-3/4' : 'w-full')}
          />
        )}
      </For>
    </div>
  );
}

export function SkeletonCard(props: { class?: string }) {
  return (
    <div class={cn('rounded-lg border border-border p-4 space-y-4', props.class)}>
      <div class="flex items-center gap-3">
        <Skeleton class="h-10 w-10 rounded-full" />
        <div class="space-y-2 flex-1">
          <Skeleton class="h-4 w-1/3" />
          <Skeleton class="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonList(props: { count?: number; class?: string }) {
  const count = () => props.count ?? 5;
  const indices = () => Array.from({ length: count() }, (_, i) => i);

  return (
    <div class={cn('space-y-3', props.class)}>
      <For each={indices()}>
        {() => (
          <div class="flex items-center gap-3">
            <Skeleton class="h-8 w-8 rounded" />
            <div class="flex-1 space-y-1">
              <Skeleton class="h-4 w-2/3" />
              <Skeleton class="h-3 w-1/3" />
            </div>
          </div>
        )}
      </For>
    </div>
  );
}
