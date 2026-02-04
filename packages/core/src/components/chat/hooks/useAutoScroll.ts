import { createSignal, onCleanup, type Accessor } from 'solid-js';

export interface UseAutoScrollOptions {
  /** Whether auto-scroll is enabled */
  enabled?: Accessor<boolean>;
  /** Threshold (px) for considering the user at the bottom */
  threshold?: number;
  /** Scroll behavior */
  behavior?: ScrollBehavior;
}

export function useAutoScroll(options: UseAutoScrollOptions = {}) {
  const { enabled = () => true, threshold = 50, behavior = 'smooth' } = options;

  let scrollEl: HTMLElement | null = null;
  const [isAtBottom, setIsAtBottom] = createSignal(true);
  const [shouldAutoScroll, setShouldAutoScroll] = createSignal(true);

  const checkIfAtBottom = () => {
    if (!scrollEl) return true;
    const { scrollHeight, scrollTop, clientHeight } = scrollEl;
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  const handleScroll = () => {
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);

    // Disable auto-scroll when the user scrolls away from the bottom.
    if (!atBottom) {
      setShouldAutoScroll(false);
    }
  };

  const detachScrollListener = () => {
    if (!scrollEl) return;
    scrollEl.removeEventListener('scroll', handleScroll);
  };

  const scrollToBottom = (immediate = false) => {
    if (!scrollEl) return;

    scrollEl.scrollTo({
      top: scrollEl.scrollHeight,
      behavior: immediate ? 'instant' : behavior,
    });
    setShouldAutoScroll(true);
    setIsAtBottom(true);
  };

  const setScrollRef = (el: HTMLElement) => {
    // If the ref changes, remove the previous listener first.
    if (scrollEl && scrollEl !== el) {
      detachScrollListener();
    }
    scrollEl = el;

    el.addEventListener('scroll', handleScroll, { passive: true });

    // Initial scroll to bottom
    scrollToBottom(true);
  };

  // When content changes and auto-scroll is allowed, scroll to bottom.
  const onContentChange = () => {
    if (enabled() && shouldAutoScroll()) {
      if (typeof requestAnimationFrame === 'undefined') {
        scrollToBottom();
        return;
      }
      requestAnimationFrame(() => scrollToBottom());
    }
  };

  onCleanup(() => {
    detachScrollListener();
    scrollEl = null;
  });

  return {
    setScrollRef,
    isAtBottom,
    shouldAutoScroll,
    scrollToBottom,
    onContentChange,
    // Re-enable auto-scroll
    enableAutoScroll: () => setShouldAutoScroll(true),
  };
}
