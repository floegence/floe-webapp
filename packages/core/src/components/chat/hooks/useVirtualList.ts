import { createSignal, createMemo, onMount, onCleanup, createEffect, untrack, type Accessor } from 'solid-js';
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
}

export function useVirtualList(options: UseVirtualListOptions): UseVirtualListReturn {
  const { count, getItemKey, getItemHeight, config } = options;

  let containerEl: HTMLElement | null = null;
  let scrollEl: HTMLElement | null = null;

  const [scrollTop, setScrollTop] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(0);
  const [isAtBottom, setIsAtBottom] = createSignal(true);

  let rafId: number | null = null;

  // Variable-height measurements.
  // We use a Fenwick tree (Binary Indexed Tree) for:
  // - O(log n) height updates when an item is measured
  // - O(log n) prefix-sum queries
  // - O(log n) lowerBound (find first item whose end >= scrollTop)
  //
  // This avoids O(n) rebuild work on every measurement update.
  let sizeByIndex: number[] = [];
  let bit: number[] = [];

  const normalizeHeight = (h: number): number => {
    if (!Number.isFinite(h) || h <= 0) return config.defaultItemHeight;
    return Math.max(1, Math.round(h));
  };

  const bitInit = (n: number) => {
    sizeByIndex = new Array(n);
    bit = new Array(n + 1).fill(0);
  };

  const bitAdd = (idx1: number, delta: number) => {
    // idx1 is 1-based.
    for (let i = idx1; i < bit.length; i += i & -i) {
      bit[i] += delta;
    }
  };

  const bitSum = (idx1: number): number => {
    // Sum of first idx1 items (idx1 is 0..n).
    let out = 0;
    for (let i = idx1; i > 0; i -= i & -i) {
      out += bit[i];
    }
    return out;
  };

  const highestPowerOfTwoLE = (n: number): number => {
    let p = 1;
    while ((p << 1) <= n) p <<= 1;
    return p;
  };

  const lowerBound = (target: number, n: number): number => {
    // Returns the first index (0-based) such that prefixSum(index+1) >= target.
    // Clamped to [0, n-1].
    if (n <= 0) return 0;
    if (target <= 0) return 0;
    const total = bitSum(n);
    if (target >= total) return n - 1;

    let idx = 0; // 1-based index accumulator (0 means "before first element")
    let acc = 0;
    for (let step = highestPowerOfTwoLE(n); step !== 0; step >>= 1) {
      const next = idx + step;
      if (next <= n && acc + bit[next] < target) {
        acc += bit[next];
        idx = next;
      }
    }
    // idx is the largest 1-based index with prefixSum(idx) < target.
    // Desired 1-based position is idx+1. Convert to 0-based index: idx.
    return Math.max(0, Math.min(n - 1, idx));
  };

  // A version signal to trigger reactive recomputation when sizes change.
  const [measureVersion, setMeasureVersion] = createSignal(0);
  let pendingMeasureTick = false;
  const bumpMeasureVersion = () => {
    if (pendingMeasureTick) return;
    pendingMeasureTick = true;
    const commit = () => {
      pendingMeasureTick = false;
      setMeasureVersion((v) => v + 1);
    };
    if (typeof requestAnimationFrame === 'undefined') {
      setTimeout(commit, 0);
      return;
    }
    requestAnimationFrame(commit);
  };

  const rebuild = (n: number) => {
    bitInit(n);
    // Avoid tracking getItemKey/getItemHeight dependencies: rebuild is keyed by count().
    untrack(() => {
      for (let i = 0; i < n; i += 1) {
        // Ensure stable key evaluation so host stores can map ids -> cached heights.
        void getItemKey(i);
        const h = normalizeHeight(getItemHeight(i));
        sizeByIndex[i] = h;
        bitAdd(i + 1, h);
      }
    });
    bumpMeasureVersion();
  };

  createEffect(() => {
    rebuild(count());
  });

  // Visible range
  const visibleRange = createMemo(() => {
    // Depend on measurement updates.
    measureVersion();

    const n = count();
    if (n <= 0) {
      return { start: 0, end: 0 };
    }

    const viewportStart = scrollTop();
    const viewportEnd = viewportStart + containerHeight();

    const startBase = lowerBound(viewportStart, n);
    const endBase = lowerBound(viewportEnd, n);

    const start = Math.max(0, startBase - config.overscan);
    const end = Math.min(n, endBase + 1 + config.overscan);

    return { start, end };
  });

  // Virtual items
  const virtualItems = createMemo(() => {
    const { start, end } = visibleRange();
    const items: VirtualItem[] = [];

    // Start offset is the sum of the first `start` items.
    let offset = bitSum(start);

    for (let i = start; i < end; i += 1) {
      const size = sizeByIndex[i] ?? config.defaultItemHeight;
      items.push({
        index: i,
        start: offset,
        size,
        key: getItemKey(i),
      });
      offset += size;
    }

    return items;
  });

  const totalHeight = createMemo(() => {
    measureVersion();
    return bitSum(count());
  });

  const paddingTop = createMemo(() => {
    measureVersion();
    return bitSum(visibleRange().start);
  });

  const paddingBottom = createMemo(() => {
    measureVersion();
    const n = count();
    const end = visibleRange().end;
    return Math.max(0, bitSum(n) - bitSum(Math.min(n, end)));
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

    const n = count();
    if (index < 0 || index >= n) return;
    const size = sizeByIndex[index] ?? config.defaultItemHeight;
    let targetScroll: number;

    switch (align) {
      case 'start':
        targetScroll = bitSum(index);
        break;
      case 'center':
        targetScroll = bitSum(index) - containerHeight() / 2 + size / 2;
        break;
      case 'end':
        targetScroll = bitSum(index + 1) - containerHeight();
        break;
    }

    scrollEl.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (!scrollEl) return;
    scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
  };

  const setItemHeight = (index: number, height: number) => {
    const n = count();
    if (index < 0 || index >= n) return;

    const next = normalizeHeight(height);
    const prev = sizeByIndex[index] ?? config.defaultItemHeight;
    if (next === prev) return;

    sizeByIndex[index] = next;
    bitAdd(index + 1, next - prev);
    bumpMeasureVersion();
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
  };
}
