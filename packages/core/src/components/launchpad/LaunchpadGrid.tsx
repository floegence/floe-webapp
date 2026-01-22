import { For, Show } from 'solid-js';
import { LaunchpadItem, type LaunchpadItemData } from './LaunchpadItem';

export interface LaunchpadGridProps {
  items: LaunchpadItemData[];
  onItemClick?: (item: LaunchpadItemData) => void;
  columns?: number;
  animating?: boolean;
}

export function LaunchpadGrid(props: LaunchpadGridProps) {
  const columns = () => props.columns ?? 5;

  return (
    <div class="launchpad-grid w-full h-full flex items-center justify-center p-8">
      <Show
        when={props.items.length > 0}
        fallback={
          <div class="text-white/50 text-xs">No apps found</div>
        }
      >
        <div
          class="grid gap-4 place-items-center"
          style={{
            'grid-template-columns': `repeat(${columns()}, minmax(0, 1fr))`,
            'max-width': `${columns() * 120}px`,
          }}
        >
          <For each={props.items}>
            {(item, index) => (
              <LaunchpadItem
                item={item}
                index={index()}
                onClick={props.onItemClick}
                style={{
                  animation: props.animating !== false
                    ? 'launchpad-item-enter 0.4s ease-out forwards'
                    : undefined,
                  opacity: props.animating !== false ? 0 : 1,
                }}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
