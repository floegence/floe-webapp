import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'solid-js/web';
import { ProtocolProvider, useProtocol, type ConnectConfig } from '../src/client';
import type { ProtocolContract } from '../src/contract';

vi.mock('@floegence/flowersec-core/browser', () => {
  let calls: ConnectConfig[] = [];
  const connectArgs = {
    connectOnce: vi.fn(),
  };

  return {
    createBrowserReconnectConfig: vi.fn((config: ConnectConfig) => {
      calls.push(config);
      return connectArgs;
    }),
    __mock: {
      reset: () => {
        calls = [];
      },
      getCalls: () => calls.slice(),
      getConnectArgs: () => connectArgs,
    },
  };
});

vi.mock('@floegence/flowersec-core/reconnect', () => {
  let state = { status: 'disconnected', error: null as Error | null, client: null as unknown };
  let connectCalls: unknown[] = [];
  let connectIfNeededCalls: unknown[] = [];

  return {
    createReconnectManager: () => ({
      state: () => state,
      subscribe: () => () => {},
      connect: async (config: unknown) => {
        connectCalls.push(config);
      },
      connectIfNeeded: async (config: unknown) => {
        connectIfNeededCalls.push(config);
      },
      disconnect: () => {},
    }),
    __mock: {
      reset: () => {
        state = { status: 'disconnected', error: null, client: null };
        connectCalls = [];
        connectIfNeededCalls = [];
      },
      setState: (next: typeof state) => {
        state = next;
      },
      getConnectCalls: () => connectCalls.slice(),
      getConnectIfNeededCalls: () => connectIfNeededCalls.slice(),
    },
  };
});

const dummyContract: ProtocolContract = {
  id: 'test',
  createRpc: () => ({}),
};

describe('ProtocolProvider connect config delegation', () => {
  it('should delegate connect() config to createBrowserReconnectConfig', async () => {
    const browserMod = await import('@floegence/flowersec-core/browser');
    const reconnectMod = await import('@floegence/flowersec-core/reconnect');
    // @ts-expect-error -- test-only mock helper
    browserMod.__mock.reset();
    // @ts-expect-error -- test-only mock helper
    reconnectMod.__mock.reset();

    const config: ConnectConfig = {
      mode: 'direct',
      getDirectInfo: async () => ({ ws_url: 'wss://direct.example.com/ws' } as never),
      connect: {
        handshakeTimeoutMs: 4_000,
      },
      autoReconnect: { enabled: false },
    };

    let connectPromise: Promise<void> | null = null;

    function Harness() {
      const protocol = useProtocol();
      connectPromise = protocol.connect(config);
      return null;
    }

    renderToString(() => (
      <ProtocolProvider contract={dummyContract}>
        <Harness />
      </ProtocolProvider>
    ));

    if (!connectPromise) {
      throw new Error('connect() was not called');
    }
    await connectPromise;

    // @ts-expect-error -- test-only mock helper
    expect(browserMod.__mock.getCalls()).toEqual([config]);
    // @ts-expect-error -- test-only mock helper
    expect(reconnectMod.__mock.getConnectIfNeededCalls()).toEqual([
      // @ts-expect-error -- test-only mock helper
      browserMod.__mock.getConnectArgs(),
    ]);
    // @ts-expect-error -- test-only mock helper
    expect(reconnectMod.__mock.getConnectCalls()).toEqual([]);
  });

  it('should use a hard reconnect when reconnect() is called', async () => {
    const browserMod = await import('@floegence/flowersec-core/browser');
    const reconnectMod = await import('@floegence/flowersec-core/reconnect');
    // @ts-expect-error -- test-only mock helper
    browserMod.__mock.reset();
    // @ts-expect-error -- test-only mock helper
    reconnectMod.__mock.reset();

    const config: ConnectConfig = {
      mode: 'tunnel',
      artifactControlplane: {
        baseUrl: 'https://cp.example.com',
        endpointId: 'endpoint-1',
      },
      connect: {
        keepaliveIntervalMs: 30_000,
      },
    };

    let reconnectPromise: Promise<void> | null = null;

    function Harness() {
      const protocol = useProtocol();
      reconnectPromise = protocol.reconnect(config);
      return null;
    }

    renderToString(() => (
      <ProtocolProvider contract={dummyContract}>
        <Harness />
      </ProtocolProvider>
    ));

    if (!reconnectPromise) {
      throw new Error('reconnect() was not called');
    }
    await reconnectPromise;

    // @ts-expect-error -- test-only mock helper
    expect(browserMod.__mock.getCalls()).toEqual([config]);
    // @ts-expect-error -- test-only mock helper
    expect(reconnectMod.__mock.getConnectCalls()).toEqual([
      // @ts-expect-error -- test-only mock helper
      browserMod.__mock.getConnectArgs(),
    ]);
    // @ts-expect-error -- test-only mock helper
    expect(reconnectMod.__mock.getConnectIfNeededCalls()).toEqual([]);
  });
});
