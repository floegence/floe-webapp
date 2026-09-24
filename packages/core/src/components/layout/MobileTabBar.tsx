import { type Component, For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { deferNonBlocking } from '../../utils/defer';
import type { ActivityBarItem } from './ActivityBar';

export interface MobileTabBarItem extends Pick<ActivityBarItem, 'buttonRef' | 'ariaExpanded' | 'ariaControls' | 'ariaHasPopup'> {
  id: string;
  icon: Component<{ class?: string }>;
  label: string;
  badge?: number | string | (() => number | string | undefined);
  /** Custom click handler. If provided, takes precedence over onSelect (consistent with ActivityBar). */
  onClick?: () => void;
}

export interface MobileTabBarProps {
  ref?: (element: HTMLElement) => void;
  actions?: MobileTabBarItem[];
  hidden?: boolean;
  items: MobileTabBarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
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

  const enabledItems = () => props.items;

  const selectItemAt = (index: number) => {
    const item = enabledItems()[index];
    if (!item) return;
    if (item.onClick) {
      deferNonBlocking(() => item.onClick!());
      return;
    }
    props.onSelect(item.id);
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
      ref={props.ref}
      hidden={props.hidden}
      data-floe-shell-slot="mobile-tab-bar"
      class={cn(
        // Same safe-area rule as TopBar: keep the visual bar height stable, and
        // add safe-area padding on an outer wrapper (avoid squeezing content).
        'relative shrink-0 bg-background border-t border-border safe-bottom safe-left safe-right',
        props.class
      )}
      style={{ 'border-top-color': 'var(--bottom-bar-border)' }}
      aria-label={props.ariaLabel}
    >
      <div class="relative flex h-14">
        <div class="relative min-w-0 flex-1">
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
          role="tablist"
          aria-orientation="horizontal"
        >
          <For each={props.items}>
            {(item, index) => (
              <MobileTabItem
                item={item}
                isActive={props.activeId === item.id}
                index={index()}
                itemCount={props.items.length}
                onClick={() => {
                  // UI response first: trigger haptic feedback immediately
                  if ('vibrate' in navigator) {
                    navigator.vibrate(10);
                  }

                  // UI-owned selection state should update synchronously.
                  const onClick = item.onClick;
                  const onSelect = props.onSelect;
                  const id = item.id;
                  if (item.onClick) {
                    deferNonBlocking(() => onClick!());
                  } else {
                    onSelect(id);
                  }
                }}
                onKeyboardSelect={(nextIndex) => selectItemAt(nextIndex)}
              />
            )}
          </For>
        </div>
        </div>
        <Show when={props.actions?.length}>
          <div data-floe-mobile-navigation-actions class="flex shrink-0 border-l border-border">
            <For each={props.actions}>{(item) => <MobileTabItem item={item} action
              isActive={false} index={0} itemCount={1}
              onKeyboardSelect={() => {}}
              onClick={() => item.onClick?.()} />}</For>
          </div>
        </Show>
      </div>
    </nav>
  );
}

interface MobileTabItemProps {
  action?: boolean;
  item: MobileTabBarItem;
  isActive: boolean;
  index: number;
  itemCount: number;
  onClick: () => void;
  onKeyboardSelect: (nextIndex: number) => void;
}

function MobileTabItem(props: MobileTabItemProps) {
  let buttonRef: HTMLButtonElement | undefined;
  const expanded = () => typeof props.item.ariaExpanded === 'function'
    ? props.item.ariaExpanded()
    : props.item.ariaExpanded;
  onMount(() => props.item.buttonRef?.(buttonRef ?? null));
  onCleanup(() => props.item.buttonRef?.(null));
  const badgeValue = () => (
    typeof props.item.badge === 'function' ? props.item.badge() : props.item.badge
  );

  return (
    <button
      ref={buttonRef}
      type="button"
      class={cn(
        'relative flex-shrink-0 flex flex-col items-center justify-center',
        'min-w-16 h-full px-4 snap-center',
        'transition-[color] duration-150',
        'focus:outline-none focus-visible:bg-muted',
        props.action && 'w-16 px-1',
        expanded() && 'bg-muted text-foreground',
        props.isActive
          ? 'text-primary'
          : 'text-muted-foreground active:text-foreground'
      )}
      onClick={() => props.onClick()}
      aria-label={props.item.label}
      aria-selected={props.action ? undefined : props.isActive}
      aria-expanded={expanded()}
      aria-controls={props.item.ariaControls}
      aria-haspopup={props.item.ariaHasPopup}
      role={props.action ? undefined : 'tab'}
      tabIndex={props.action || props.isActive ? 0 : -1}
      onKeyDown={(event) => {
        if (props.action) return;
        let nextIndex: number | null = null;
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            nextIndex = (props.index + 1) % props.itemCount;
            break;
          case 'ArrowLeft':
          case 'ArrowUp':
            nextIndex = (props.index - 1 + props.itemCount) % props.itemCount;
            break;
          case 'Home':
            nextIndex = 0;
            break;
          case 'End':
            nextIndex = props.itemCount - 1;
            break;
          default:
            return;
        }
        event.preventDefault();
        props.onKeyboardSelect(nextIndex);
      }}
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
