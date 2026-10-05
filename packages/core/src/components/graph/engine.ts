import ELK from 'elkjs/lib/elk-api.js';
import { computeGraphLayout } from './layout';
import type { GraphInput, GraphLayout, GraphLayoutOptions } from './types';

export interface GraphLayoutEngine {
  layout(input: GraphInput, options?: GraphLayoutOptions): Promise<GraphLayout>;
  dispose(): void;
}

/** One worker per mounted graph. Dispose on unmount; failures are never hidden. */
export function createGraphLayoutEngine(): GraphLayoutEngine {
  const worker = new Worker(new URL('./elk-worker.js', import.meta.url), { type: 'module' });
  const engine = new ELK({ workerFactory: () => worker });
  let failure: Error | undefined;
  const pending = new Set<{ reject: (error: Error) => void }>();
  const stop = (error: Error) => {
    failure = error;
    worker.terminate();
    for (const task of pending) task.reject(error);
    pending.clear();
  };
  worker.addEventListener('error', (event) =>
    stop(new Error(event.message || 'Graph layout worker failed'))
  );
  worker.addEventListener('messageerror', () =>
    stop(new Error('Invalid graph layout worker response'))
  );
  return {
    layout(input, options) {
      if (failure) return Promise.reject(failure);
      return new Promise((resolve, reject) => {
        const task = { reject };
        pending.add(task);
        computeGraphLayout(input, options ?? {}, engine)
          .then(resolve, reject)
          .finally(() => pending.delete(task));
      });
    },
    dispose() {
      stop(new Error('Graph layout engine disposed'));
    },
  };
}
