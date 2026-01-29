import { createSignal } from 'solid-js';
import type { MermaidWorkerResponse } from '../types';

// Worker instance (optional, configured by the host).
let mermaidWorker: Worker | null = null;
let workerReady = false;
let workerReadyPromise: Promise<void> | null = null;

const pendingRequests = new Map<string, {
  resolve: (svg: string) => void;
  reject: (error: Error) => void;
}>();

// Cache
const mermaidCache = new Map<string, string>();
const MAX_CACHE_SIZE = 200;

// Synchronous renderer (fallback).
let syncMermaid: {
  render: (id: string, content: string) => Promise<{ svg: string }>;
} | null = null;

let renderCounter = 0;

/**
 * Configure the Mermaid worker.
 * Call this during app initialization to enable worker mode.
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
 * Configure a synchronous Mermaid renderer (fallback).
 * If you don't use a worker, pass a Mermaid instance directly.
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
  // Check cache
  const cacheKey = `${theme}:${content}`;
  const cached = mermaidCache.get(cacheKey);
  if (cached) return cached;

  // Try worker
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

  // Try sync renderer
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

  // No renderer available
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
