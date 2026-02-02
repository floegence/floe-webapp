import { createSignal, onMount, Show, createMemo, createEffect, on } from 'solid-js';
import { cn, highlightCode, Button, CopyIcon, CheckIcon, Skeleton } from '@floegence/floe-webapp-core';

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
  const [isLoading, setIsLoading] = createSignal(true);
  const [retryCount, setRetryCount] = createSignal(0);

  const language = createMemo(() => props.language ?? 'tsx');
  const showCopyButton = createMemo(() => props.showCopyButton !== false);

  const highlightCodeAsync = async () => {
    setIsLoading(true);
    try {
      const html = await highlightCode(props.code, language(), 'github-dark');
      setHighlightedHtml(html);

      // Check if we got actual highlighting (contains span with style) or just fallback
      // If fallback and we haven't retried too many times, retry after a short delay
      const hasHighlighting = html.includes('style="') || html.includes('class="line"');
      if (!hasHighlighting && retryCount() < 3) {
        setTimeout(() => {
          setRetryCount((c) => c + 1);
        }, 200);
      }
    } catch (error) {
      console.error('Failed to highlight code:', error);
      // Fallback to plain text
      setHighlightedHtml(`<pre class="shiki"><code>${escapeHtml(props.code)}</code></pre>`);
    } finally {
      setIsLoading(false);
    }
  };

  // Highlight code on mount
  onMount(() => {
    highlightCodeAsync();
  });

  // Re-highlight when code/language changes or on retry
  createEffect(
    on([() => props.code, language, retryCount], () => {
      if (retryCount() > 0) {
        highlightCodeAsync();
      }
    })
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  return (
    <div class={cn('rounded-md overflow-hidden', props.class)}>
      {/* Header with title and copy button */}
      <Show when={props.title || showCopyButton()}>
        <div class="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-[#30363d]">
          <Show when={props.title}>
            <span class="text-[11px] text-[#8b949e] font-mono">
              {props.title}
            </span>
          </Show>
          <Show when={!props.title}>
            <span class="text-[11px] text-[#8b949e] font-mono uppercase">
              {language()}
            </span>
          </Show>
          <Show when={showCopyButton()}>
            <Button
              variant="ghost"
              size="xs"
              onClick={handleCopy}
              class="h-5 px-1.5 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]"
              title={copied() ? 'Copied!' : 'Copy code'}
            >
              <Show when={copied()} fallback={<CopyIcon class="w-3 h-3" />}>
                <CheckIcon class="w-3 h-3 text-[#3fb950]" />
              </Show>
            </Button>
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
            <div class="p-3 space-y-1.5 bg-[#0d1117]">
              <Skeleton class="h-3 w-3/4 bg-[#21262d]" />
              <Skeleton class="h-3 w-1/2 bg-[#21262d]" />
              <Skeleton class="h-3 w-2/3 bg-[#21262d]" />
            </div>
          }
        >
          {/* eslint-disable-next-line solid/no-innerhtml -- Shiki output is trusted */}
          <div class="chat-code-content [&_pre]:m-0 [&_pre]:p-3" innerHTML={highlightedHtml() ?? ''} />
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
