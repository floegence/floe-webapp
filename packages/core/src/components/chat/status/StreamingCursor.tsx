import { type Component } from 'solid-js';
import { cn } from '../../../utils/cn';

export interface StreamingCursorProps {
  class?: string;
}

export const StreamingCursor: Component<StreamingCursorProps> = (props) => {
  return <span class={cn('chat-streaming-cursor', props.class)}>▌</span>;
};
