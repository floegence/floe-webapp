import type { GraphInput, GraphLayout, GraphLayoutOptions } from './types';

export interface GraphLayoutEngine {
  layout(input: GraphInput, options?: GraphLayoutOptions): Promise<GraphLayout>;
  dispose(): void;
}

/** One worker per mounted graph. Dispose on unmount; failures are never hidden. */
export function createGraphLayoutEngine(): GraphLayoutEngine {
  const worker = new Worker(new URL('./layout-worker.ts', import.meta.url), { type: 'module' });
  let failure: Error | undefined;
  let sequence = 0;
  const pending = new Map<
    number,
    { resolve: (layout: GraphLayout) => void; reject: (error: Error) => void }
  >();
  const stop = (error: Error) => {
    failure = error;
    worker.terminate();
    for (const task of pending.values()) task.reject(error);
    pending.clear();
  };
  worker.addEventListener('error', (event) =>
    stop(new Error(event.message || 'Graph layout worker failed'))
  );
  worker.addEventListener('messageerror', () =>
    stop(new Error('Invalid graph layout worker response'))
  );
  worker.addEventListener('message', ({ data }) => {
    if (!data || !Number.isInteger(data.id) || (!data.error && !data.layout)) {
      stop(new Error('Invalid graph layout worker response'));
      return;
    }
    const task = pending.get(data.id);
    if (!task) return;
    pending.delete(data.id);
    if (data.error) task.reject(new Error(data.error));
    else task.resolve(data.layout);
  });
  return {
    layout(input, options) {
      if (failure) return Promise.reject(failure);
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        try {
          worker.postMessage({ id, input, options: options ?? {} });
        } catch (error) {
          pending.delete(id);
          reject(error);
        }
      });
    },
    dispose() {
      stop(new Error('Graph layout engine disposed'));
    },
  };
}
