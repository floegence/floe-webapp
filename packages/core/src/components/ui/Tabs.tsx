import {
  splitProps,
  type JSX,
  For,
  Show,
  createSignal,
  createEffect,
  untrack,
  onCleanup,
} from 'solid-js';
import { cn } from '../../utils/cn';
import { deferAfterPaint } from '../../utils/defer';
import { useViewActivation } from '../../context/ViewActivationContext';
import { Plus, X, ChevronRight } from '../icons';

// Tab item interface
export interface TabItem {
  id: string;
  label: string;
  icon?: JSX.Element;
  closable?: boolean;
  disabled?: boolean;
}

export interface TabsProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange' | 'onClose'> {
  /** Tab data items */
  items: TabItem[];
  /**
   * Active tab id (controlled mode).
   * When set, you must also provide onChange to handle changes.
   */
  activeId?: string;
  /**
   * Default active tab id (uncontrolled mode).
   * Use this when you don't need external control over the active tab.
   */
  defaultActiveId?: string;
  /**
   * Callback when active tab changes.
   * Alias: onActiveIdChange (for consistency with other components)
   */
  onChange?: (id: string) => void;
  /**
   * Alias for onChange (consistent naming with Radix/shadcn patterns).
   */
  onActiveIdChange?: (id: string) => void;
  /** Callback when tab is closed */
  onClose?: (id: string) => void;
  /** Callback when add button is clicked */
  onAdd?: () => void;
  /** Whether to show add button */
  showAdd?: boolean;
  /** Whether tabs are closable by default */
  closable?: boolean;
  /** Tab size variant */
  size?: 'sm' | 'md';
  /** Tab style variant */
  variant?: 'default' | 'card' | 'underline';
}

