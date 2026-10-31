import { createSignal, onMount, Show, createMemo, createEffect, on, onCleanup } from 'solid-js';
import { ensureDemoHighlighting } from '../../highlighting';
import { cn } from '@floegence/floe-webapp-core';
import { highlightCode } from '@floegence/floe-webapp-core/chat';
import { Button, FeedbackIndicator } from '@floegence/floe-webapp-core/ui';
import { CheckIcon, CopyIcon } from '@floegence/floe-webapp-core/icons';
import { Skeleton } from '@floegence/floe-webapp-core/loading';

export interface CodeSnippetProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  showCopyButton?: boolean;
  maxHeight?: string;
  class?: string;
}

/**
 * CodeSnippet - Display code with syntax highlighting and copy functionality.
 * Uses the shared highlightCode utility from core for Shiki-powered highlighting.
 */
export function CodeSnippet(props: CodeSnippetProps) {
  const [highlightedHtml, setHighlightedHtml] = createSignal<string | null>(null);
  const [copied, setCopied] = createSignal(false);
  const [copyError, setCopyError] = createSignal('');
  let copyButton: HTMLButtonElement | undefined;
  let disposed = false;
  const [isLoading, setIsLoading] = createSignal(true);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  let request = 0;
  onCleanup(() => {
    disposed = true;
    request += 1;
    clearTimeout(copyTimer);
  });

  const language = createMemo(() => props.language ?? 'tsx');
  const showCopyButton = createMemo(() => props.showCopyButton !== false);

  const highlightCodeAsync = async () => {
    const current = ++request;
    const code = props.code;
    const lang = language();
    setIsLoading(true);
    try {
      await ensureDemoHighlighting();
      const html = await highlightCode(code, lang, 'github-dark');
      if (current === request) setHighlightedHtml(html);
    } catch (error) {
      console.error('Failed to highlight code:', error);
      if (current === request)
        setHighlightedHtml('<pre class="shiki"><code>' + escapeHtml(code) + '</code></pre>');
    } finally {
      if (current === request) setIsLoading(false);
    }
  };
  onMount(() => void highlightCodeAsync());
  createEffect(on([() => props.code, language], () => void highlightCodeAsync(), { defer: true }));

  const handleCopy = async () => {
    setCopyError('');
    try {
      await navigator.clipboard.writeText(props.code);
      if (disposed) return;
      setCopied(true);
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
      if (!disposed) setCopyError('Clipboard unavailable. Select the code and copy it manually.');
    }
  };

  return (
    <div
      class={cn('overflow-hidden rounded-group', 'border border-[var(--floe-line)]', props.class)}
    >
      {/* Header with title and copy button */}
      <Show when={props.title || showCopyButton()}>
        <div class="flex items-center justify-between px-3 py-1.5 bg-[var(--floe-well)] border-b border-[var(--floe-line)]">
          <Show when={props.title}>
            <span class="text-[length:var(--floe-type-caption)] text-[var(--floe-ink-soft)] font-mono">
              {props.title}
            </span>
          </Show>
          <Show when={!props.title}>
            <span class="text-[length:var(--floe-type-caption)] text-[var(--floe-ink-soft)] font-mono uppercase tracking-[0.06em]">
              {language()}
            </span>
          </Show>
          <Show when={showCopyButton()}>
            <div class="flex items-center gap-2">
              <FeedbackIndicator
                entries={
                  copyError() ? [{ id: 'copy-error', severity: 'error', summary: copyError() }] : []
                }
                label="Copy feedback"
                closeLabel="Close copy feedback"
                restoreFocus={() => copyButton}
              />
              <Button
                ref={copyButton}
                aria-label={copied() ? 'Code copied' : 'Copy code'}
                variant="ghost"
                size="xs"
                onClick={handleCopy}
                class="text-[var(--floe-ink-quiet)] hover:text-[var(--floe-ink)]"
                title={copied() ? 'Copied!' : 'Copy code'}
              >
                <Show when={copied()} fallback={<CopyIcon class="w-3 h-3" />}>
                  <CheckIcon class="w-3 h-3 text-success" />
                </Show>
              </Button>
            </div>
          </Show>
        </div>
      </Show>

      {/* Code content - Use chat-code-block class for color isolation */}
      <div
        class="chat-code-block overflow-x-auto !border-0 !m-0 !rounded-none"
        style={{
          'max-height': props.maxHeight,
          ...(props.maxHeight ? { 'overflow-y': 'auto' } : {}),
        }}
      >
        <Show
          when={!isLoading()}
          fallback={
            <div class="p-3 space-y-1.5 bg-[var(--floe-plane)]">
              <Skeleton class="h-3 w-3/4 bg-[var(--floe-well)]" />
              <Skeleton class="h-3 w-1/2 bg-[var(--floe-well)]" />
              <Skeleton class="h-3 w-2/3 bg-[var(--floe-well)]" />
            </div>
          }
        >
          <div
            class="chat-code-content [&_pre]:m-0 [&_pre]:p-3"
            // eslint-disable-next-line solid/no-innerhtml -- Highlighter output escapes code; fallback is escaped locally.
            innerHTML={highlightedHtml() ?? ''}
          />
        </Show>
      </div>
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
