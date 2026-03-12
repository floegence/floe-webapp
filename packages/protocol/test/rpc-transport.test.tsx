import { createComponent, createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { ProtocolProvider } from '../src/client';
import type { ProtocolContract } from '../src/contract';
import { ProtocolNotConnectedError, useRpc } from '../src/rpc';

type ReconnectState = {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: Error | null;
  client: unknown;
};

vi.mock('@floegence/flowersec-core/reconnect', () => {
  let state: ReconnectState = { status: 'disconnected', error: null, client: null };
  const listeners = new Set<(next: ReconnectState) => void>();

  const emit = (next: ReconnectState) => {
    state = next;
    for (const listener of listeners) {
      listener(state);
    }
  };

  return {
    createReconnectManager: () => ({
      state: () => state,
      subscribe: (listener: (next: ReconnectState) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      connect: async () => {},
      connectIfNeeded: async () => {},
      disconnect: () => emit({ status: 'disconnected', error: null, client: null }),
    }),
    __mock: {
      reset: () => {
        state = { status: 'disconnected', error: null, client: null };
        listeners.clear();
      },
      emit,
    },
  };
});

class FakeRpcClient {
  private readonly handlers = new Map<number, Set<(payload: unknown) => void>>();

  onNotify(typeId: number, handler: (payload: unknown) => void): () => void {
    const tid = typeId >>> 0;
    const set = this.handlers.get(tid) ?? new Set<(payload: unknown) => void>();
    set.add(handler);
    this.handlers.set(tid, set);
    return () => {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(tid);
      }
    };
  }

  async call(typeId: number, payload: unknown): Promise<{ payload: unknown }> {
    return { payload: { typeId, payload } };
  }

  async notify(): Promise<void> {}

  trigger(typeId: number, payload: unknown): void {
    const set = this.handlers.get(typeId >>> 0);
    if (!set) return;
    for (const handler of set) {
      handler(payload);
    }
  }
}

const dummyContract: ProtocolContract = {
  id: 'test',
  createRpc: () => ({}),
};

function createClient(rpc: FakeRpcClient) {
  return {
    path: 'tunnel' as const,
    rpc,
    openStream: async () => {
      throw new Error('not implemented');
    },
    ping: async () => {},
    close: () => {},
  };
}

function mountRpcHarness() {
  let rpc!: ReturnType<typeof useRpc>;
  let dispose!: () => void;

  function Harness() {
    rpc = useRpc();
    return null;
  }

  createRoot((rootDispose) => {
    dispose = rootDispose;
    createComponent(ProtocolProvider, {
      contract: dummyContract,
      get children() {
        return createComponent(Harness, {});
      },
    });
  });

  return { rpc, dispose };
}

describe('useRpc stable transport', () => {
  it('keeps notify subscriptions attached across client rebinds', async () => {
    const reconnectMod = await import('@floegence/flowersec-core/reconnect');
    // @ts-expect-error -- test-only mock helper
    reconnectMod.__mock.reset();

    const firstClient = new FakeRpcClient();
    const secondClient = new FakeRpcClient();
    const handler = vi.fn();
    const { rpc, dispose } = mountRpcHarness();

    try {
      const unsubscribe = rpc.onNotify(7, handler);

      // @ts-expect-error -- test-only mock helper
      reconnectMod.__mock.emit({ status: 'connected', error: null, client: createClient(firstClient) });
      firstClient.trigger(7, { seq: 1 });
      expect(handler).toHaveBeenCalledTimes(1);

      // @ts-expect-error -- test-only mock helper
      reconnectMod.__mock.emit({ status: 'connected', error: null, client: createClient(secondClient) });
      firstClient.trigger(7, { seq: 2 });
      secondClient.trigger(7, { seq: 3 });
      expect(handler).toHaveBeenCalledTimes(2);

      unsubscribe();
      secondClient.trigger(7, { seq: 4 });
      expect(handler).toHaveBeenCalledTimes(2);
    } finally {
      dispose();
    }
  });

  it('surfaces detached transport as ProtocolNotConnectedError', async () => {
    const reconnectMod = await import('@floegence/flowersec-core/reconnect');
    // @ts-expect-error -- test-only mock helper
    reconnectMod.__mock.reset();

    const { rpc, dispose } = mountRpcHarness();
    try {
      await expect(rpc.call(1, { ping: true })).rejects.toBeInstanceOf(ProtocolNotConnectedError);
    } finally {
      dispose();
    }
  });
});
