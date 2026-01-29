import { type Component, createSignal, Show, For } from 'solid-js';
import { cn } from '../../../utils/cn';
import { useChatContext } from '../ChatProvider';
import { BlockRenderer } from './BlockRenderer';
import type { ToolCallBlock as ToolCallBlockType } from '../types';

export interface ToolCallBlockProps {
  block: ToolCallBlockType;
  messageId: string;
  blockIndex: number;
  class?: string;
}

export const ToolCallBlock: Component<ToolCallBlockProps> = (props) => {
  const ctx = useChatContext();
  const [localCollapsed, setLocalCollapsed] = createSignal(props.block.collapsed ?? true);

  const isCollapsed = () => props.block.collapsed ?? localCollapsed();

  const toggleCollapse = () => {
    setLocalCollapsed(!localCollapsed());
    ctx.toggleToolCollapse(props.messageId, props.block.toolId);
  };

  const getStatusColor = () => {
    switch (props.block.status) {
      case 'pending':
        return 'text-muted-foreground';
      case 'running':
        return 'text-blue-500';
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = () => {
    switch (props.block.status) {
      case 'pending':
        return <PendingIcon />;
      case 'running':
        return <RunningIcon />;
      case 'success':
        return <SuccessIcon />;
      case 'error':
        return <ErrorIcon />;
      default:
        return null;
    }
  };

  const getSummary = (): string => {
    if (props.block.status === 'running') return 'Running...';
    if (props.block.status === 'error') {
      const errorMsg = props.block.error || 'Unknown error';
      return `Error: ${errorMsg.slice(0, 50)}${errorMsg.length > 50 ? '...' : ''}`;
    }
    if (props.block.status === 'success') {
      if (typeof props.block.result === 'string') {
        const preview = props.block.result.slice(0, 60);
        return preview + (props.block.result.length > 60 ? '...' : '');
      }
      return 'Completed';
    }
    return 'Pending';
  };

  return (
    <div class={cn('chat-tool-call-block', props.class)}>
      {/* 头部 - 始终显示 */}
      <div class="chat-tool-call-header" onClick={toggleCollapse}>
        <button type="button" class="chat-tool-collapse-btn">
          <Show when={isCollapsed()} fallback={<ChevronDownIcon />}>
            <ChevronRightIcon />
          </Show>
        </button>

        <span class={cn('chat-tool-status-icon', getStatusColor())}>
          {getStatusIcon()}
        </span>

        <span class="chat-tool-name">{props.block.toolName}</span>

        {/* 折叠时显示摘要 */}
        <Show when={isCollapsed()}>
          <span class="chat-tool-summary">{getSummary()}</span>
        </Show>
      </div>

      {/* 展开时显示详情 */}
      <Show when={!isCollapsed()}>
        <div class="chat-tool-call-body">
          {/* 参数 */}
          <div class="chat-tool-section">
            <div class="chat-tool-section-label">Arguments</div>
            <pre class="chat-tool-args">
              {JSON.stringify(props.block.args, null, 2)}
            </pre>
          </div>

          {/* 结果 */}
          <Show when={props.block.result !== undefined}>
            <div class="chat-tool-section">
              <div class="chat-tool-section-label">Result</div>
              <pre class="chat-tool-result">
                {typeof props.block.result === 'string'
                  ? props.block.result
                  : JSON.stringify(props.block.result, null, 2)}
              </pre>
            </div>
          </Show>

          {/* 错误 */}
          <Show when={props.block.error}>
            <div class="chat-tool-section chat-tool-error-section">
              <div class="chat-tool-section-label">Error</div>
              <div class="chat-tool-error">{props.block.error}</div>
            </div>
          </Show>

          {/* 嵌套子内容 */}
          <Show when={props.block.children && props.block.children.length > 0}>
            <div class="chat-tool-children">
              <For each={props.block.children}>
                {(child, index) => (
                  <BlockRenderer
                    block={child}
                    messageId={props.messageId}
                    blockIndex={index()}
                  />
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

// 图标组件
const ChevronRightIcon: Component = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ChevronDownIcon: Component = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const PendingIcon: Component = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const RunningIcon: Component = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const SuccessIcon: Component = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ErrorIcon: Component = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
