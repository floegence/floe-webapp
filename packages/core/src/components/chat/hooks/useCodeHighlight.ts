import { createSignal } from 'solid-js';
import type { ShikiWorkerResponse } from '../types';

// Worker instance (optional, configured by the host).
let shikiWorker: Worker | null = null;
let workerReady = false;
let workerReadyPromise: Promise<void> | null = null;

const pendingRequests = new Map<string, {
  resolve: (html: string) => void;
  reject: (error: Error) => void;
}>();

// Cache
const highlightCache = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

// Synchronous highlighter (fallback).
let syncHighlighter: {
  codeToHtml: (code: string, options: { lang: string; theme: string }) => string;
} | null = null;

/**
 * Configure the Shiki worker.
 * Call this during app initialization to enable worker mode.
 */
export function configureShikiWorker(worker: Worker): Promise<void> {
  shikiWorker = worker;

  workerReadyPromise = new Promise<void>((resolve) => {
    shikiWorker!.onmessage = (e: MessageEvent<ShikiWorkerResponse | { type: 'ready' }>) => {
      if ('type' in e.data && e.data.type === 'ready') {
        workerReady = true;
        resolve();
        return;
      }

      const { id, html, error } = e.data as ShikiWorkerResponse;
      const pending = pendingRequests.get(id);
      if (pending) {
        pendingRequests.delete(id);
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(html);
        }
      }
    };

    shikiWorker!.onerror = (error) => {
      console.error('Shiki worker error:', error);
    };
  });

  return workerReadyPromise;
}

/**
 * Configure a synchronous highlighter (fallback).
 * If you don't use a worker, create/configure a highlighter in the app and pass it here.
 */
export function configureSyncHighlighter(highlighter: {
  codeToHtml: (code: string, options: { lang: string; theme: string }) => string;
}): void {
  syncHighlighter = highlighter;
}

async function waitForWorker(): Promise<boolean> {
  if (!shikiWorker) return false;
  if (workerReady) return true;
  if (workerReadyPromise) {
    await workerReadyPromise;
    return true;
  }
  return false;
}

// Escape HTML (used in the fallback path).
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function highlightCode(
  code: string,
  language: string,
  theme: string = 'github-dark'
): Promise<string> {
  // Check cache
  const cacheKey = `${theme}:${language}:${code}`;
  const cached = highlightCache.get(cacheKey);
  if (cached) return cached;

  // Try worker
  const hasWorker = await waitForWorker();

  if (hasWorker && shikiWorker) {
    return new Promise<string>((resolve, reject) => {
      const id = crypto.randomUUID();

      pendingRequests.set(id, {
        resolve: (html) => {
          // Add to cache
          if (highlightCache.size >= MAX_CACHE_SIZE) {
            const firstKey = highlightCache.keys().next().value;
            if (firstKey) highlightCache.delete(firstKey);
          }
          highlightCache.set(cacheKey, html);
          resolve(html);
        },
        reject
      });

      shikiWorker!.postMessage({ id, code, language, theme });
    });
  }

  // Try sync highlighter
  if (syncHighlighter) {
    try {
      const html = syncHighlighter.codeToHtml(code, { lang: language, theme });
      highlightCache.set(cacheKey, html);
      return html;
    } catch {
      // Fall back to plain text
    }
  }

  // Final fallback: return plain text
  const fallbackHtml = `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  return fallbackHtml;
}

export function useCodeHighlight() {
  const [isLoading, setIsLoading] = createSignal(false);

  const highlight = async (
    code: string,
    language: string,
    theme?: string
  ): Promise<string> => {
    setIsLoading(true);
    try {
      return await highlightCode(code, language, theme);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    highlight,
    isLoading,
  };
}

// Cleanup
export function terminateShikiWorker(): void {
  if (shikiWorker) {
    shikiWorker.terminate();
    shikiWorker = null;
    workerReady = false;
    workerReadyPromise = null;
    pendingRequests.clear();
  }
  highlightCache.clear();
}
