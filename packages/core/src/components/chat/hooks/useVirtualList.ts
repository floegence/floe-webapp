import { createSignal, createMemo, onMount, onCleanup, type Accessor } from 'solid-js';
import type { VirtualListConfig } from '../types';

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  key: string;
}

export interface UseVirtualListOptions {
  count: Accessor<number>;
  getItemKey: (index: number) => string;
  getItemHeight: (index: number) => number;
  config: VirtualListConfig;
}

export interface UseVirtualListReturn {
  containerRef: (el: HTMLElement) => void;
  scrollRef: (el: HTMLElement) => void;
  /** Call this from the scroll container's onScroll handler (rAF throttled). */
  onScroll: () => void;
  virtualItems: Accessor<VirtualItem[]>;
  totalHeight: Accessor<number>;
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  scrollToBottom: () => void;
  isAtBottom: Accessor<boolean>;
  visibleRange: Accessor<{ start: number; end: number }>;
}

export function useVirtualList(options: UseVirtualListOptions): UseVirtualListReturn {
  const { count, getItemKey, getItemHeight, config } = options;

  let containerEl: HTMLElement | null = null;
  let scrollEl: HTMLElement | null = null;

  const [scrollTop, setScrollTop] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(0);
  const [isAtBottom, setIsAtBottom] = createSignal(true);

  let rafId: number | null = null;

  // Measure positions for all items
  const measurements = createMemo(() => {
    const result: { start: number; size: number; end: number }[] = [];
    let offset = 0;

    for (let i = 0; i < count(); i++) {
      const size = getItemHeight(i);
      result.push({
        start: offset,
        size,
        end: offset + size,
      });
      offset += size;
    }

    return result;
  });

  // Total height
  const totalHeight = createMemo(() => {
    const m = measurements();
    return m.length > 0 ? m[m.length - 1].end : 0;
  });

  // Binary search for the start index
  const findStartIndex = (scrollTop: number) => {
    const m = measurements();
    let low = 0;
    let high = m.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (m[mid].end < scrollTop) {
        low = mid + 1;
      } else if (m[mid].start > scrollTop) {
        high = mid - 1;
      } else {
        return mid;
      }
    }

    return Math.max(0, low);
  };

  // Visible range
  const visibleRange = createMemo(() => {
    const m = measurements();
    if (m.length === 0) {
      return { start: 0, end: 0 };
    }

    const viewportStart = scrollTop();
    const viewportEnd = scrollTop() + containerHeight();

    const start = Math.max(0, findStartIndex(viewportStart) - config.overscan);
    let end = start;

    while (end < m.length && m[end].start < viewportEnd) {
      end++;
    }

    end = Math.min(m.length, end + config.overscan);

    return { start, end };
  });

  // Virtual items
  const virtualItems = createMemo(() => {
    const { start, end } = visibleRange();
    const m = measurements();
    const items: VirtualItem[] = [];

    for (let i = start; i < end; i++) {
      items.push({
        index: i,
        start: m[i].start,
        size: m[i].size,
        key: getItemKey(i),
      });
    }

    return items;
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
    resizeObserver?.disconnect();
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  // Scroll to a specific index
  const scrollToIndex = (index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!scrollEl) return;

    const m = measurements();
    if (index < 0 || index >= m.length) return;

    const item = m[index];
    let targetScroll: number;

    switch (align) {
      case 'start':
        targetScroll = item.start;
        break;
      case 'center':
        targetScroll = item.start - containerHeight() / 2 + item.size / 2;
        break;
      case 'end':
        targetScroll = item.end - containerHeight();
        break;
    }

    scrollEl.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (!scrollEl) return;
    scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
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
    scrollToIndex,
    scrollToBottom,
    isAtBottom,
    visibleRange,
  };
}
