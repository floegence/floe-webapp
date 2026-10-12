import ELK from 'elkjs/lib/elk-api.js';
import { computeGraphLayout, computeGraphRoutes } from './layout';
import type {
  GraphEdge,
  GraphInput,
  GraphLayout,
  GraphLayoutOptions,
  GraphRoutingOptions,
} from './types';

// Keep ELK's public worker protocol intact. Packing and libavoid run here;
// ELK runs in its packaged child worker. Neither blocks the renderer.
const engine = new ELK({
  workerFactory: () => {
    const worker = new Worker(new URL('./elk-worker.js', import.meta.url), { type: 'module' });
    worker.addEventListener('error', (event) => {
      throw new Error(event.message || 'Graph ELK worker failed');
    });
    worker.addEventListener('messageerror', () => {
      throw new Error('Invalid graph ELK worker response');
    });
    return worker;
  },
});
type Request = { id: number } & (
  | { cancel: true }
  | { kind: 'layout'; input: GraphInput; options: GraphLayoutOptions }
  | {
      kind: 'route';
      geometry: Pick<GraphLayout, 'nodes' | 'bounds'>;
      edges: readonly GraphEdge[];
      options: GraphRoutingOptions;
    }
);
let queue = Promise.resolve();
const jobs = new Map<number, { canceled: boolean }>();
self.onmessage = ({ data }: MessageEvent<Request>) => {
  if ('cancel' in data) {
    const job = jobs.get(data.id);
    if (job) job.canceled = true;
    return;
  }
  const job = { canceled: false };
  jobs.set(data.id, job);
  queue = queue.then(async () => {
    try {
      if (job.canceled) return;
      // Let cancellation messages settle before starting the next transaction.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (job.canceled) return;
      const result =
        data.kind === 'route'
          ? { edges: await computeGraphRoutes(data.geometry, data.edges, data.options) }
          : { layout: await computeGraphLayout(data.input, data.options, engine) };
      // A running synchronous libavoid transaction cannot be interrupted; a
      // canceled request must neither start while queued nor publish a result.
      if (!job.canceled) self.postMessage({ id: data.id, ...result });
    } catch (error) {
      if (!job.canceled)
        self.postMessage({
          id: data.id,
          error: error instanceof Error ? error.message : String(error),
        });
    } finally {
      jobs.delete(data.id);
    }
  });
};
