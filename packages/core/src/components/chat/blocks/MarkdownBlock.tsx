import { type Component, createSignal, createEffect, Show, onCleanup } from 'solid-js';
import { cn } from '../../../utils/cn';
import { deferAfterPaint } from '../../../utils/defer';
import { hasMarkdownWorker, renderMarkdown, renderMarkdownSync } from '../hooks/useMarkdown';

export interface MarkdownBlockProps {
  content: string;
  /**
   * When true, render as plain text and skip markdown parsing.
   * Used for "streaming UI-first" so block-delta never blocks input/scroll.
   */
  streaming?: boolean;
  class?: string;
}

const LARGE_MARKDOWN_CHARS = 20_000;

export const MarkdownBlock: Component<MarkdownBlockProps> = (props) => {
  const [html, setHtml] = createSignal<string | null>(null);
  let runId = 0;

  onCleanup(() => {
    runId += 1;
  });

  createEffect(() => {
    const content = props.content ?? '';
    const streaming = props.streaming === true;
    if (!content) {
      setHtml('');
      return;
    }

    // Streaming UI-first: never run markdown parsing while content is being streamed.
    if (streaming) {
      setHtml(null);
      return;
    }

    const currentRun = ++runId;
    setHtml(null);

    const snapshot = content;

    // Small markdown is safe to render on the main thread (still deferred until after a paint).
    if (snapshot.length <= LARGE_MARKDOWN_CHARS) {
      deferAfterPaint(() => {
        if (currentRun !== runId) return;
        try {
          const result = renderMarkdownSync(snapshot);
          if (currentRun !== runId) return;
          setHtml(result);
        } catch (e) {
          console.error('Markdown parse error:', e);
          if (currentRun !== runId) return;
          setHtml(null);
        }
      });
      return;
    }

    // Large markdown: require a worker to avoid blocking the main thread.
    if (!hasMarkdownWorker()) {
      // Keep plain text mode; we do not auto-render large markdown without a worker.
      return;
    }

    deferAfterPaint(() => {
      void renderMarkdown(snapshot)
        .then((result) => {
          if (currentRun !== runId) return;
          setHtml(result);
        })
        .catch((e) => {
          console.error('Markdown render error:', e);
          if (currentRun !== runId) return;
          setHtml(null);
        });
    });
  });

  const shouldShowPlain = () => html() === null;

  return (
    <Show
      when={!shouldShowPlain()}
      fallback={
        <div class={cn('chat-markdown-block chat-text-block', props.class)}>
          {props.content}
        </div>
      }
    >
      <div
        class={cn('chat-markdown-block', props.class)}
        // eslint-disable-next-line solid/no-innerhtml -- Marked output is trusted
        innerHTML={html() ?? ''}
      />
    </Show>
  );
};
