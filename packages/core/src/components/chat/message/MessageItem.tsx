import { type Component, Show } from 'solid-js';
import { cn } from '../../../utils/cn';
import { useChatContext } from '../ChatProvider';
import type { Message } from '../types';
import { MessageAvatar } from './MessageAvatar';
import { MessageBubble } from './MessageBubble';
import { MessageMeta } from './MessageMeta';
import { MessageActions } from './MessageActions';

export interface MessageItemProps {
  message: Message;
  showAvatar?: boolean;
  class?: string;
}

export const MessageItem: Component<MessageItemProps> = (props) => {
  const ctx = useChatContext();
  const isUser = () => props.message.role === 'user';
  const isAssistant = () => props.message.role === 'assistant';

  const avatarSrc = () => {
    if (isUser()) return ctx.config().userAvatar;
    if (isAssistant()) return ctx.config().assistantAvatar;
    return undefined;
  };

  return (
    <div
      class={cn(
        'chat-message-item',
        isUser() && 'chat-message-item-user',
        isAssistant() && 'chat-message-item-assistant',
        props.class
      )}
    >
      {/* Avatar */}
      <Show when={props.showAvatar !== false}>
        <MessageAvatar role={props.message.role} src={avatarSrc()} />
      </Show>

      {/* Message content */}
      <div class="chat-message-content-wrapper">
        <MessageBubble message={props.message} />

        {/* Meta + actions */}
        <div class="chat-message-footer">
          <MessageMeta
            timestamp={props.message.timestamp}
            status={props.message.status}
          />
          <MessageActions message={props.message} />
        </div>
      </div>
    </div>
  );
};
