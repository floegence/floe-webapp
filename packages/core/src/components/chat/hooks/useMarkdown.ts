import type { MarkdownWorkerResponse } from '../types';
import { renderMarkdownToHtml } from '../markdown/markdown';

let markdownWorker: Worker | null = null;
let workerReady = false;
let workerReadyPromise: Promise<void> | null = null;

const pendingRequests = new Map<string, {
  resolve: (html: string) => void;
  reject: (error: Error) => void;
}>();

// Lightweight cache to avoid re-rendering identical markdown repeatedly.
const cache = new Map<string, string>();
const MAX_CACHE_SIZE = 200;

export function createMarkdownWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('../workers/markdown.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
}

export function configureMarkdownWorker(worker: Worker): Promise<void> {
  markdownWorker = worker;
  workerReady = false;

  workerReadyPromise = new Promise<void>((resolve) => {
    markdownWorker!.onmessage = (e: MessageEvent<MarkdownWorkerResponse | { type: 'ready' }>) => {
      if ('type' in e.data && e.data.type === 'ready') {
        workerReady = true;
        resolve();
        return;
      }

      const { id, html, error } = e.data as MarkdownWorkerResponse;
      const pending = pendingRequests.get(id);
      if (!pending) return;
      pendingRequests.delete(id);

      if (error) pending.reject(new Error(error));
      else pending.resolve(html);
    };

    markdownWorker!.onerror = (error) => {
      console.error('Markdown worker error:', error);
    };
  });

  return workerReadyPromise;
}

export function hasMarkdownWorker(): boolean {
  return !!markdownWorker;
}

export async function waitForMarkdownWorker(): Promise<boolean> {
  if (!markdownWorker) return false;
  if (workerReady) return true;
  if (workerReadyPromise) {
    await workerReadyPromise;
    return true;
  }
  return false;
}

export function renderMarkdownSync(content: string): string {
  const cached = cache.get(content);
  if (cached) return cached;

  const html = renderMarkdownToHtml(content);
  cacheSet(content, html);
  return html;
}

export async function renderMarkdown(content: string): Promise<string> {
  const cached = cache.get(content);
  if (cached) return cached;

  const hasWorker = await waitForMarkdownWorker();
  if (!hasWorker || !markdownWorker) {
    // Fallback: sync rendering on main thread (caller should gate for small content only).
    const html = renderMarkdownToHtml(content);
    cacheSet(content, html);
    return html;
  }

  return new Promise<string>((resolve, reject) => {
    const id = crypto.randomUUID();
    pendingRequests.set(id, {
      resolve: (html) => {
        cacheSet(content, html);
        resolve(html);
      },
      reject,
    });
    markdownWorker!.postMessage({ id, content });
  });
}

export function terminateMarkdownWorker(): void {
  if (markdownWorker) {
    markdownWorker.terminate();
    markdownWorker = null;
  }
  workerReady = false;
  workerReadyPromise = null;
  pendingRequests.clear();
  cache.clear();
}

function cacheSet(key: string, value: string) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, value);
}

