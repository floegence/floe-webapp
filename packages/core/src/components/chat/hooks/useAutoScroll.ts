import { createSignal, type Accessor } from 'solid-js';

export interface UseAutoScrollOptions {
  /** 是否启用自动滚动 */
  enabled?: Accessor<boolean>;
  /** 判断是否在底部的阈值 */
  threshold?: number;
  /** 滚动行为 */
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

    // 用户手动滚动离开底部时，禁用自动滚动
    if (!atBottom) {
      setShouldAutoScroll(false);
    }
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
    scrollEl = el;

    el.addEventListener('scroll', handleScroll, { passive: true });

    // 初始滚动到底部
    scrollToBottom(true);
  };

  // 当内容变化且应该自动滚动时，滚动到底部
  const onContentChange = () => {
    if (enabled() && shouldAutoScroll()) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  };

  return {
    setScrollRef,
    isAtBottom,
    shouldAutoScroll,
    scrollToBottom,
    onContentChange,
    // 重新启用自动滚动
    enableAutoScroll: () => setShouldAutoScroll(true),
  };
}
