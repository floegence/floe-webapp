import { type Component, Show } from 'solid-js';
import { cn } from '../../../utils/cn';

export interface ThinkingBlockProps {
  content?: string;
  duration?: number;
  class?: string;
}

export const ThinkingBlock: Component<ThinkingBlockProps> = (props) => {
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div class={cn('chat-thinking-block', props.class)}>
      <div class="chat-thinking-header">
        <ThinkingIcon />
        <span class="chat-thinking-label">Thinking</span>
        <Show when={props.duration !== undefined}>
          <span class="chat-thinking-duration">
            {formatDuration(props.duration!)}
          </span>
        </Show>
      </div>
      <Show when={props.content}>
        <div class="chat-thinking-content">
          {props.content}
        </div>
      </Show>
    </div>
  );
};

const ThinkingIcon: Component = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    class="chat-thinking-icon"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);
