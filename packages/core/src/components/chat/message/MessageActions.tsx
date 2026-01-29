import { type Component, createSignal, Show } from 'solid-js';
import { cn } from '../../../utils/cn';
import { useChatContext } from '../ChatProvider';
import type { Message } from '../types';

export interface MessageActionsProps {
  message: Message;
  class?: string;
}

export const MessageActions: Component<MessageActionsProps> = (props) => {
  const ctx = useChatContext();
  const [copied, setCopied] = createSignal(false);

  const getTextContent = (): string => {
    return props.message.blocks
      .map((block) => {
        if ('content' in block && typeof block.content === 'string') {
          return block.content;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  };

  const handleCopy = async () => {
    const text = getTextContent();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleRetry = () => {
    ctx.retryMessage(props.message.id);
  };

  return (
    <div class={cn('chat-message-actions', props.class)}>
      {/* 复制按钮 */}
      <button
        type="button"
        class="chat-message-action-btn"
        onClick={handleCopy}
        title={copied() ? 'Copied!' : 'Copy'}
      >
        <Show when={copied()} fallback={<CopyIcon />}>
          <CheckIcon />
        </Show>
      </button>

      {/* 重试按钮（仅错误状态显示） */}
      <Show when={props.message.status === 'error'}>
        <button
          type="button"
          class="chat-message-action-btn"
          onClick={handleRetry}
          title="Retry"
        >
          <RetryIcon />
        </button>
      </Show>
    </div>
  );
};

const CopyIcon: Component = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon: Component = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const RetryIcon: Component = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);
