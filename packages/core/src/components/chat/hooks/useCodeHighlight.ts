import { createSignal } from 'solid-js';
import type { ShikiWorkerResponse } from '../types';

// Worker 实例（可选，由外部配置）
let shikiWorker: Worker | null = null;
let workerReady = false;
let workerReadyPromise: Promise<void> | null = null;

const pendingRequests = new Map<string, {
  resolve: (html: string) => void;
  reject: (error: Error) => void;
}>();

// 缓存
const highlightCache = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

// 同步高亮器（降级方案）
let syncHighlighter: {
  codeToHtml: (code: string, options: { lang: string; theme: string }) => string;
} | null = null;

/**
 * 配置 Shiki Worker
 * 在应用初始化时调用此函数来启用 Worker 模式
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
 * 配置同步高亮器（降级方案）
 * 如果不使用 Worker，可以在应用中直接创建 highlighter 并配置
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

// 转义 HTML（降级时使用）
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
  // 检查缓存
  const cacheKey = `${theme}:${language}:${code}`;
  const cached = highlightCache.get(cacheKey);
  if (cached) return cached;

  // 尝试使用 Worker
  const hasWorker = await waitForWorker();

  if (hasWorker && shikiWorker) {
    return new Promise<string>((resolve, reject) => {
      const id = crypto.randomUUID();

      pendingRequests.set(id, {
        resolve: (html) => {
          // 添加到缓存
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

  // 尝试使用同步高亮器
  if (syncHighlighter) {
    try {
      const html = syncHighlighter.codeToHtml(code, { lang: language, theme });
      highlightCache.set(cacheKey, html);
      return html;
    } catch {
      // 降级到纯文本
    }
  }

  // 最终降级：返回纯文本
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

// 清理函数
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
