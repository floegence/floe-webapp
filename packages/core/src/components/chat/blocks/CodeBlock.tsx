import { type Component, createSignal, createEffect, Show } from 'solid-js';
import { cn } from '../../../utils/cn';
import { highlightCode } from '../hooks/useCodeHighlight';
import { deferNonBlocking } from '../../../utils/defer';

export interface CodeBlockProps {
  language: string;
  content: string;
  filename?: string;
  class?: string;
}

export const CodeBlock: Component<CodeBlockProps> = (props) => {
  const [highlightedHtml, setHighlightedHtml] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [copied, setCopied] = createSignal(false);
  let runId = 0;

  // Highlight code
  createEffect(() => {
    const currentRun = ++runId;
    const code = props.content;
    const lang = props.language || 'text';

    if (!code) {
      setHighlightedHtml('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // UI-first: render/paint first, then run highlighting outside the current sync stack.
    deferNonBlocking(() => {
      highlightCode(code, lang)
        .then((html) => {
          if (currentRun !== runId) return;
          setHighlightedHtml(html);
          setIsLoading(false);
        })
        .catch(() => {
          if (currentRun !== runId) return;
          // Fallback to plain text
          setHighlightedHtml(null);
          setIsLoading(false);
        });
    });
  });

  // Copy code
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div class={cn('chat-code-block', props.class)}>
      {/* Header */}
      <div class="chat-code-header">
        <div class="chat-code-info">
          <Show when={props.filename}>
            <span class="chat-code-filename">{props.filename}</span>
          </Show>
          <Show when={!props.filename && props.language}>
            <span class="chat-code-language">{props.language}</span>
          </Show>
        </div>
        <button
          type="button"
          class="chat-code-copy-btn"
          onClick={handleCopy}
          title={copied() ? 'Copied!' : 'Copy code'}
        >
          <Show when={copied()} fallback={<CopyIcon />}>
            <CheckIcon />
          </Show>
        </button>
      </div>

      {/* Code content */}
      <div class="chat-code-content">
        <Show
          when={!isLoading() && highlightedHtml()}
          fallback={
            <pre class="chat-code-pre">
              <code>{props.content}</code>
            </pre>
          }
        >
          {/* eslint-disable-next-line solid/no-innerhtml -- Shiki output is trusted */}
          <div innerHTML={highlightedHtml()!} />
        </Show>
      </div>
    </div>
  );
};

// Icon components
const CopyIcon: Component = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon: Component = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
