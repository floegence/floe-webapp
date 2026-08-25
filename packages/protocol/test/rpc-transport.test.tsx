import { createComponent, createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { ProtocolProvider, useProtocol } from '../src/client';
import type { ProtocolContract } from '../src/contract';
import { ProtocolNotConnectedError, useRpc } from '../src/rpc';

const connectedSession = {
  rpc: {
    call: async (_typeId: number, _payload: unknown, decode: (value: never) => unknown) => ({ ok: true as const, payload: decode({ value: 42 } as never) }),
    notify: async () => {},
    onNotify: (_typeId: number, decode: (value: never) => unknown, handler: (payload: unknown) => void) => {
      handler(decode({ event: 'ready' } as never));
      return () => {};
    },
  },
  close: async () => {},
  waitTermination: async () => ({ error: { code: 'closed' } }),
};

vi.mock('@floegence/flowersec-core/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@floegence/flowersec-core/browser')>()),
  createConnectionController: vi.fn(() => ({
    state: 'connected',
    currentSession: connectedSession,
    failure: undefined,
    subscribe: (listener: (snapshot: unknown) => void) => {
      listener({ state: 'connected', attempt: 1, currentSession: connectedSession });
      return () => {};
    },
    start: () => {},
    retryNow: () => false,
    waitForSession: async () => connectedSession,
    close: async () => {},
  })),
}));

const contract: ProtocolContract = { id: 'test', createRpc: () => ({}) };

describe('useRpc Flowersec session transport', () => {
  it('returns ProtocolNotConnectedError while detached', async () => {
    let rpc!: ReturnType<typeof useRpc>;
    let dispose!: () => void;
    createRoot((rootDispose) => {
      dispose = rootDispose;
      createComponent(ProtocolProvider, { contract, get children() {
        return createComponent(() => { rpc = useRpc(); return null; }, {});
      } });
    });
    try {
      await expect(rpc.call(1, {}, (value) => value)).rejects.toBeInstanceOf(ProtocolNotConnectedError);
      await expect(rpc.notifyBestEffort(2, {})).resolves.toBeUndefined();
    } finally {
      dispose();
    }
  });

  it('passes decoder functions to Flowersec and rejects invalid decoded responses', async () => {
    let rpc!: ReturnType<typeof useRpc>;
    let protocol!: ReturnType<typeof useProtocol>;
    let dispose!: () => void;
    createRoot((rootDispose) => {
      dispose = rootDispose;
      createComponent(ProtocolProvider, { contract, get children() {
        return createComponent(() => {
          rpc = useRpc();
          protocol = useProtocol();
          return null;
        }, {});
      } });
    });
    await protocol.connect({ source: { acquire: async () => ({ kind: 'failure', code: 'unused', disposition: { kind: 'terminal' } }) } as never });
    await expect(rpc.call(1, { request: true }, (value) => {
      if (value === null || typeof value !== 'object' || !('value' in value) || typeof value.value !== 'number') throw new Error('invalid response');
      return value.value;
    })).resolves.toBe(42);
    await expect(rpc.call(1, {}, () => { throw new Error('invalid response'); })).rejects.toMatchObject({ name: 'RpcError' });
    dispose();
  });
});
