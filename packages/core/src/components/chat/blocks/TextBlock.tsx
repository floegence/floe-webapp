import { type Component } from 'solid-js';
import { cn } from '../../../utils/cn';

export interface TextBlockProps {
  content: string;
  class?: string;
}

export const TextBlock: Component<TextBlockProps> = (props) => {
  return (
    <div class={cn('chat-text-block whitespace-pre-wrap break-words', props.class)}>
      {props.content}
    </div>
  );
};
