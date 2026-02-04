import { type Component, type Accessor, createSignal, createEffect, createMemo, onCleanup, Show, For } from 'solid-js';
import { cn } from '../../../utils/cn';
import { deferAfterPaint } from '../../../utils/defer';
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
  const [localCollapsed, setLocalCollapsed] = createSignal(true);

  // Keep local state in sync with the message store (and provide a default when missing).
  createEffect(() => {
    setLocalCollapsed(props.block.collapsed ?? true);
  });

  const isCollapsed = () => localCollapsed();

  const toggleCollapse = () => {
    // UI first: toggle locally, then update the store.
    setLocalCollapsed((v) => !v);
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
      {/* Header - always visible */}
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

        {/* Approval actions (high-risk tools) */}
        <Show when={props.block.requiresApproval === true && props.block.approvalState === 'required'}>
          <div class="chat-tool-approval-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              class="chat-tool-approval-btn chat-tool-approval-btn-approve"
              onClick={(e) => {
                e.stopPropagation();
                ctx.approveToolCall(props.messageId, props.block.toolId, true);
              }}
            >
              Approve
            </button>
            <button
              type="button"
              class="chat-tool-approval-btn chat-tool-approval-btn-reject"
              onClick={(e) => {
                e.stopPropagation();
                ctx.approveToolCall(props.messageId, props.block.toolId, false);
              }}
            >
              Reject
            </button>
          </div>
        </Show>

        {/* Show summary when collapsed (avoid cluttering the header when awaiting approval). */}
        <Show when={isCollapsed() && !(props.block.requiresApproval === true && props.block.approvalState === 'required')}>
          <span class="chat-tool-summary">{getSummary()}</span>
        </Show>
      </div>

      {/* Details when expanded */}
      <Show when={!isCollapsed()}>
        <div class="chat-tool-call-body">
          {/* Arguments */}
          <div class="chat-tool-section">
            <ToolPayloadViewer label="Arguments" class="chat-tool-args" value={() => props.block.args} />
          </div>

          {/* Result */}
          <Show when={props.block.result !== undefined}>
            <div class="chat-tool-section">
              <ToolPayloadViewer label="Result" class="chat-tool-result" value={() => props.block.result} />
            </div>
          </Show>

          {/* Error */}
          <Show when={props.block.error}>
            <div class="chat-tool-section chat-tool-error-section">
              <div class="chat-tool-section-label">Error</div>
              <div class="chat-tool-error">{props.block.error}</div>
            </div>
          </Show>

          {/* Nested blocks */}
          <Show when={props.block.children && props.block.children.length > 0}>
            <div class="chat-tool-children">
              <For each={props.block.children}>
                {(child, index) => (
                  <BlockRenderer
                    block={child}
                    messageId={props.messageId}
                    blockIndex={index()}
                    isStreaming={ctx.streamingMessageId() === props.messageId}
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

const DEFAULT_VISIBLE_CHARS = 20_000;
const MORE_CHARS_STEP = 20_000;

function ToolPayloadViewer(props: { label: string; class: string; value: Accessor<unknown> }) {
  const [mode, setMode] = createSignal<'preview' | 'full'>('full');
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [fullText, setFullText] = createSignal<string | null>(null);
  const [visibleChars, setVisibleChars] = createSignal(DEFAULT_VISIBLE_CHARS);

  let runId = 0;
  let disposed = false;

  onCleanup(() => {
    disposed = true;
    runId++;
  });

  const previewText = createMemo(() => formatPreview(props.value()));

  const displayedFullText = createMemo(() => {
    const text = fullText();
    if (!text) return '';
    const limit = visibleChars();
    return text.length > limit ? text.slice(0, limit) : text;
  });

  const hasMore = () => {
    const text = fullText();
    return !!text && text.length > visibleChars();
  };

  const startFull = () => setMode('full');
  const backToPreview = () => {
    // Cancel any pending work and drop the cached full string to free memory.
    runId++;
    setMode('preview');
    setIsLoading(false);
    setError(null);
    setFullText(null);
    setVisibleChars(DEFAULT_VISIBLE_CHARS);
  };

  // UI-first: render the expanded state, then stringify after the next paint (can be expensive).
  createEffect(() => {
    if (mode() !== 'full') return;

    const input = props.value();
    const currentRun = ++runId;
    setIsLoading(true);
    setError(null);
    setFullText(null);
    setVisibleChars(DEFAULT_VISIBLE_CHARS);

    // Snapshot the value for this run; we only care about the latest runId.
    const snapshot = input;
    deferAfterPaint(() => {
      const canCommit = () => !disposed && currentRun === runId;
      if (!canCommit()) return;
      try {
        const text = formatFull(snapshot);
        if (canCommit()) setFullText(text);
      } catch (e) {
        if (canCommit()) setError(e instanceof Error ? e.message : 'Failed to render payload');
      } finally {
        if (canCommit()) setIsLoading(false);
      }
    });
  });

  const content = () => {
    if (mode() === 'preview') return previewText();
    if (isLoading()) return 'Preparing...';
    if (error()) return `Error: ${error()}`;
    return displayedFullText();
  };

  return (
    <>
      <div class="chat-tool-section-header">
        <div class="chat-tool-section-label">{props.label}</div>
        <div class="chat-tool-json-actions">
          <Show when={mode() === 'preview'}>
            <button type="button" class="chat-tool-json-action-btn" onClick={startFull}>
              Render full
            </button>
          </Show>
          <Show when={mode() === 'full'}>
            <button type="button" class="chat-tool-json-action-btn" onClick={backToPreview}>
              Preview
            </button>
          </Show>
          <Show when={mode() === 'full' && hasMore()}>
            <button
              type="button"
              class="chat-tool-json-action-btn"
              onClick={() => setVisibleChars((n) => n + MORE_CHARS_STEP)}
            >
              Show more
            </button>
          </Show>
        </div>
      </div>
      <pre class={props.class}>{content()}</pre>
      <Show when={mode() === 'full' && hasMore()}>
        <div class="chat-tool-json-hint">
          Showing first {visibleChars().toLocaleString()} characters.
        </div>
      </Show>
    </>
  );
}

function formatFull(value: unknown): string {
  if (typeof value === 'string') return value;
  return safeJsonStringify(value, 2);
}

function formatPreview(value: unknown): string {
  // Result could be a long string; preview keeps it readable without blocking UI.
  if (typeof value === 'string') return truncateText(value, 500);
  return previewJson(value, { maxDepth: 2, maxObjectEntries: 40, maxArrayEntries: 40, maxStringLen: 200 });
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

function safeJsonStringify(value: unknown, space: number): string {
  const seen = new WeakSet<object>();

  return JSON.stringify(
    value,
    (_key, v: unknown) => {
      if (typeof v === 'bigint') return v.toString();
      if (typeof v === 'function') {
        const fn = v as { name?: string };
        return `[Function ${fn.name || 'anonymous'}]`;
      }
      if (typeof v === 'symbol') return v.toString();
      if (v instanceof Error) {
        return { name: v.name, message: v.message, stack: v.stack };
      }
      if (v && typeof v === 'object') {
        const obj = v as object;
        if (seen.has(obj)) return '[Circular]';
        seen.add(obj);
      }
      return v;
    },
    space
  );
}

function previewJson(
  value: unknown,
  opts: { maxDepth: number; maxObjectEntries: number; maxArrayEntries: number; maxStringLen: number }
): string {
  const seen = new WeakSet<object>();
  return formatPreviewValue(value, opts, 0, seen);
}

function formatPreviewValue(
  value: unknown,
  opts: { maxDepth: number; maxObjectEntries: number; maxArrayEntries: number; maxStringLen: number },
  depth: number,
  seen: WeakSet<object>
): string {
  const indent = (n: number) => '  '.repeat(n);

  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(truncateText(value, opts.maxStringLen));
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'bigint') return `"${value.toString()}n"`;
  if (typeof value === 'function') {
    const fn = value as { name?: string };
    return JSON.stringify(`[Function ${fn.name || 'anonymous'}]`);
  }
  if (typeof value === 'symbol') return JSON.stringify(value.toString());

  if (value instanceof Error) {
    return JSON.stringify({ name: value.name, message: value.message });
  }

  if (typeof value !== 'object') return JSON.stringify(String(value));

  const obj = value as object;
  if (seen.has(obj)) return JSON.stringify('[Circular]');
  seen.add(obj);

  if (Array.isArray(value)) {
    if (depth >= opts.maxDepth) return JSON.stringify(`[Array(${value.length})]`);
    const lines: string[] = ['['];
    const max = Math.min(value.length, opts.maxArrayEntries);
    for (let i = 0; i < max; i++) {
      lines.push(`${indent(depth + 1)}${formatPreviewValue(value[i], opts, depth + 1, seen)}`);
    }
    if (value.length > max) {
      lines.push(`${indent(depth + 1)}"... (${value.length - max} more)"`);
    }
    lines.push(`${indent(depth)}]`);
    return lines.join('\n');
  }

  if (depth >= opts.maxDepth) return JSON.stringify('[Object]');

  const record = value as Record<string, unknown>;
  const lines: string[] = ['{'];

  let count = 0;
  let truncated = false;
  for (const key in record) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    if (count >= opts.maxObjectEntries) {
      truncated = true;
      break;
    }
    const v = record[key];
    const rendered = formatPreviewValue(v, opts, depth + 1, seen);
    lines.push(`${indent(depth + 1)}${JSON.stringify(key)}: ${rendered}`);
    count++;
  }

  if (truncated) {
    lines.push(`${indent(depth + 1)}"...": "... (truncated)"`);
  }

  lines.push(`${indent(depth)}}`);
  return lines.join('\n');
}

// Icon components
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
