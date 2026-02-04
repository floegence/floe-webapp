import { type Component, createSignal, createEffect, createMemo, Show, For, onCleanup } from 'solid-js';
import { cn } from '../../../utils/cn';
import { deferAfterPaint } from '../../../utils/defer';
import { useVirtualWindow } from '../../../hooks/useVirtualWindow';
import { computeCodeDiff, computeCodeDiffSync, hasDiffWorker } from '../hooks/useCodeDiff';
import type { CodeDiffRenderModel, SplitDiffLine, UnifiedDiffLine } from '../types';

export interface CodeDiffBlockProps {
  language: string;
  oldCode: string;
  newCode: string;
  filename?: string;
  class?: string;
}

const LARGE_DIFF_CHARS = 80_000;
const DIFF_ROW_HEIGHT_PX = 18;

export const CodeDiffBlock: Component<CodeDiffBlockProps> = (props) => {
  const [viewMode, setViewMode] = createSignal<'unified' | 'split'>('unified');
  const [copied, setCopied] = createSignal(false);

  const [model, setModel] = createSignal<CodeDiffRenderModel | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  let runId = 0;

  onCleanup(() => {
    runId += 1;
  });

  createEffect(() => {
    const oldCode = props.oldCode ?? '';
    const newCode = props.newCode ?? '';

    const currentRun = ++runId;
    setIsLoading(true);
    setModel(null);

    const snapshotOld = oldCode;
    const snapshotNew = newCode;

    // UI-first: let the header paint first, then compute diff.
    deferAfterPaint(() => {
      if (currentRun !== runId) return;

      const totalChars = snapshotOld.length + snapshotNew.length;
      const isLarge = totalChars > LARGE_DIFF_CHARS;

      // Large diffs must not block the main thread; require a worker.
      if (isLarge && !hasDiffWorker()) {
        setIsLoading(false);
        return;
      }

      const task = hasDiffWorker()
        ? computeCodeDiff(snapshotOld, snapshotNew)
        : Promise.resolve(computeCodeDiffSync(snapshotOld, snapshotNew));

      void task
        .then((m) => {
          if (currentRun !== runId) return;
          setModel(m);
        })
        .catch((e) => {
          console.error('Diff compute error:', e);
          if (currentRun !== runId) return;
          setModel(null);
        })
        .finally(() => {
          if (currentRun === runId) setIsLoading(false);
        });
    });
  });

  const stats = createMemo(() => model()?.stats);

  // Copy new code
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
      {/* Header */}
      <div class="chat-code-diff-header">
        <div class="chat-code-diff-info">
          <Show when={props.filename}>
            <span class="chat-code-diff-filename">{props.filename}</span>
          </Show>
          <Show
            when={stats()}
            fallback={<span class="chat-code-diff-stats text-muted-foreground">...</span>}
          >
            <span class="chat-code-diff-stats">
              <span style={{ color: 'rgb(34 197 94)' }}>+{stats()!.added}</span>
              <span style={{ color: 'rgb(239 68 68)', 'margin-left': '0.5rem' }}>-{stats()!.removed}</span>
            </span>
          </Show>
        </div>
        <div class="chat-code-diff-actions">
          {/* View toggle */}
          <div class="chat-code-diff-view-toggle">
            <button
              type="button"
              class={cn('chat-code-diff-view-btn', viewMode() === 'unified' && 'active')}
              onClick={() => setViewMode('unified')}
            >
              Unified
            </button>
            <button
              type="button"
              class={cn('chat-code-diff-view-btn', viewMode() === 'split' && 'active')}
              onClick={() => setViewMode('split')}
            >
              Split
            </button>
          </div>
          {/* Copy button */}
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

      <Show
        when={model()}
        fallback={
          <div class="chat-code-diff-content">
            <Show when={isLoading()}>
              <div class="p-3 text-xs text-muted-foreground">Computing diff...</div>
            </Show>
            <Show when={!isLoading()}>
              <div class="p-3 text-xs text-muted-foreground">
                Diff is too large to render without a worker. Configure `configureDiffWorker(createDiffWorker())`.
              </div>
            </Show>
          </div>
        }
      >
        <Show when={viewMode() === 'unified'} fallback={<SplitDiffView model={model()!} />}>
          <UnifiedDiffView model={model()!} />
        </Show>
      </Show>
    </div>
  );
};

