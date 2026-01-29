import { type Component, Show } from 'solid-js';
import { cn } from '../../../utils/cn';
import type { MessageStatus } from '../types';

export interface MessageMetaProps {
  timestamp: number;
  status?: MessageStatus;
  class?: string;
}

export const MessageMeta: Component<MessageMetaProps> = (props) => {
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = () => {
    switch (props.status) {
      case 'sending':
        return <SendingIcon />;
      case 'streaming':
        return <StreamingIcon />;
      case 'error':
        return <ErrorIcon />;
      default:
        return null;
    }
  };

  return (
    <div class={cn('chat-message-meta', props.class)}>
      <span class="chat-message-time">{formatTime(props.timestamp)}</span>
      <Show when={props.status && props.status !== 'complete'}>
        <span class="chat-message-status">{getStatusIcon()}</span>
      </Show>
    </div>
  );
};

const SendingIcon: Component = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-pulse">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const StreamingIcon: Component = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const ErrorIcon: Component = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-red-500">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