// Scroll button for mobile and overflow scenarios
// Using ChevronRight icon rotated for left direction
const ChevronLeft = (props: { class?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export function Tabs(props: TabsProps) {
  const [local, rest] = splitProps(props, [
    'items',
    'activeId',
    'defaultActiveId',
    'onChange',
    'onActiveIdChange',
    'onClose',
    'onAdd',
    'showAdd',
    'closable',
    'size',
    'variant',
    'class',
  ]);

  // Refs for scroll container
  let scrollContainerRef: HTMLDivElement | undefined;

  // Optional view activation support (KeepAliveStack). When available, only
  // measure/observe layout while the view is active to avoid forced reflow
  // during ActivityBar switches.
  const viewActivation = (() => {
    try {
      return useViewActivation();
    } catch {
      return null;
    }
  })();
  const isActive = () => (viewActivation ? viewActivation.active() : true);

  // Coalesce scroll-state updates and run them after paint so layout reads don't
  // block UI interactions (e.g. switching ActivityBar tabs).
  let scrollStateScheduled = false;

  // Underline variant: shared moving indicator (smooth underline slide).
  const [underlineX, setUnderlineX] = createSignal(0);
  const [underlineW, setUnderlineW] = createSignal(0);
  const [underlineVisible, setUnderlineVisible] = createSignal(false);

  // Track tab elements by id for indicator measurements.
  const tabEls = new Map<string, HTMLDivElement>();

  let underlineScheduled = false;

  const isUnderlineVariant = () => (local.variant ?? 'default') === 'underline';

  const updateUnderlineIndicatorForId = (id: string): boolean => {
    if (!scrollContainerRef) return false;
    if (!isUnderlineVariant()) return false;

    const el = tabEls.get(id);
    if (!el) return false;

    const containerRect = scrollContainerRef.getBoundingClientRect();
    const tabRect = el.getBoundingClientRect();

    // Translate into scroll-content coordinates so the indicator stays aligned
    // even when the tab row is horizontally scrolled.
    const x = tabRect.left - containerRect.left + scrollContainerRef.scrollLeft;
    const w = tabRect.width;

    setUnderlineX(x);
    setUnderlineW(w);
    setUnderlineVisible(w > 0);
    return w > 0;
  };

  const updateUnderlineIndicator = () => {
    if (!isUnderlineVariant()) {
      setUnderlineVisible(false);
      return;
    }

    const ok = updateUnderlineIndicatorForId(optimisticActiveId());
    if (!ok) setUnderlineVisible(false);
  };

  const scheduleUpdateUnderlineIndicator = () => {
    if (underlineScheduled) return;
    underlineScheduled = true;
    deferAfterPaint(() => {
      underlineScheduled = false;
      // Intentionally untracked: this is a one-shot post-paint measurement.
      untrack(() => {
        if (!isActive()) return;
        updateUnderlineIndicator();
      });
    });
  };

  // Determine if controlled or uncontrolled
  const isControlled = () => local.activeId !== undefined;
  const changeHandler = () => local.onChange ?? local.onActiveIdChange;

  // Internal state for uncontrolled mode
  const [internalActiveId, setInternalActiveId] = createSignal(
    untrack(() => local.defaultActiveId ?? local.items[0]?.id ?? '')
  );

  // Get the current active id (controlled or uncontrolled)
  const currentActiveId = () => (isControlled() ? local.activeId! : internalActiveId());

  // Optimistic UI: update active highlight immediately on click, then notify parent after paint.
  const [optimisticActiveId, setOptimisticActiveId] = createSignal(currentActiveId());

  createEffect(() => {
    setOptimisticActiveId(currentActiveId());
  });

  // Keep underline indicator aligned with the optimistic active tab.
  createEffect(() => {
    if (!isActive()) return;
    void local.variant;
    void optimisticActiveId();
    scheduleUpdateUnderlineIndicator();
  });

  // Scroll state
  const [canScrollLeft, setCanScrollLeft] = createSignal(false);
  const [canScrollRight, setCanScrollRight] = createSignal(false);
  const [hasOverflow, setHasOverflow] = createSignal(false);

  // Check scroll state
  const updateScrollState = () => {
    if (!scrollContainerRef) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef;
    const overflow = scrollWidth > clientWidth;
    setHasOverflow(overflow);
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  // High-frequency scroll/resize → coalesce and defer after paint to keep UI responsive.
  const scheduleUpdateScrollState = () => {
    if (scrollStateScheduled) return;
    scrollStateScheduled = true;
    deferAfterPaint(() => {
      scrollStateScheduled = false;
      if (!isActive()) return;
      updateScrollState();
    });
  };

  // Scroll handlers
  const scrollLeft = () => {
    if (!scrollContainerRef) return;
    scrollContainerRef.scrollBy({ left: -150, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (!scrollContainerRef) return;
    scrollContainerRef.scrollBy({ left: 150, behavior: 'smooth' });
  };

  // Setup scroll listener
  createEffect(() => {
    if (!scrollContainerRef) return;
    if (!isActive()) return;

    // Initial check: defer until after paint to avoid forced reflow during view switches.
    scheduleUpdateScrollState();
    scheduleUpdateUnderlineIndicator();

    // Listen for scroll events
    const handleScroll = () => scheduleUpdateScrollState();
    scrollContainerRef.addEventListener('scroll', handleScroll);

    // Listen for resize events (ResizeObserver when available, otherwise fall back to window resize).
    const handleResize = () => {
      scheduleUpdateScrollState();
      scheduleUpdateUnderlineIndicator();
    };
    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(scrollContainerRef);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    onCleanup(() => {
      scrollContainerRef?.removeEventListener('scroll', handleScroll);
      resizeObserver?.disconnect();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    });
  });

  // Re-check when items change
  createEffect(() => {
    if (!isActive()) return;
    // Track items array changes
    void local.items.length;
    // Defer to ensure DOM is updated
    scheduleUpdateScrollState();
    scheduleUpdateUnderlineIndicator();
  });

  // Handle tab click with UI-first response
  const handleTabClick = (id: string, disabled?: boolean) => {
    if (disabled) return;
    const handler = changeHandler();

    // UI first: highlight immediately.
    setOptimisticActiveId(id);
    // Keep the underline indicator in sync with the optimistic highlight.
    // Do it synchronously for snappy feedback.
    if (isUnderlineVariant()) {
      updateUnderlineIndicatorForId(id);
    }

    // Update internal state for uncontrolled mode
    if (!isControlled()) {
      setInternalActiveId(id);
    }

    // Notify parent after paint
    if (handler) {
      const nextId = id;
      deferAfterPaint(() => handler(nextId));
    }
  };

  // Handle close with UI-first response
  const handleClose = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    const onClose = local.onClose;
    if (!onClose) return;
    const nextId = id;
    deferAfterPaint(() => onClose(nextId));
  };

  // Size styles
  const sizeStyles = {
    sm: 'h-7 px-2 text-[11px]',
    md: 'h-8 px-3 text-xs',
  };

  // Variant styles for tab items
  const getTabStyles = (isActive: boolean, disabled?: boolean) => {
    const base = 'inline-flex items-center gap-1.5 font-medium transition-colors duration-150 whitespace-nowrap';
    const cursor = disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer';

    const variants = {
      default: cn(
        base,
        cursor,
        sizeStyles[local.size ?? 'md'],
        'rounded-t border-b-2',
        isActive
          ? 'border-primary text-foreground bg-background'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
        disabled && 'hover:bg-transparent hover:text-muted-foreground'
      ),
      card: cn(
        base,
        cursor,
        sizeStyles[local.size ?? 'md'],
        'rounded-t border border-b-0',
        isActive
          ? 'border-border bg-background text-foreground -mb-px z-10'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
        disabled && 'hover:bg-transparent hover:text-muted-foreground'
      ),
      underline: cn(
        base,
        cursor,
        sizeStyles[local.size ?? 'md'],
        'border-b-2 -mb-px',
        isActive
          ? underlineVisible()
            ? 'border-transparent text-foreground'
            : 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50',
        disabled && 'hover:border-transparent hover:text-muted-foreground'
      ),
    };

    return variants[local.variant ?? 'default'];
  };

  // Container variant styles
  const containerStyles = {
    default: 'border-b border-border',
    card: 'border-b border-border',
    underline: 'border-b border-border',
  };

  return (
    <div
      class={cn(
        'relative flex items-center gap-0.5',
        containerStyles[local.variant ?? 'default'],
        local.class
      )}
      {...rest}
    >
      {/* Left scroll button - always present when overflow, but invisible when can't scroll */}
      <Show when={hasOverflow()}>
        <button
          type="button"
          onClick={scrollLeft}
          disabled={!canScrollLeft()}
          class={cn(
            'flex-shrink-0 flex items-center justify-center',
            'w-6 h-6 rounded cursor-pointer',
            'transition-all duration-150',
            canScrollLeft()
              ? 'text-muted-foreground hover:text-foreground hover:bg-muted/80 opacity-100'
              : 'opacity-0 pointer-events-none'
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
      </Show>

      {/* Scrollable tabs container */}
      <div
        ref={scrollContainerRef}
        class={cn(
          'relative flex-1 flex items-end gap-0.5 overflow-x-auto',
          'scrollbar-none',
          // Hide scrollbar for all browsers
          '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
        )}
      >
        {/* Shared moving underline indicator (underline variant only) */}
        <Show when={isUnderlineVariant() && underlineVisible()}>
          <div
            class="pointer-events-none absolute bottom-0 left-0 z-10 h-0.5 bg-primary transition-[transform,width] duration-200 ease-out will-change-transform motion-reduce:transition-none"
            style={{
              transform: `translate3d(${underlineX()}px, 0, 0)`,
              width: `${underlineW()}px`,
            }}
          />
        </Show>
        <For each={local.items}>
          {(item) => {
            const isActive = () => item.id === optimisticActiveId();
            const isClosable = () => item.closable ?? local.closable ?? false;

            return (
              <div
                ref={(el) => {
                  tabEls.set(item.id, el);
                  onCleanup(() => tabEls.delete(item.id));
                }}
                class={getTabStyles(isActive(), item.disabled)}
                onClick={() => handleTabClick(item.id, item.disabled)}
                role="tab"
                aria-selected={isActive()}
                aria-disabled={item.disabled}
                tabIndex={item.disabled ? -1 : 0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTabClick(item.id, item.disabled);
                  }
                }}
              >
                {/* Tab icon */}
                <Show when={item.icon}>
                  <span class="flex-shrink-0">{item.icon}</span>
                </Show>

                {/* Tab label */}
                <span class="truncate max-w-32">{item.label}</span>

                {/* Close button - show red background only on hover */}
                <Show when={isClosable() && !item.disabled}>
                  <button
                    type="button"
                    onClick={(e) => handleClose(e, item.id)}
                    class={cn(
                      'flex-shrink-0 flex items-center justify-center',
                      'w-5 h-5 rounded cursor-pointer',
                      'bg-transparent text-muted-foreground',
                      'hover:bg-red-500 hover:text-white',
                      'transition-colors duration-150',
                      'ml-1.5'
                    )}
                    aria-label={`Close ${item.label}`}
                  >
                    <X class="w-3 h-3" />
                  </button>
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      {/* Add button - fixed outside scroll container */}
      <Show when={local.showAdd}>
        <button
          type="button"
          onClick={() => {
            const onAdd = local.onAdd;
            if (!onAdd) return;
            deferAfterPaint(() => onAdd());
          }}
          class={cn(
            'flex-shrink-0 flex items-center justify-center',
            'rounded hover:bg-muted/80 cursor-pointer',
            'text-muted-foreground hover:text-foreground',
            'transition-colors duration-150',
            local.size === 'sm' ? 'w-6 h-6' : 'w-7 h-7'
          )}
          aria-label="Add new tab"
        >
          <Plus class={local.size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </button>
      </Show>

      {/* Right scroll button - always present when overflow, but invisible when can't scroll */}
      <Show when={hasOverflow()}>
        <button
          type="button"
          onClick={scrollRight}
          disabled={!canScrollRight()}
          class={cn(
            'flex-shrink-0 flex items-center justify-center',
            'w-6 h-6 rounded cursor-pointer',
            'transition-all duration-150',
            canScrollRight()
              ? 'text-muted-foreground hover:text-foreground hover:bg-muted/80 opacity-100'
              : 'opacity-0 pointer-events-none'
          )}
          aria-label="Scroll right"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </Show>
    </div>
  );
}

// TabPanel component for content area
export interface TabPanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  // Whether this panel is currently active
  active?: boolean;
  // Keep mounted when inactive (for preserving state)
  keepMounted?: boolean;
}

export function TabPanel(props: TabPanelProps) {
  const [local, rest] = splitProps(props, ['active', 'keepMounted', 'class', 'children']);

  return (
    <Show when={local.keepMounted || local.active}>
      <div
        role="tabpanel"
        class={cn(
          !local.active && local.keepMounted && 'hidden',
          local.class
        )}
        {...rest}
      >
        {local.children}
      </div>
    </Show>
  );
}