function UnifiedDiffView(props: { model: CodeDiffRenderModel }) {
  const lines = () => props.model.unifiedLines;

  const v = useVirtualWindow({
    count: () => lines().length,
    itemSize: () => DIFF_ROW_HEIGHT_PX,
    overscan: 12,
  });

  const visibleIndices = createMemo(() => {
    const { start, end } = v.range();
    const out: number[] = [];
    for (let i = start; i < end; i += 1) out.push(i);
    return out;
  });

  return (
    <div
      ref={(el) => v.scrollRef(el)}
      class="chat-code-diff-content"
      onScroll={v.onScroll}
    >
      <div style={{ 'padding-top': `${v.paddingTop()}px`, 'padding-bottom': `${v.paddingBottom()}px` }}>
        <div class="chat-diff-unified">
          <For each={visibleIndices()}>
            {(idx) => <UnifiedLineRow line={lines()[idx]} />}
          </For>
        </div>
      </div>
    </div>
  );
}

function UnifiedLineRow(props: { line: UnifiedDiffLine | undefined }) {
  const line = () => props.line;
  return (
    <div
      class={cn(
        'chat-diff-line',
        line()?.type === 'added' && 'chat-diff-line-added',
        line()?.type === 'removed' && 'chat-diff-line-removed'
      )}
      style={{ height: `${DIFF_ROW_HEIGHT_PX}px` }}
    >
      <span class="chat-diff-line-number">{line()?.lineNumber ?? ''}</span>
      <span class="chat-diff-line-sign">{line()?.sign ?? ' '}</span>
      <span class="chat-diff-line-content">{line()?.content ?? ' '}</span>
    </div>
  );
}

function SplitDiffView(props: { model: CodeDiffRenderModel }) {
  const left = () => props.model.split.left;
  const right = () => props.model.split.right;

  const v = useVirtualWindow({
    count: () => left().length,
    itemSize: () => DIFF_ROW_HEIGHT_PX,
    overscan: 12,
  });

  const visibleIndices = createMemo(() => {
    const { start, end } = v.range();
    const out: number[] = [];
    for (let i = start; i < end; i += 1) out.push(i);
    return out;
  });

  return (
    <div
      ref={(el) => v.scrollRef(el)}
      class="chat-code-diff-content"
      onScroll={v.onScroll}
    >
      <div style={{ 'padding-top': `${v.paddingTop()}px`, 'padding-bottom': `${v.paddingBottom()}px` }}>
        <div class="chat-diff-split">
          <div class="chat-diff-split-side">
            <For each={visibleIndices()}>
              {(idx) => <SplitLineRow line={left()[idx]} />}
            </For>
          </div>
          <div class="chat-diff-split-side">
            <For each={visibleIndices()}>
              {(idx) => <SplitLineRow line={right()[idx]} />}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
}

function SplitLineRow(props: { line: SplitDiffLine | undefined }) {
  const line = () => props.line;
  return (
    <div
      class={cn(
        'chat-diff-line',
        line()?.type === 'added' && 'chat-diff-line-added',
        line()?.type === 'removed' && 'chat-diff-line-removed',
        line()?.type === 'empty' && 'chat-diff-line-empty'
      )}
      style={{ height: `${DIFF_ROW_HEIGHT_PX}px` }}
    >
      <span class="chat-diff-line-number">{line()?.lineNumber ?? ''}</span>
      <span class="chat-diff-line-content">{line()?.content ?? ' '}</span>
    </div>
  );
}

// Icons
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

