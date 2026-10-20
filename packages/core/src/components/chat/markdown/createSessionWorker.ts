/** Default GFM worker. Product extensions belong in a host worker using createMarkdownSessionHandler. */
export function createMarkdownSessionWorker(): Worker {
  return new Worker(new URL('../workers/markdown.worker.ts', import.meta.url), { type: 'module' });
}
