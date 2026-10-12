import type {
  GraphEdge,
  GraphInput,
  GraphLayout,
  GraphLayoutEdge,
  GraphLayoutOptions,
  GraphRoutingOptions,
} from './types';

export interface GraphLayoutEngine {
  layout(input: GraphInput, options?: GraphLayoutOptions): Promise<GraphLayout>;
  /** Route only the supplied edges; geometry and bounds remain authoritative. */
  route(
    geometry: Pick<GraphLayout, 'nodes' | 'bounds'>,
    edges: readonly GraphEdge[],
    options?: GraphRoutingOptions,
    request?: { signal?: AbortSignal }
  ): Promise<readonly GraphLayoutEdge[]>;
  dispose(): void;
}

type Payload =
  | { kind: 'layout'; input: GraphInput; options: GraphLayoutOptions }
  | {
      kind: 'route';
      geometry: Pick<GraphLayout, 'nodes' | 'bounds'>;
      edges: readonly GraphEdge[];
      options: GraphRoutingOptions;
    };

/** One worker per mounted graph. Dispose on unmount; failures are never hidden. */
export function createGraphLayoutEngine(): GraphLayoutEngine {
  const worker = new Worker(new URL('./layout-worker.ts', import.meta.url), { type: 'module' });
  let failure: Error | undefined;
  let sequence = 0;
  const pending = new Map<
    number,
    {
      kind: Payload['kind'];
      resolve: (value: GraphLayout | readonly GraphLayoutEdge[]) => void;
      reject: (error: Error) => void;
      cleanup: () => void;
    }
  >();
  const stop = (error: Error) => {
    failure = error;
    worker.terminate();
    for (const task of pending.values()) {
      task.cleanup();
      task.reject(error);
    }
    pending.clear();
  };
  worker.addEventListener('error', (event) =>
    stop(new Error(event.message || 'Graph layout worker failed'))
  );
  worker.addEventListener('messageerror', () =>
    stop(new Error('Invalid graph layout worker response'))
  );
  worker.addEventListener('message', ({ data }) => {
    if (!data || !Number.isInteger(data.id)) {
      stop(new Error('Invalid graph layout worker response'));
      return;
    }
    const task = pending.get(data.id);
    if (!task) return;
    if (!data.error && (task.kind === 'layout' ? !data.layout : !Array.isArray(data.edges))) {
      stop(new Error('Invalid graph layout worker response'));
      return;
    }
    pending.delete(data.id);
    task.cleanup();
    if (data.error) task.reject(new Error(data.error));
    else task.resolve(task.kind === 'layout' ? data.layout : data.edges);
  });
  const request = <T extends GraphLayout | readonly GraphLayoutEdge[]>(
    payload: Payload,
    signal?: AbortSignal
  ): Promise<T> => {
    if (failure) return Promise.reject(failure);
    if (signal?.aborted)
      return Promise.reject(new DOMException('Graph routing canceled', 'AbortError'));
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const abort = () => {
        if (!pending.delete(id)) return;
        signal?.removeEventListener('abort', abort);
        worker.postMessage({ id, cancel: true });
        reject(new DOMException('Graph routing canceled', 'AbortError'));
      };
      pending.set(id, {
        kind: payload.kind,
        resolve: (value) => resolve(value as T),
        reject,
        cleanup: () => signal?.removeEventListener('abort', abort),
      });
      signal?.addEventListener('abort', abort, { once: true });
      try {
        worker.postMessage({ id, ...payload });
      } catch (error) {
        pending.delete(id);
        signal?.removeEventListener('abort', abort);
        reject(error);
      }
    });
  };
  return {
    layout: (input, options = {}) => request<GraphLayout>({ kind: 'layout', input, options }),
    route: (geometry, edges, options = {}, control) =>
      request<readonly GraphLayoutEdge[]>(
        { kind: 'route', geometry, edges, options },
        control?.signal
      ),
    dispose: () => stop(new Error('Graph layout engine disposed')),
  };
}
