import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'solid-js/web';
import { ProtocolProvider, useProtocol, type ConnectConfig } from '../src/client';
import type { ProtocolContract } from '../src/contract';

vi.mock('@floegence/flowersec-core/browser', () => {
  let calls: ConnectConfig[] = [];
  let connectArgs: Array<{ connectOnce: ReturnType<typeof vi.fn> }> = [];

  return {
    createBrowserReconnectConfig: vi.fn((config: ConnectConfig) => {
      calls.push(config);
      const args = { connectOnce: vi.fn() };
      connectArgs.push(args);
      return args;
    }),
    __mock: {
      reset: () => {
        calls = [];
        connectArgs = [];
      },
      getCalls: () => calls.slice(),
      getConnectArgs: () => connectArgs.slice(),
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
      source: { kind: 'once', artifact: { v: 1, transport: 'direct' } as never },
      connect: {
        handshakeTimeoutMs: 4_000,
        transportSecurityPolicy: 'allow_plaintext_for_loopback',
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
      browserMod.__mock.getConnectArgs()[0],
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
      source: {
        kind: 'refreshable',
        acquire: async () => ({ v: 1, transport: 'tunnel' }) as never,
      },
      connect: {
        liveness: { intervalMs: 30_000, timeoutMs: 10_000 },
        transportSecurityPolicy: 'require_tls',
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
      browserMod.__mock.getConnectArgs()[0],
    ]);
    // @ts-expect-error -- test-only mock helper
    expect(reconnectMod.__mock.getConnectIfNeededCalls()).toEqual([]);
  });

  it('reuses one compiled reconnect adapter across connect and hard reconnect', async () => {
    const browserMod = await import('@floegence/flowersec-core/browser');
    const reconnectMod = await import('@floegence/flowersec-core/reconnect');
    // @ts-expect-error -- test-only mock helper
    browserMod.__mock.reset();
    // @ts-expect-error -- test-only mock helper
    reconnectMod.__mock.reset();

    const config: ConnectConfig = {
      source: {
        kind: 'refreshable',
        acquire: async () => ({ v: 1, transport: 'tunnel' }) as never,
      },
      autoReconnect: { enabled: true },
    };
    let flow: Promise<void> | null = null;

    function Harness() {
      const protocol = useProtocol();
      flow = protocol.connect(config).then(() => protocol.reconnect());
      return null;
    }

    renderToString(() => (
      <ProtocolProvider contract={dummyContract}>
        <Harness />
      </ProtocolProvider>
    ));

    if (!flow) throw new Error('connection flow was not started');
    await flow;

    // @ts-expect-error -- test-only mock helper
    expect(browserMod.__mock.getCalls()).toEqual([config]);
    // @ts-expect-error -- test-only mock helper
    const [compiled] = browserMod.__mock.getConnectArgs();
    // @ts-expect-error -- test-only mock helper
    expect(reconnectMod.__mock.getConnectIfNeededCalls()).toEqual([compiled]);
    // @ts-expect-error -- test-only mock helper
    expect(reconnectMod.__mock.getConnectCalls()).toEqual([compiled]);
  });
});
