import { type Component, For, Show } from 'solid-js';
import { cn } from '../../../utils/cn';
import type { Message } from '../types';
import { BlockRenderer } from '../blocks';

export interface MessageBubbleProps {
  message: Message;
  class?: string;
}

export const MessageBubble: Component<MessageBubbleProps> = (props) => {
  const isUser = () => props.message.role === 'user';
  const isAssistant = () => props.message.role === 'assistant';

  return (
    <div
      class={cn(
        'chat-message-bubble',
        isUser() && 'chat-message-bubble-user',
        isAssistant() && 'chat-message-bubble-assistant',
        props.message.status === 'error' && 'chat-message-bubble-error',
        props.class
      )}
    >
      <For each={props.message.blocks}>
        {(block, index) => (
          <BlockRenderer
            block={block}
            messageId={props.message.id}
            blockIndex={index()}
          />
        )}
      </For>

      {/* Error state */}
      <Show when={props.message.status === 'error' && props.message.error}>
        <div class="chat-message-error">
          <ErrorIcon />
          <span>{props.message.error}</span>
        </div>
      </Show>
    </div>
  );
};

const ErrorIcon: Component = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
