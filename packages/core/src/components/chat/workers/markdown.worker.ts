import type { MarkdownWorkerRequest, MarkdownWorkerResponse } from '../types';
import { renderMarkdownToHtml } from '../markdown/markdown';

// Signal readiness so the host/configurer can await worker init.
postMessage({ type: 'ready' });

addEventListener('message', (e: MessageEvent<MarkdownWorkerRequest>) => {
  const { id, content } = e.data;
  try {
    const html = renderMarkdownToHtml(content);
    const msg: MarkdownWorkerResponse = { id, html };
    postMessage(msg);
  } catch (err) {
    const msg: MarkdownWorkerResponse = {
      id,
      html: '',
      error: err instanceof Error ? err.message : 'Failed to render markdown',
    };
    postMessage(msg);
  }
});

