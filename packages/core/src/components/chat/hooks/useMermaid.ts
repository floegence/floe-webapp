import { createSignal } from 'solid-js';
import type { MermaidWorkerResponse } from '../types';

// Worker 实例（可选，由外部配置）
let mermaidWorker: Worker | null = null;
let workerReady = false;
let workerReadyPromise: Promise<void> | null = null;

const pendingRequests = new Map<string, {
  resolve: (svg: string) => void;
  reject: (error: Error) => void;
}>();

// 缓存
const mermaidCache = new Map<string, string>();
const MAX_CACHE_SIZE = 200;

// 同步渲染器（降级方案）
let syncMermaid: {
  render: (id: string, content: string) => Promise<{ svg: string }>;
} | null = null;

let renderCounter = 0;

/**
 * 配置 Mermaid Worker
 * 在应用初始化时调用此函数来启用 Worker 模式
 */
export function configureMermaidWorker(worker: Worker): Promise<void> {
  mermaidWorker = worker;

  workerReadyPromise = new Promise<void>((resolve) => {
    mermaidWorker!.onmessage = (e: MessageEvent<MermaidWorkerResponse | { type: 'ready' }>) => {
      if ('type' in e.data && e.data.type === 'ready') {
        workerReady = true;
        resolve();
        return;
      }

      const { id, svg, error } = e.data as MermaidWorkerResponse;
      const pending = pendingRequests.get(id);
      if (pending) {
        pendingRequests.delete(id);
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(svg);
        }
      }
    };

    mermaidWorker!.onerror = (error) => {
      console.error('Mermaid worker error:', error);
    };
  });

  return workerReadyPromise;
}

/**
 * 配置同步 Mermaid 渲染器（降级方案）
 * 如果不使用 Worker，可以直接传入 mermaid 实例
 */
export function configureSyncMermaid(mermaid: {
  render: (id: string, content: string) => Promise<{ svg: string }>;
}): void {
  syncMermaid = mermaid;
}

async function waitForWorker(): Promise<boolean> {
  if (!mermaidWorker) return false;
  if (workerReady) return true;
  if (workerReadyPromise) {
    await workerReadyPromise;
    return true;
  }
  return false;
}

export async function renderMermaid(
  content: string,
  theme: string = 'default'
): Promise<string> {
  // 检查缓存
  const cacheKey = `${theme}:${content}`;
  const cached = mermaidCache.get(cacheKey);
  if (cached) return cached;

  // 尝试使用 Worker
  const hasWorker = await waitForWorker();

  if (hasWorker && mermaidWorker) {
    return new Promise<string>((resolve, reject) => {
      const id = crypto.randomUUID();

      pendingRequests.set(id, {
        resolve: (svg) => {
          if (mermaidCache.size >= MAX_CACHE_SIZE) {
            const firstKey = mermaidCache.keys().next().value;
            if (firstKey) mermaidCache.delete(firstKey);
          }
          mermaidCache.set(cacheKey, svg);
          resolve(svg);
        },
        reject
      });

      mermaidWorker!.postMessage({ id, content, theme });
    });
  }

  // 尝试使用同步渲染器
  if (syncMermaid) {
    try {
      const graphId = `mermaid-sync-${renderCounter++}`;
      const { svg } = await syncMermaid.render(graphId, content);
      mermaidCache.set(cacheKey, svg);
      return svg;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to render diagram';
      throw new Error(errorMessage);
    }
  }

  // 无可用渲染器
  throw new Error('Mermaid renderer not configured. Call configureMermaidWorker() or configureSyncMermaid() first.');
}

export function useMermaid() {
  const [isLoading, setIsLoading] = createSignal(false);

  const render = async (content: string, theme?: string): Promise<string> => {
    setIsLoading(true);
    try {
      return await renderMermaid(content, theme);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    render,
    isLoading,
  };
}

export function terminateMermaidWorker(): void {
  if (mermaidWorker) {
    mermaidWorker.terminate();
    mermaidWorker = null;
    workerReady = false;
    workerReadyPromise = null;
    pendingRequests.clear();
  }
  mermaidCache.clear();
}
