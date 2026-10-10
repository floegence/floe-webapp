import ELK from 'elkjs/lib/elk-api.js';
import { computeGraphLayout } from './layout';
import type { GraphInput, GraphLayoutOptions } from './types';

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
let queue = Promise.resolve();
self.onmessage = ({
  data,
}: MessageEvent<{ id: number; input: GraphInput; options: GraphLayoutOptions }>) => {
  queue = queue.then(async () => {
    try {
      const layout = await computeGraphLayout(data.input, data.options, engine);
      self.postMessage({ id: data.id, layout });
    } catch (error) {
      self.postMessage({
        id: data.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
};
