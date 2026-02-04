import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'solid-js/web';
import { ProtocolProvider, useProtocol } from '../src/client';
import type { ProtocolContract } from '../src/contract';

// Mock the reconnect manager so we can assert whether a hard reconnect happens,
// without actually establishing any network connection in tests.
vi.mock('@floegence/flowersec-core/reconnect', () => {
  let connectCalls = 0;
  let state = { status: 'disconnected', error: null as Error | null, client: null as unknown };

  return {
    createReconnectManager: () => ({
      state: () => state,
      subscribe: () => () => {},
      connect: async () => {
        connectCalls += 1;
      },
      disconnect: () => {},
    }),
    __mock: {
      reset: () => {
        connectCalls = 0;
        state = { status: 'disconnected', error: null, client: null };
      },
      setState: (next: typeof state) => {
        state = next;
      },
      getConnectCalls: () => connectCalls,
    },
  };
});

const dummyContract: ProtocolContract = {
  id: 'test',
  createRpc: () => ({}),
};

describe('ProtocolProvider connect semantics', () => {
  it('connect() should be idempotent when already connected', async () => {
    const reconnectMod = await import('@floegence/flowersec-core/reconnect');
    // @ts-expect-error -- test-only mock helper
    reconnectMod.__mock.reset();
    // @ts-expect-error -- test-only mock helper
    reconnectMod.__mock.setState({ status: 'connected', error: null, client: {} });

    function Harness() {
      const p = useProtocol();
      void p.connect({ mode: 'direct', directInfo: {} as never });
      return null;
    }

    renderToString(() => (
      <ProtocolProvider contract={dummyContract}>
        <Harness />
      </ProtocolProvider>
    ));

    // @ts-expect-error -- test-only mock helper
    expect(reconnectMod.__mock.getConnectCalls()).toBe(0);
  });

  it('reconnect() should trigger a hard reconnect even when already connected', async () => {
    const reconnectMod = await import('@floegence/flowersec-core/reconnect');
    // @ts-expect-error -- test-only mock helper
    reconnectMod.__mock.reset();
    // @ts-expect-error -- test-only mock helper
    reconnectMod.__mock.setState({ status: 'connected', error: null, client: {} });

    function Harness() {
      const p = useProtocol();
      void p.reconnect({ mode: 'direct', directInfo: {} as never });
      return null;
    }

    renderToString(() => (
      <ProtocolProvider contract={dummyContract}>
        <Harness />
      </ProtocolProvider>
    ));

    // @ts-expect-error -- test-only mock helper
    expect(reconnectMod.__mock.getConnectCalls()).toBe(1);
  });
});

