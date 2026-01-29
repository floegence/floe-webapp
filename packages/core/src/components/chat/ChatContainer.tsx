import { type Component, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { ChatProvider, type ChatProviderProps } from './ChatProvider';
import { SimpleMessageList } from './message-list';
import { ChatInput } from './input';
import { ConnectionStatus, type ConnectionState } from './status';

export interface ChatContainerProps extends ChatProviderProps {
  /** 自定义标题 */
  title?: string;
  /** 连接状态 */
  connectionState?: ConnectionState;
  /** 是否显示头部 */
  showHeader?: boolean;
  /** 自定义头部 */
  header?: Component;
  /** 自定义底部（替代默认输入框） */
  footer?: Component;
  /** 禁用输入 */
  inputDisabled?: boolean;
  /** 输入框占位符 */
  inputPlaceholder?: string;
  /** 容器样式类 */
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
        {/* 头部 */}
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

        {/* 消息列表 */}
        <SimpleMessageList class="chat-container-messages" />

        {/* 输入区域 */}
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

// 默认头部组件
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
