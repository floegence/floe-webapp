import {
  type Component,
  For,
  Show,
  createEffect,
  createSignal,
} from 'solid-js';
import { cn } from '../../../utils/cn';
import { useChatContext } from '../ChatProvider';
import { MessageItem } from '../message';
import { WorkingIndicator } from '../status/WorkingIndicator';

export interface SimpleMessageListProps {
  class?: string;
}

/**
 * 简单消息列表组件（非虚拟化）
 * 适用于消息数量较少的场景，避免虚拟列表的复杂性
 */
export const SimpleMessageList: Component<SimpleMessageListProps> = (props) => {
  const ctx = useChatContext();
  const [showScrollToBottom, setShowScrollToBottom] = createSignal(false);

  let scrollContainerRef: HTMLDivElement | undefined;
  let isUserScrolling = false;
  let scrollTimeout: number | undefined;

  const messages = () => ctx.messages();

  // 滚动到底部
  const scrollToBottom = (smooth = true) => {
    if (!scrollContainerRef) return;
    scrollContainerRef.scrollTo({
      top: scrollContainerRef.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    });
  };

  // 监听滚动
  const handleScroll = () => {
    if (!scrollContainerRef) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // 显示返回底部按钮
    setShowScrollToBottom(distanceFromBottom > 200);

    // 检测用户是否在滚动
    isUserScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => {
      isUserScrolling = false;
    }, 150);

    // 触发加载更多（向上滚动）
    if (scrollTop < 100 && ctx.hasMoreHistory() && !ctx.isLoadingHistory()) {
      ctx.loadMoreHistory();
    }
  };

  // 消息变化时自动滚动到底部
  createEffect(() => {
    const msgCount = messages().length;
    const isStreaming = ctx.streamingMessageId() !== null;

    // 仅在用户没有主动滚动时自动滚动
    if (!isUserScrolling && (isStreaming || msgCount > 0)) {
      requestAnimationFrame(() => {
        scrollToBottom(false);
      });
    }
  });

  return (
    <div class={cn('chat-message-list-container', props.class)}>
      {/* 消息列表 */}
      <div
        ref={scrollContainerRef}
        class="chat-message-list-scroll"
        onScroll={handleScroll}
      >
        {/* 加载更多指示器 */}
        <Show when={ctx.isLoadingHistory()}>
          <div class="chat-loading-more">
            <LoadingSpinner />
            <span>Loading history...</span>
          </div>
        </Show>

        {/* 消息列表内容 */}
        <div class="chat-message-list-simple">
          <For each={messages()}>
            {(message) => (
              <div class="chat-message-list-item">
                <MessageItem message={message} />
              </div>
            )}
          </For>
        </div>

        {/* Working 状态 */}
        <Show when={ctx.isWorking()}>
          <div class="chat-working-indicator-wrapper">
            <WorkingIndicator />
          </div>
        </Show>
      </div>

      {/* 返回底部按钮 */}
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
