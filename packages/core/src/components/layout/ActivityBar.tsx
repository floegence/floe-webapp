import { type Component, For, Show, createMemo } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { deferNonBlocking } from '../../utils/defer';
import { Tooltip } from '../ui/Tooltip';

export interface ActivityBarItem {
  id: string;
  icon: Component<{ class?: string }>;
  label: string;
  badge?: number | string | (() => number | string | undefined);
  onClick?: () => void;
}

export interface ActivityBarProps {
  items: ActivityBarItem[];
  bottomItems?: ActivityBarItem[];
  activeId: string;
  onActiveChange: (id: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  class?: string;
}

/**
 * VSCode-style Activity Bar
 * Vertical icon strip on the left side
 */
export function ActivityBar(props: ActivityBarProps) {
  // Cache potentially-dynamic props under a reactive owner so reading them in event handlers
  // doesn't create detached computations (Solid warns when that happens).
  const activeId = createMemo(() => props.activeId);
  const collapsed = createMemo(() => props.collapsed ?? false);
  const onActiveChange = createMemo(() => props.onActiveChange);
  const onCollapsedChange = createMemo(() => props.onCollapsedChange);

  const handleItemClick = (item: ActivityBarItem) => {
    if (item.onClick) {
      // Defer custom callback execution to let UI update first (consistent with CommandContext.execute)
      deferNonBlocking(() => item.onClick!());
      return;
    }

    // Default behavior: toggle sidebar collapse or change active tab (lightweight, keep synchronous)
    const isActive = activeId() === item.id;
    const isCollapsed = collapsed();

    if (isActive && !isCollapsed) {
      onCollapsedChange()?.(true);
      return;
    }

    onActiveChange()(item.id);
    onCollapsedChange()?.(false);
  };

  return (
    <div
      class={cn(
        'w-10 md:w-12 flex flex-col justify-between shrink-0 min-h-0',
        'bg-activity-bar border-r border-border',
        props.class
      )}
    >
      {/* Top items */}
      <div class="flex flex-col">
        <For each={props.items}>
          {(item) => (
            <ActivityBarButton
              item={item}
              isActive={activeId() === item.id}
              onClick={() => handleItemClick(item)}
            />
          )}
        </For>
      </div>

      {/* Bottom items */}
      <Show when={props.bottomItems?.length}>
        <div class="flex flex-col">
          <For each={props.bottomItems}>
            {(item) => (
              <ActivityBarButton
                item={item}
                isActive={false}
                onClick={() => handleItemClick(item)}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

interface ActivityBarButtonProps {
  item: ActivityBarItem;
  isActive: boolean;
  onClick: () => void;
}

function ActivityBarButton(props: ActivityBarButtonProps) {
  const badgeValue = () => (
    typeof props.item.badge === 'function' ? props.item.badge() : props.item.badge
  );

  return (
    <Tooltip content={props.item.label} placement="right" delay={0}>
      <button
        type="button"
        class={cn(
          'relative w-full aspect-square flex items-center justify-center cursor-pointer',
          'transition-all duration-100',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset',
          props.isActive
            ? 'text-activity-bar-foreground-active bg-accent/80'
            : 'text-activity-bar-foreground hover:text-activity-bar-foreground-active hover:bg-accent/40'
        )}
        onClick={() => props.onClick()}
        aria-label={props.item.label}
        aria-pressed={props.isActive}
      >
        {/* Active indicator - positioned at left edge, full height */}
        <Show when={props.isActive}>
          <div class="absolute left-0 top-0 w-1 h-full bg-primary rounded-r" />
        </Show>

        {/* Icon */}
        <Dynamic component={props.item.icon} class="w-5 h-5" />

        {/* Badge */}
        <Show when={badgeValue()}>
          <span
            class={cn(
              'absolute top-0.5 right-0.5 min-w-3.5 h-3.5 px-1',
              'flex items-center justify-center',
              'text-[9px] font-medium rounded-full',
              'bg-activity-bar-badge text-activity-bar-badge-foreground'
            )}
          >
            {typeof badgeValue() === 'number' && (badgeValue() as number) > 99
              ? '99+'
              : badgeValue()}
          </span>
        </Show>
      </button>
    </Tooltip>
  );
}
