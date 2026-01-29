import { type Component } from 'solid-js';
import { cn } from '../../../utils/cn';

export interface WorkingIndicatorProps {
  message?: string;
  class?: string;
}

export const WorkingIndicator: Component<WorkingIndicatorProps> = (props) => {
  return (
    <div class={cn('chat-working-indicator', props.class)}>
      <div class="chat-working-dots">
        <span class="chat-working-dot" />
        <span class="chat-working-dot" />
        <span class="chat-working-dot" />
      </div>
      <span class="chat-working-text">
        {props.message || 'Working...'}
      </span>
    </div>
  );
};
