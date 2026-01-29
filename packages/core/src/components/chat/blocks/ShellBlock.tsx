import { type Component, Show } from 'solid-js';
import { cn } from '../../../utils/cn';

export interface ShellBlockProps {
  command: string;
  output?: string;
  exitCode?: number;
  status: 'running' | 'success' | 'error';
  class?: string;
}

export const ShellBlock: Component<ShellBlockProps> = (props) => {
  return (
    <div class={cn('chat-shell-block', props.class)}>
      {/* Command */}
      <div class="chat-shell-command">
        <span class="chat-shell-prompt">$</span>
        <code class="chat-shell-command-text">{props.command}</code>
        <Show when={props.status === 'running'}>
          <span class="chat-shell-running">
            <LoadingDots />
          </span>
        </Show>
      </div>

      {/* Output */}
      <Show when={props.output}>
        <div
          class={cn(
            'chat-shell-output',
            props.status === 'error' && 'chat-shell-output-error'
          )}
        >
          <pre>{props.output}</pre>
        </div>
      </Show>

      {/* Exit code */}
      <Show when={props.status !== 'running' && props.exitCode !== undefined}>
        <div
          class={cn(
            'chat-shell-exit-code',
            props.exitCode === 0 ? 'chat-shell-exit-success' : 'chat-shell-exit-error'
          )}
        >
          Exit code: {props.exitCode}
        </div>
      </Show>
    </div>
  );
};

const LoadingDots: Component = () => (
  <span class="chat-loading-dots">
    <span class="chat-loading-dot" />
    <span class="chat-loading-dot" />
    <span class="chat-loading-dot" />
  </span>
);
