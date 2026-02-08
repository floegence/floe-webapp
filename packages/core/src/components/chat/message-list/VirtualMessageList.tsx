import {
  type Component,
  For,
  Show,
  createMemo,
  createEffect,
  createSignal,
  onCleanup,
} from 'solid-js';
import { cn } from '../../../utils/cn';
import { deferNonBlocking } from '../../../utils/defer';
import { useChatContext } from '../ChatProvider';
import { useVirtualList } from '../hooks/useVirtualList';
import { MessageItem } from '../message';
import { WorkingIndicator } from '../status/WorkingIndicator';

export interface VirtualMessageListProps {
  class?: string;
}

export const VirtualMessageList: Component<VirtualMessageListProps> = (props) => {
  const ctx = useChatContext();
  const [showScrollToBottom, setShowScrollToBottom] = createSignal(false);

  let scrollContainerRef: HTMLDivElement | undefined;
  let isUserScrolling = false;
  let scrollTimeout: number | undefined;
  let rafId: number | null = null;
  let pendingHistoryLoad = false;

  const messages = () => ctx.messages();

  // Virtual list
  const virtualList = useVirtualList({
    count: () => messages().length,
    getItemKey: (index) => messages()[index]?.id || `msg-${index}`,
    getItemHeight: (index) => {
      const msg = messages()[index];
      if (!msg) return ctx.virtualListConfig().defaultItemHeight;
      return ctx.getMessageHeight(msg.id);
    },
    config: ctx.virtualListConfig(),
  });

  // Scroll to bottom
  const scrollToBottom = (smooth = true) => {
    if (!scrollContainerRef) return;
    scrollContainerRef.scrollTo({
      top: scrollContainerRef.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    });
  };

  // Scroll handler
  const handleScroll = () => {
    if (!scrollContainerRef) return;

    // Keep the virtual list math off the hot path.
    virtualList.onScroll();

    // Detect whether the user is actively scrolling
    isUserScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => {
      isUserScrolling = false;
    }, 150);

    // High-frequency scroll: rAF throttle DOM reads + state updates.
    if (rafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') {
      rafId = null;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollToBottom(distanceFromBottom > 200);

      if (scrollTop < 500 && ctx.hasMoreHistory() && !ctx.isLoadingHistory() && !pendingHistoryLoad) {
        pendingHistoryLoad = true;
        deferNonBlocking(() => {
          pendingHistoryLoad = false;
          void ctx.loadMoreHistory().catch((err) => console.error(err));
        });
      }
      return;
    }

    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!scrollContainerRef) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollToBottom(distanceFromBottom > 200);

      // Trigger loading more (near top)
      if (scrollTop < 500 && ctx.hasMoreHistory() && !ctx.isLoadingHistory() && !pendingHistoryLoad) {
        pendingHistoryLoad = true;
        // UI response priority: defer async work out of the scroll handler.
        deferNonBlocking(() => {
          pendingHistoryLoad = false;
          void ctx.loadMoreHistory().catch((err) => console.error(err));
        });
      }
    });
  };

  // Auto-scroll to bottom when messages change
  createEffect(() => {
    const msgCount = messages().length;
    const isStreaming = ctx.streamingMessageId() !== null;

    // Only auto-scroll when the user is not actively scrolling
    if (!isUserScrolling && (isStreaming || msgCount > 0)) {
      requestAnimationFrame(() => {
        if (!virtualList.isAtBottom()) return;
        scrollToBottom(false);
      });
    }
  });

  onCleanup(() => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
      scrollTimeout = undefined;
    }
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  // Measure message height
  const measureHeight = (index: number, el: HTMLElement | null) => {
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.borderBoxSize[0]?.blockSize || entry.contentRect.height;
        if (height > 0) {
          virtualList.setItemHeight(index, height);
          const msg = messages()[index];
          if (msg) ctx.setMessageHeight(msg.id, height);
        }
      }
    });

    observer.observe(el);
    onCleanup(() => observer.disconnect());
  };

  const visibleIndices = createMemo(() => {
    const { start, end } = virtualList.visibleRange();
    const out: number[] = [];
    for (let i = start; i < end; i += 1) out.push(i);
    return out;
  });

  return (
    <div class={cn('chat-message-list-container', props.class)}>
      {/* Load-more indicator */}
      <Show when={ctx.isLoadingHistory()}>
        <div class="chat-loading-more">
          <LoadingSpinner />
          <span>Loading history...</span>
        </div>
      </Show>

      {/* Message list */}
      <div
        ref={(el) => {
          scrollContainerRef = el;
          virtualList.scrollRef(el);
          virtualList.containerRef(el);
        }}
        class="chat-message-list-scroll"
        onScroll={handleScroll}
      >
        <div class="chat-message-list-inner">
          {/* 上方 spacer：用实际 DOM 元素代替 padding-top，配合 overflow-anchor: none
              让浏览器原生 scroll anchoring 锚定到真实的消息元素而非 spacer，
              从而在高度变化时自动补偿 scrollTop，彻底消除滚动跳动。 */}
          <div class="chat-vlist-spacer" style={{ height: `${virtualList.paddingTop()}px` }} />
          <For each={visibleIndices()}>
            {(index) => {
              const message = () => messages()[index];
              return (
                <Show when={message()}>
                  <div
                    ref={(el) => measureHeight(index, el)}
                    class="chat-message-list-item"
                  >
                    <MessageItem message={message()} />
                  </div>
                </Show>
              );
            }}
          </For>
          {/* 下方 spacer */}
          <div class="chat-vlist-spacer" style={{ height: `${virtualList.paddingBottom()}px` }} />
        </div>

        {/* Working state */}
        <Show when={ctx.isWorking()}>
          <div class="chat-working-indicator-wrapper">
            <WorkingIndicator />
          </div>
        </Show>
      </div>

      {/* Scroll-to-bottom button */}
      <Show when={showScrollToBottom()}>
        <button
          type="button"
          class="chat-scroll-to-bottom-btn"
          onClick={() => scrollToBottom()}
        >
          <ChevronDownIcon />
        </button>
      </Show>
    </div>
  );
};

const LoadingSpinner: Component = () => (
  <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const ChevronDownIcon: Component = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
