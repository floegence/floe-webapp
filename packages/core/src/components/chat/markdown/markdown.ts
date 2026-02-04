import { marked } from 'marked';

// Keep the markdown configuration centralized so both main-thread and Worker rendering
// produce identical HTML.
marked.setOptions({
  gfm: true,
  breaks: true,
});

const renderer = new marked.Renderer();

// Code blocks: emit a placeholder pre/code; outer CSS handles styling.
renderer.code = function (this: unknown, token: { text: string; lang?: string }) {
  const language = token.lang || 'text';
  const escaped = token.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<pre class="chat-md-code-block" data-language="${language}"><code>${escaped}</code></pre>`;
};

// Inline code
renderer.codespan = function (this: unknown, token: { text: string }) {
  return `<code class="chat-md-inline-code">${token.text}</code>`;
};

// Links: open in a new tab
renderer.link = function (this: unknown, token: { href: string; title?: string | null; text: string }) {
  const titleAttr = token.title ? ` title="${token.title}"` : '';
  return `<a href="${token.href}"${titleAttr} target="_blank" rel="noopener noreferrer" class="chat-md-link">${token.text}</a>`;
};

// Images
renderer.image = function (this: unknown, token: { href: string; title?: string | null; text: string }) {
  const titleAttr = token.title ? ` title="${token.title}"` : '';
  return `<img src="${token.href}" alt="${token.text}"${titleAttr} class="chat-md-image" loading="lazy" />`;
};

// Blockquote
renderer.blockquote = function (this: unknown, token: { text: string }) {
  return `<blockquote class="chat-md-blockquote">${token.text}</blockquote>`;
};

marked.use({ renderer });

export function renderMarkdownToHtml(content: string): string {
  // Marked can return string | Promise<string> depending on options; we force sync.
  return marked.parse(content, { async: false }) as string;
}

