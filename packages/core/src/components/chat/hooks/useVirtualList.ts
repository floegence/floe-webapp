import { createSignal, createMemo, onMount, onCleanup, untrack, type Accessor } from 'solid-js';
import type { VirtualListConfig } from '../types';

import { createVirtualListLayout, type VirtualItem, type VirtualListAnchor } from './virtualListLayout';
export { createVirtualListLayout, type VirtualItem, type VirtualListAnchor, type VirtualListLayout } from './virtualListLayout';

export interface UseVirtualListOptions {
  count: Accessor<number>;
  getItemKey: (index: number) => string;
  getItemHeight: (index: number) => number;
  config: VirtualListConfig;
  /** Explicit ordered identities for prepend, eviction and same-count replacement. */
  itemKeys?: Accessor<readonly string[]>;
}

export interface UseVirtualListReturn {
  containerRef: (el: HTMLElement) => void;
  scrollRef: (el: HTMLElement) => void;
  /** Call this from the scroll container's onScroll handler (rAF throttled). */
  onScroll: () => void;
  virtualItems: Accessor<VirtualItem[]>;
  totalHeight: Accessor<number>;
  paddingTop: Accessor<number>;
  paddingBottom: Accessor<number>;
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  scrollToBottom: () => void;
  isAtBottom: Accessor<boolean>;
  visibleRange: Accessor<{ start: number; end: number }>;
  /**
   * Update an item's measured height (variable-height virtualization).
   * Call this from a ResizeObserver for visible items.
   */
  setItemHeight: (index: number, height: number) => void;
  setItemHeightByKey: (key: string, height: number) => void;
  captureAnchor: () => VirtualListAnchor | undefined;
  anchorOffset: (anchor: VirtualListAnchor) => number | undefined;
}

export function useVirtualList(options: UseVirtualListOptions): UseVirtualListReturn {
  const { count, getItemKey, getItemHeight, config } = options;

  let containerEl: HTMLElement | null = null;
  let scrollEl: HTMLElement | null = null;

  const [scrollTop, setScrollTop] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(0);
  const [isAtBottom, setIsAtBottom] = createSignal(true);

  let rafId: number | null = null;

  const layout = createVirtualListLayout(config.defaultItemHeight);

  // Publish measured geometry at most once per animation frame.
  const [measureVersion, setMeasureVersion] = createSignal(0);
  let pendingMeasureTick = false;
  let measureFrame: number | undefined;
  let measureTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const bumpMeasureVersion = () => {
    if (disposed || pendingMeasureTick) return;
    pendingMeasureTick = true;
    const commit = () => {
      pendingMeasureTick = false;
      measureFrame = undefined;
      measureTimer = undefined;
      if (disposed) return;
      setMeasureVersion((v) => v + 1);
    };
    if (typeof requestAnimationFrame === 'undefined') {
      measureTimer = setTimeout(commit, 0);
      return;
    }
    measureFrame = requestAnimationFrame(commit);
  };

  const layoutRevision = createMemo(() => {
    const length = count();
    if (!Number.isInteger(length) || length < 0) throw new Error('Virtual list count must be a non-negative integer');
    const keys = options.itemKeys?.();
    if (keys && keys.length !== length) throw new Error('Virtual list keys must match count');
    untrack(() => layout.reset(keys ?? Array.from({ length }, (_, i) => getItemKey(i)), getItemHeight));
    return {};
  });

  // Visible range
  const visibleRange = createMemo(() => {
    layoutRevision();
    // Depend on measurement updates.
    measureVersion();

    return layout.range(scrollTop(), containerHeight(), config.overscan);
  });

  // Virtual items
  const virtualItems = createMemo(() => {
    layoutRevision();
    measureVersion();
    const { start, end } = visibleRange();
    const items: VirtualItem[] = [];

    // Start offset is the sum of the first `start` items.
    let offset = layout.prefix(start);

    for (let i = start; i < end; i += 1) {
      const size = layout.item(i)?.size ?? config.defaultItemHeight;
      items.push({
        index: i,
        start: offset,
        size,
        key: layout.item(i)!.key,
      });
      offset += size;
    }

    return items;
  });

  const totalHeight = createMemo(() => {
    layoutRevision();
    measureVersion();
    return layout.total();
  });

  const paddingTop = createMemo(() => {
    layoutRevision();
    measureVersion();
    return layout.prefix(visibleRange().start);
  });

  const paddingBottom = createMemo(() => {
    layoutRevision();
    measureVersion();
    const n = count();
    const end = visibleRange().end;
    return Math.max(0, layout.total() - layout.prefix(Math.min(n, end)));
  });

  // Scroll handler (high-frequency): rAF throttled to avoid sync work on every scroll event.
  const onScroll = () => {
    if (!scrollEl) return;
    if (rafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') {
      const newScrollTop = scrollEl.scrollTop;
      setScrollTop(newScrollTop);
      const threshold = 50;
      const atBottom = scrollEl.scrollHeight - newScrollTop - scrollEl.clientHeight < threshold;
      setIsAtBottom(atBottom);
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!scrollEl) return;
      const newScrollTop = scrollEl.scrollTop;
      setScrollTop(newScrollTop);
      const threshold = 50;
      const atBottom = scrollEl.scrollHeight - newScrollTop - scrollEl.clientHeight < threshold;
      setIsAtBottom(atBottom);
    });
  };

  // ResizeObserver
  let resizeObserver: ResizeObserver | null = null;

  onMount(() => {
    if (containerEl) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height);
        }
      });
      resizeObserver.observe(containerEl);
      setContainerHeight(containerEl.clientHeight);
    }
    onScroll();
  });

  onCleanup(() => {
    disposed = true;
    resizeObserver?.disconnect();
    if (measureFrame !== undefined) cancelAnimationFrame(measureFrame);
    if (measureTimer !== undefined) clearTimeout(measureTimer);
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  // Scroll to a specific index
  const scrollToIndex = (index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!scrollEl) return;

    const n = count();
    if (index < 0 || index >= n) return;
    const size = layout.item(index)?.size ?? config.defaultItemHeight;
    let targetScroll: number;

    switch (align) {
      case 'start':
        targetScroll = layout.prefix(index);
        break;
      case 'center':
        targetScroll = layout.prefix(index) - containerHeight() / 2 + size / 2;
        break;
      case 'end':
        targetScroll = layout.prefix(index + 1) - containerHeight();
        break;
    }

    scrollEl.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (!scrollEl) return;
    scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
  };

  const setItemHeightByKey = (key: string, height: number) => {
    if (layout.measure(key, height)) bumpMeasureVersion();
  };
  const setItemHeight = (index: number, height: number) => {
    const item = layout.item(index);
    if (item) setItemHeightByKey(item.key, height);
  };

  return {
    containerRef: (el) => {
      containerEl = el;
    },
    scrollRef: (el) => {
      scrollEl = el;
      onScroll();
    },
    onScroll,
    virtualItems,
    totalHeight,
    paddingTop,
    paddingBottom,
    scrollToIndex,
    scrollToBottom,
    isAtBottom,
    visibleRange,
    setItemHeight,
    setItemHeightByKey,
    captureAnchor: () => layout.anchor(scrollEl?.scrollTop ?? scrollTop()),
    anchorOffset: (anchor) => layout.offset(anchor),
  };
}
