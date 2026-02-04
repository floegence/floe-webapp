import type { CodeDiffRenderModel, DiffWorkerResponse } from '../types';
import { computeCodeDiffModel } from '../diff/diffModel';

let diffWorker: Worker | null = null;
let workerReady = false;
let workerReadyPromise: Promise<void> | null = null;

const pendingRequests = new Map<string, {
  resolve: (model: CodeDiffRenderModel) => void;
  reject: (error: Error) => void;
}>();

// Cache (diff models can be large; keep it small).
const cache = new Map<string, CodeDiffRenderModel>();
const MAX_CACHE_SIZE = 50;

export function createDiffWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('../workers/diff.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
}

export function configureDiffWorker(worker: Worker): Promise<void> {
  diffWorker = worker;
  workerReady = false;

  workerReadyPromise = new Promise<void>((resolve) => {
    diffWorker!.onmessage = (e: MessageEvent<DiffWorkerResponse | { type: 'ready' }>) => {
      if ('type' in e.data && e.data.type === 'ready') {
        workerReady = true;
        resolve();
        return;
      }

      const { id, model, error } = e.data as DiffWorkerResponse;
      const pending = pendingRequests.get(id);
      if (!pending) return;
      pendingRequests.delete(id);

      if (error) pending.reject(new Error(error));
      else pending.resolve(model);
    };

    diffWorker!.onerror = (error) => {
      console.error('Diff worker error:', error);
    };
  });

  return workerReadyPromise;
}

export function hasDiffWorker(): boolean {
  return !!diffWorker;
}

export async function waitForDiffWorker(): Promise<boolean> {
  if (!diffWorker) return false;
  if (workerReady) return true;
  if (workerReadyPromise) {
    await workerReadyPromise;
    return true;
  }
  return false;
}

export function computeCodeDiffSync(oldCode: string, newCode: string): CodeDiffRenderModel {
  const key = cacheKey(oldCode, newCode);
  const cached = cache.get(key);
  if (cached) return cached;

  const model = computeCodeDiffModel(oldCode, newCode);
  cacheSet(key, model);
  return model;
}

export async function computeCodeDiff(oldCode: string, newCode: string): Promise<CodeDiffRenderModel> {
  const key = cacheKey(oldCode, newCode);
  const cached = cache.get(key);
  if (cached) return cached;

  const hasWorker = await waitForDiffWorker();
  if (!hasWorker || !diffWorker) {
    // Fallback: sync diff on main thread (caller should gate for small inputs only).
    const model = computeCodeDiffModel(oldCode, newCode);
    cacheSet(key, model);
    return model;
  }

  return new Promise<CodeDiffRenderModel>((resolve, reject) => {
    const id = crypto.randomUUID();
    pendingRequests.set(id, {
      resolve: (model) => {
        cacheSet(key, model);
        resolve(model);
      },
      reject,
    });
    diffWorker!.postMessage({ id, oldCode, newCode });
  });
}

export function terminateDiffWorker(): void {
  if (diffWorker) {
    diffWorker.terminate();
    diffWorker = null;
  }
  workerReady = false;
  workerReadyPromise = null;
  pendingRequests.clear();
  cache.clear();
}

function cacheKey(oldCode: string, newCode: string): string {
  return `${oldCode.length}:${newCode.length}:${hashString(oldCode)}:${hashString(newCode)}`;
}

function cacheSet(key: string, value: CodeDiffRenderModel) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, value);
}

function hashString(input: string): string {
  // Cheap non-cryptographic hash for cache keys (avoid duplicating large strings).
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Keep unsigned and compact.
  return (h >>> 0).toString(36);
}
