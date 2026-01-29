import { type Component, Show } from 'solid-js';
import { cn } from '../../../utils/cn';

export interface MessageAvatarProps {
  role: 'user' | 'assistant' | 'system';
  src?: string;
  fallback?: string;
  class?: string;
}

export const MessageAvatar: Component<MessageAvatarProps> = (props) => {
  const getFallback = () => {
    if (props.fallback) return props.fallback;
    switch (props.role) {
      case 'user':
        return 'U';
      case 'assistant':
        return 'A';
      case 'system':
        return 'S';
      default:
        return '?';
    }
  };

  return (
    <div
      class={cn(
        'chat-message-avatar',
        `chat-message-avatar-${props.role}`,
        props.class
      )}
    >
      <Show
        when={props.src}
        fallback={<span class="chat-message-avatar-fallback">{getFallback()}</span>}
      >
        <img
          src={props.src}
          alt={`${props.role} avatar`}
          class="chat-message-avatar-image"
        />
      </Show>
    </div>
  );
};
