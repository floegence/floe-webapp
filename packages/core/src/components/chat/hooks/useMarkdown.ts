import { secureRandomUUID } from '../../../utils/secureRandom';
import type { MarkdownWorkerResponse } from '../types';
import { renderMarkdownToHtml } from '../markdown/markdown';
import { createMarkdownSessionWorker } from '../markdown/createSessionWorker';

const WORKER_DEADLINE_MS = 15_000;
const MAX_CACHE_SIZE = 200;
const MAX_CACHE_BYTES = 16 * 1024 * 1024;
let markdownWorker: Worker | null = null;
let workerReady = false;
let workerReadyPromise: Promise<void> | null = null;
let rejectReady: ((error: Error) => void) | undefined;
let initializationTimer: ReturnType<typeof setTimeout> | undefined;
let cacheBytes = 0;
const pendingRequests = new Map<string, {
  resolve: (html: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}>();
const cache = new Map<string, string>();

export function createMarkdownWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  try { return createMarkdownSessionWorker(); } catch { return null; }
}

function stopWorker(error: Error): void {
  const worker = markdownWorker;
  markdownWorker = null;
  workerReady = false;
  if (initializationTimer !== undefined) clearTimeout(initializationTimer);
  initializationTimer = undefined;
  rejectReady?.(error);
  rejectReady = undefined;
  workerReadyPromise = null;
  if (worker) {
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    worker.terminate();
  }
  for (const request of pendingRequests.values()) {
    clearTimeout(request.timer);
    request.reject(error);
  }
  pendingRequests.clear();
}

export function configureMarkdownWorker(worker: Worker): Promise<void> {
  stopWorker(new Error('Markdown worker replaced'));
  markdownWorker = worker;
  workerReadyPromise = new Promise<void>((resolve, reject) => {
    rejectReady = reject;
    initializationTimer = setTimeout(() => stopWorker(new Error('Markdown worker initialization timed out')), WORKER_DEADLINE_MS);
    worker.onmessage = (event: MessageEvent<MarkdownWorkerResponse | { type: 'ready' }>) => {
      if (markdownWorker !== worker) return;
      if (!event.data || typeof event.data !== 'object') {
        stopWorker(new Error('Invalid Markdown worker response'));
        return;
      }
      if ('type' in event.data && event.data.type === 'ready') {
        if (initializationTimer !== undefined) clearTimeout(initializationTimer);
        initializationTimer = undefined;
        rejectReady = undefined;
        workerReady = true;
        resolve();
        return;
      }
      const { id, html, error } = event.data as MarkdownWorkerResponse;
      const pending = pendingRequests.get(id);
      if (!pending) return;
      pendingRequests.delete(id);
      clearTimeout(pending.timer);
      if (error) pending.reject(new Error(error));
      else if (typeof html !== 'string') pending.reject(new Error('Markdown worker omitted its result'));
      else pending.resolve(html);
    };
    worker.onerror = worker.onmessageerror = () => {
      if (markdownWorker === worker) stopWorker(new Error('Markdown worker failed'));
    };
  });
  // Initializers may intentionally let components observe the failure later.
  void workerReadyPromise.catch(() => {});
  return workerReadyPromise;
}

export function hasMarkdownWorker(): boolean { return !!markdownWorker; }

export async function waitForMarkdownWorker(): Promise<boolean> {
  if (!markdownWorker) return false;
  if (workerReady) return true;
  await workerReadyPromise;
  return !!markdownWorker && workerReady;
}

export function renderMarkdownSync(content: string): string {
  const cached = cache.get(content);
  if (cached !== undefined) return cached;
  const html = renderMarkdownToHtml(content);
  cacheSet(content, html);
  return html;
}

export async function renderMarkdown(content: string): Promise<string> {
  const cached = cache.get(content);
  if (cached !== undefined) return cached;
  const worker = markdownWorker;
  if (!worker) return renderMarkdownSync(content);
  await waitForMarkdownWorker();
  if (markdownWorker !== worker || !workerReady) throw new Error('Markdown worker changed during initialization');
  return new Promise<string>((resolve, reject) => {
    const id = secureRandomUUID();
    const timer = setTimeout(() => stopWorker(new Error('Markdown worker request timed out')), WORKER_DEADLINE_MS);
    pendingRequests.set(id, {
      resolve: (html) => { cacheSet(content, html); resolve(html); },
      reject, timer,
    });
    try { worker.postMessage({ id, content }); } catch { stopWorker(new Error('Markdown worker request could not be sent')); }
  });
}

export function terminateMarkdownWorker(): void {
  stopWorker(new Error('Markdown worker closed'));
  cache.clear();
  cacheBytes = 0;
}

function cacheSet(key: string, value: string) {
  const bytes = (key.length + value.length) * 2;
  if (bytes > MAX_CACHE_BYTES) return;
  const existing = cache.get(key);
  if (existing !== undefined) {
    cacheBytes -= (key.length + existing.length) * 2;
    cache.delete(key);
  }
  while (cache.size >= MAX_CACHE_SIZE || cacheBytes + bytes > MAX_CACHE_BYTES) {
    const first = cache.entries().next().value;
    if (!first) break;
    cacheBytes -= (first[0].length + first[1].length) * 2;
    cache.delete(first[0]);
  }
  cache.set(key, value);
  cacheBytes += bytes;
}
