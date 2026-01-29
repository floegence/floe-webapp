import { type Component, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { ChatProvider, type ChatProviderProps } from './ChatProvider';
import { SimpleMessageList } from './message-list';
import { ChatInput } from './input';
import { ConnectionStatus, type ConnectionState } from './status';

export interface ChatContainerProps extends ChatProviderProps {
  /** Custom title */
  title?: string;
  /** Connection state */
  connectionState?: ConnectionState;
  /** Whether to show the header */
  showHeader?: boolean;
  /** Custom header */
  header?: Component;
  /** Custom footer (replaces the default input) */
  footer?: Component;
  /** Disable input */
  inputDisabled?: boolean;
  /** Input placeholder */
  inputPlaceholder?: string;
  /** Container class */
  class?: string;
}

export const ChatContainer: Component<ChatContainerProps> = (props) => {
  return (
    <ChatProvider
      initialMessages={props.initialMessages}
      config={props.config}
      callbacks={props.callbacks}
    >
      <div class={cn('chat-container', props.class)}>
        {/* Header */}
        <Show when={props.showHeader !== false}>
          <Show
            when={!props.header}
            fallback={props.header && <Dynamic component={props.header} />}
          >
            <ChatHeader
              title={props.title}
              connectionState={props.connectionState}
            />
          </Show>
        </Show>

        {/* Message list */}
        <SimpleMessageList class="chat-container-messages" />

        {/* Input area */}
        <Show
          when={!props.footer}
          fallback={props.footer && <Dynamic component={props.footer} />}
        >
          <ChatInput
            class="chat-container-input"
            disabled={props.inputDisabled}
            placeholder={props.inputPlaceholder}
          />
        </Show>
      </div>
    </ChatProvider>
  );
};

// Default header component
interface ChatHeaderProps {
  title?: string;
  connectionState?: ConnectionState;
}

const ChatHeader: Component<ChatHeaderProps> = (props) => {
  return (
    <div class="chat-header">
      <div class="chat-header-title">
        {props.title || 'Chat'}
      </div>
      <Show when={props.connectionState}>
        <ConnectionStatus state={props.connectionState!} />
      </Show>
    </div>
  );
};
