import { type Component, For, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';

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
  const handleItemClick = (item: ActivityBarItem) => {
    if (item.onClick) {
      item.onClick();
      return;
    }

    const isActive = props.activeId === item.id;
    const isCollapsed = props.collapsed ?? false;

    if (isActive && !isCollapsed) {
      props.onCollapsedChange?.(true);
      return;
    }

    props.onActiveChange(item.id);
    props.onCollapsedChange?.(false);
  };

  return (
    <div
      class={cn(
        'w-12 flex flex-col justify-between shrink-0 min-h-0',
        'bg-activity-bar border-r border-border',
        props.class
      )}
    >
      {/* Top items */}
      <div class="flex flex-col items-center py-1.5 gap-0.5">
        <For each={props.items}>
          {(item) => (
            <ActivityBarButton
              item={item}
              isActive={props.activeId === item.id}
              onClick={() => handleItemClick(item)}
            />
          )}
        </For>
      </div>

      {/* Bottom items */}
      <Show when={props.bottomItems?.length}>
        <div class="flex flex-col items-center py-1.5 gap-0.5">
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
    <button
      type="button"
      class={cn(
        'relative w-9 h-9 flex items-center justify-center rounded cursor-pointer',
        'transition-all duration-100',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        props.isActive
          ? 'text-activity-bar-foreground-active bg-accent/80'
          : 'text-activity-bar-foreground hover:text-activity-bar-foreground-active hover:bg-accent/40'
      )}
      onClick={() => props.onClick()}
      title={props.item.label}
      aria-label={props.item.label}
      aria-pressed={props.isActive}
    >
      {/* Active indicator - positioned to touch left edge of activity bar */}
      <Show when={props.isActive}>
        <div class="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-7 bg-primary rounded-r" />
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
  );
}
