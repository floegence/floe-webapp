import { createMemo, createSignal, onCleanup } from 'solid-js';
import type { Accessor } from 'solid-js';

export interface VirtualRange {
  start: number;
  end: number;
}

export interface UseVirtualWindowOptions {
  count: Accessor<number>;
  /** Fixed item size in pixels */
  itemSize: Accessor<number>;
  /** Extra items to render before/after the visible window */
  overscan?: number;
}

export interface UseVirtualWindowReturn {
  /** Attach to the scroll container element */
  scrollRef: (el: HTMLElement | null) => void;
  /** Call this from the scroll container's onScroll handler */
  onScroll: () => void;
  range: Accessor<VirtualRange>;
  paddingTop: Accessor<number>;
  paddingBottom: Accessor<number>;
  totalSize: Accessor<number>;
}

/**
 * Lightweight fixed-size virtual window.
 *
 * Unlike the chat virtual list (variable-height), this keeps O(1) math per scroll update and
 * is intended for very large collections (e.g. 10k items in FileBrowser).
 */
export function useVirtualWindow(options: UseVirtualWindowOptions): UseVirtualWindowReturn {
  const overscan = options.overscan ?? 8;

  let scrollEl: HTMLElement | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let rafId: number | null = null;

  const [scrollTop, setScrollTop] = createSignal(0);
  const [viewportSize, setViewportSize] = createSignal(0);

  const readScroll = () => {
    if (!scrollEl) return;
    setScrollTop(scrollEl.scrollTop);
    setViewportSize(scrollEl.clientHeight);
  };

  const onScroll = () => {
    if (!scrollEl) return;
    if (rafId !== null) return;

    if (typeof requestAnimationFrame === 'undefined') {
      readScroll();
      return;
    }

    rafId = requestAnimationFrame(() => {
      rafId = null;
      readScroll();
    });
  };

  const range = createMemo<VirtualRange>(() => {
    const count = options.count();
    const size = options.itemSize();
    const top = scrollTop();
    const viewport = viewportSize();

    if (count <= 0 || size <= 0) return { start: 0, end: 0 };

    const start = Math.max(0, Math.floor(top / size) - overscan);
    const end = Math.min(count, Math.ceil((top + viewport) / size) + overscan);
    return { start, end };
  });

  const paddingTop = createMemo(() => range().start * options.itemSize());
  const paddingBottom = createMemo(() => {
    const count = options.count();
    return Math.max(0, count - range().end) * options.itemSize();
  });

  const totalSize = createMemo(() => options.count() * options.itemSize());

  const scrollRef = (el: HTMLElement | null) => {
    if (scrollEl === el) return;

    resizeObserver?.disconnect();
    resizeObserver = null;

    scrollEl = el;
    if (!scrollEl || typeof ResizeObserver === 'undefined') return;

    resizeObserver = new ResizeObserver(() => readScroll());
    resizeObserver.observe(scrollEl);
    readScroll();
  };

  onCleanup(() => {
    resizeObserver?.disconnect();
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  return { scrollRef, onScroll, range, paddingTop, paddingBottom, totalSize };
}

