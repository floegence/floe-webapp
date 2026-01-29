import { type Component, createSignal, createEffect, Show } from 'solid-js';
import { cn } from '../../../utils/cn';
import { highlightCode } from '../hooks/useCodeHighlight';

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

  // 高亮代码
  createEffect(() => {
    const code = props.content;
    const lang = props.language || 'text';

    if (!code) {
      setHighlightedHtml('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    highlightCode(code, lang)
      .then((html) => {
        setHighlightedHtml(html);
        setIsLoading(false);
      })
      .catch(() => {
        // 降级为纯文本
        setHighlightedHtml(null);
        setIsLoading(false);
      });
  });

  // 复制代码
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
      {/* 头部 */}
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

      {/* 代码内容 */}
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

// 图标组件
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
