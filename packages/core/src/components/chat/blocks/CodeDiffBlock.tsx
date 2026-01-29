import { type Component, createSignal, createMemo, Show, For } from 'solid-js';
import { diffLines, type Change } from 'diff';
import { cn } from '../../../utils/cn';

export interface CodeDiffBlockProps {
  language: string;
  oldCode: string;
  newCode: string;
  filename?: string;
  class?: string;
}

export const CodeDiffBlock: Component<CodeDiffBlockProps> = (props) => {
  const [viewMode, setViewMode] = createSignal<'unified' | 'split'>('unified');
  const [copied, setCopied] = createSignal(false);

  // 计算 diff
  const diffResult = createMemo(() => {
    return diffLines(props.oldCode, props.newCode);
  });

  // 统计变化
  const stats = createMemo(() => {
    const changes = diffResult();
    let added = 0;
    let removed = 0;

    for (const change of changes) {
      const lines = change.value.split('\n').filter((l) => l !== '').length;
      if (change.added) added += lines;
      if (change.removed) removed += lines;
    }

    return { added, removed };
  });

  // 复制新代码
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.newCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div class={cn('chat-code-diff-block', props.class)}>
      {/* 头部 */}
      <div class="chat-code-diff-header">
        <div class="chat-code-diff-info">
          <Show when={props.filename}>
            <span class="chat-code-diff-filename">{props.filename}</span>
          </Show>
          <span class="chat-code-diff-stats">
            <span style={{ color: 'rgb(34 197 94)' }}>+{stats().added}</span>
            <span style={{ color: 'rgb(239 68 68)', 'margin-left': '0.5rem' }}>-{stats().removed}</span>
          </span>
        </div>
        <div class="chat-code-diff-actions">
          {/* 视图切换 */}
          <div class="chat-code-diff-view-toggle">
            <button
              type="button"
              class={cn(
                'chat-code-diff-view-btn',
                viewMode() === 'unified' && 'active'
              )}
              onClick={() => setViewMode('unified')}
            >
              Unified
            </button>
            <button
              type="button"
              class={cn(
                'chat-code-diff-view-btn',
                viewMode() === 'split' && 'active'
              )}
              onClick={() => setViewMode('split')}
            >
              Split
            </button>
          </div>
          {/* 复制按钮 */}
          <button
            type="button"
            class="chat-code-copy-btn"
            onClick={handleCopy}
            title={copied() ? 'Copied!' : 'Copy new code'}
          >
            <Show when={copied()} fallback={<CopyIcon />}>
              <CheckIcon />
            </Show>
          </button>
        </div>
      </div>

      {/* Diff 内容 */}
      <div class="chat-code-diff-content">
        <Show
          when={viewMode() === 'unified'}
          fallback={<SplitView changes={diffResult()} />}
        >
          <UnifiedView changes={diffResult()} />
        </Show>
      </div>
    </div>
  );
};

// 统一视图
const UnifiedView: Component<{ changes: Change[] }> = (props) => {
  let lineNumber = 0;

  return (
    <div class="chat-diff-unified">
      <For each={props.changes}>
        {(change) => {
          const lines = change.value.split('\n');
          // 移除最后一个空行
          if (lines[lines.length - 1] === '') lines.pop();

          return (
            <For each={lines}>
              {(line) => {
                if (!change.added && !change.removed) {
                  lineNumber++;
                }
                const ln = change.added || change.removed ? '' : lineNumber;

                return (
                  <div
                    class={cn(
                      'chat-diff-line',
                      change.added && 'chat-diff-line-added',
                      change.removed && 'chat-diff-line-removed'
                    )}
                  >
                    <span class="chat-diff-line-number">{ln}</span>
                    <span class="chat-diff-line-sign">
                      {change.added ? '+' : change.removed ? '-' : ' '}
                    </span>
                    <span class="chat-diff-line-content">{line || ' '}</span>
                  </div>
                );
              }}
            </For>
          );
        }}
      </For>
    </div>
  );
};

// 分栏视图
const SplitView: Component<{ changes: Change[] }> = (props) => {
  // 构建左右两侧的行
  const buildSides = () => {
    const left: Array<{ content: string; type: 'removed' | 'context' | 'empty' }> = [];
    const right: Array<{ content: string; type: 'added' | 'context' | 'empty' }> = [];

    for (const change of props.changes) {
      const lines = change.value.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();

      if (change.added) {
        for (const line of lines) {
          left.push({ content: '', type: 'empty' });
          right.push({ content: line, type: 'added' });
        }
      } else if (change.removed) {
        for (const line of lines) {
          left.push({ content: line, type: 'removed' });
          right.push({ content: '', type: 'empty' });
        }
      } else {
        for (const line of lines) {
          left.push({ content: line, type: 'context' });
          right.push({ content: line, type: 'context' });
        }
      }
    }

    return { left, right };
  };

  const sides = createMemo(buildSides);

  return (
    <div class="chat-diff-split">
      {/* 左侧 - 旧代码 */}
      <div class="chat-diff-split-side">
        <For each={sides().left}>
          {(line, i) => (
            <div
              class={cn(
                'chat-diff-line',
                line.type === 'removed' && 'chat-diff-line-removed',
                line.type === 'empty' && 'chat-diff-line-empty'
              )}
            >
              <span class="chat-diff-line-number">
                {line.type !== 'empty' ? i() + 1 : ''}
              </span>
              <span class="chat-diff-line-content">{line.content || ' '}</span>
            </div>
          )}
        </For>
      </div>
      {/* 右侧 - 新代码 */}
      <div class="chat-diff-split-side">
        <For each={sides().right}>
          {(line, i) => (
            <div
              class={cn(
                'chat-diff-line',
                line.type === 'added' && 'chat-diff-line-added',
                line.type === 'empty' && 'chat-diff-line-empty'
              )}
            >
              <span class="chat-diff-line-number">
                {line.type !== 'empty' ? i() + 1 : ''}
              </span>
              <span class="chat-diff-line-content">{line.content || ' '}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

// 图标
const CopyIcon: Component = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon: Component = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
