import { type Component, For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';

export interface MobileTabBarItem {
  id: string;
  icon: Component<{ class?: string }>;
  label: string;
  badge?: number | string | (() => number | string | undefined);
}

export interface MobileTabBarProps {
  items: MobileTabBarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  class?: string;
}

/**
 * Mobile-optimized bottom tab bar with horizontal scrolling
 */
export function MobileTabBar(props: MobileTabBarProps) {
  let scrollRef: HTMLDivElement | undefined;
  const [canScrollLeft, setCanScrollLeft] = createSignal(false);
  const [canScrollRight, setCanScrollRight] = createSignal(false);
  let rafId: number | null = null;

  const checkScroll = () => {
    if (!scrollRef) return;
    setCanScrollLeft(scrollRef.scrollLeft > 0);
    setCanScrollRight(scrollRef.scrollLeft < scrollRef.scrollWidth - scrollRef.clientWidth - 1);
  };

  const scheduleCheckScroll = () => {
    if (rafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') {
      checkScroll();
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = null;
      checkScroll();
    });
  };

  onMount(() => {
    checkScroll();
    // Scroll active item into view
    const activeIndex = props.items.findIndex((item) => item.id === props.activeId);
    if (activeIndex > 0 && scrollRef) {
      const itemWidth = scrollRef.scrollWidth / props.items.length;
      scrollRef.scrollLeft = Math.max(0, itemWidth * activeIndex - scrollRef.clientWidth / 2 + itemWidth / 2);
    }
  });

  onCleanup(() => {
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  return (
    <nav
      class={cn(
        // Same safe-area rule as TopBar: keep the visual bar height stable, and
        // add safe-area padding on an outer wrapper (avoid squeezing content).
        'relative shrink-0 bg-background border-t border-border safe-bottom safe-left safe-right',
        props.class
      )}
    >
      <div class="relative h-14">
        {/* Scroll indicators */}
        <Show when={canScrollLeft()}>
          <div class="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        </Show>
        <Show when={canScrollRight()}>
          <div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        </Show>

        {/* Tab items */}
        <div
          ref={scrollRef}
          class="h-full flex items-center overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          style={{ '-webkit-overflow-scrolling': 'touch' }}
          onScroll={scheduleCheckScroll}
        >
          <For each={props.items}>
            {(item) => (
              <MobileTabItem
                item={item}
                isActive={props.activeId === item.id}
                onClick={() => {
                  props.onSelect(item.id);
                  // Haptic feedback on iOS
                  if ('vibrate' in navigator) {
                    navigator.vibrate(10);
                  }
                }}
              />
            )}
          </For>
        </div>
      </div>
    </nav>
  );
}

interface MobileTabItemProps {
  item: MobileTabBarItem;
  isActive: boolean;
  onClick: () => void;
}

function MobileTabItem(props: MobileTabItemProps) {
  const badgeValue = () => (
    typeof props.item.badge === 'function' ? props.item.badge() : props.item.badge
  );

  return (
    <button
      type="button"
      class={cn(
        'relative flex-shrink-0 flex flex-col items-center justify-center',
        'min-w-16 h-full px-4 snap-center',
        'transition-all duration-150',
        'focus:outline-none focus-visible:bg-muted',
        props.isActive
          ? 'text-primary'
          : 'text-muted-foreground active:text-foreground'
      )}
      onClick={() => props.onClick()}
      aria-label={props.item.label}
      aria-selected={props.isActive}
      role="tab"
    >
      {/* Icon with scale animation */}
      <div
        class={cn(
          'relative transition-transform duration-150',
          props.isActive && 'scale-110'
        )}
      >
        <Dynamic component={props.item.icon} class="w-6 h-6" />
        {/* Badge */}
        <Show when={badgeValue()}>
          <span
            class={cn(
              'absolute -top-1 -right-2 min-w-4 h-4 px-1',
              'flex items-center justify-center',
              'text-[10px] font-medium rounded-full',
              'bg-primary text-primary-foreground'
            )}
          >
            {typeof badgeValue() === 'number' && (badgeValue() as number) > 99
              ? '99+'
              : badgeValue()}
          </span>
        </Show>
      </div>

      {/* Label */}
      <span
        class={cn(
          'mt-1 text-[10px] font-medium truncate max-w-full',
          props.isActive && 'font-semibold'
        )}
      >
        {props.item.label}
      </span>

      {/* Active indicator */}
      <Show when={props.isActive}>
        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-t" />
      </Show>
    </button>
  );
}
