import { type Component, createSignal, createEffect } from 'solid-js';
import { marked } from 'marked';
import { cn } from '../../../utils/cn';

export interface MarkdownBlockProps {
  content: string;
  class?: string;
}

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

// 自定义渲染器
const renderer = new marked.Renderer();

// 代码块特殊处理 - 返回占位符，由外层处理
renderer.code = function (this: unknown, token: { text: string; lang?: string }) {
  const language = token.lang || 'text';
  const escaped = token.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<pre class="chat-md-code-block" data-language="${language}"><code>${escaped}</code></pre>`;
};

// 行内代码
renderer.codespan = function (this: unknown, token: { text: string }) {
  return `<code class="chat-md-inline-code">${token.text}</code>`;
};

// 链接 - 新窗口打开
renderer.link = function (this: unknown, token: { href: string; title?: string | null; text: string }) {
  const titleAttr = token.title ? ` title="${token.title}"` : '';
  return `<a href="${token.href}"${titleAttr} target="_blank" rel="noopener noreferrer" class="chat-md-link">${token.text}</a>`;
};

// 图片
renderer.image = function (this: unknown, token: { href: string; title?: string | null; text: string }) {
  const titleAttr = token.title ? ` title="${token.title}"` : '';
  return `<img src="${token.href}" alt="${token.text}"${titleAttr} class="chat-md-image" loading="lazy" />`;
};

// 块引用
renderer.blockquote = function (this: unknown, token: { text: string }) {
  return `<blockquote class="chat-md-blockquote">${token.text}</blockquote>`;
};

marked.use({ renderer });

export const MarkdownBlock: Component<MarkdownBlockProps> = (props) => {
  const [html, setHtml] = createSignal('');

  createEffect(() => {
    const content = props.content;
    if (!content) {
      setHtml('');
      return;
    }

    try {
      const result = marked.parse(content, { async: false }) as string;
      setHtml(result);
    } catch (error) {
      console.error('Markdown parse error:', error);
      setHtml(`<pre>${props.content}</pre>`);
    }
  });

  return (
    <div
      class={cn('chat-markdown-block', props.class)}
      // eslint-disable-next-line solid/no-innerhtml -- Marked output is trusted
      innerHTML={html()}
    />
  );
};
