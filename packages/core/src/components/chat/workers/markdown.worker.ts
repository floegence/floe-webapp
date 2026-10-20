import type { MarkdownWorkerRequest, MarkdownWorkerResponse } from '../types';
import { renderMarkdownToHtml } from '../markdown/markdown';
import type { MarkedOptions } from 'marked';
import { createMarkdownParser } from '../markdown/parser';
import { createMarkdownSessionHandler, type MarkdownSessionRequest } from '../markdown/workerSession';

const sessions = createMarkdownSessionHandler((config: MarkedOptions) => createMarkdownParser(config));

// Signal readiness so the host/configurer can await worker init.
postMessage({ type: 'ready' });

addEventListener('message', (e: MessageEvent<MarkdownWorkerRequest | MarkdownSessionRequest<MarkedOptions>>) => {
  if (!e.data || typeof e.data !== 'object') return;
  if ('type' in e.data && e.data.type === 'markdown-session') {
    postMessage(sessions.handle(e.data));
    return;
  }
  const { id, content } = e.data as MarkdownWorkerRequest;
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

