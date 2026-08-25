import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectionControllerError } from '@floegence/flowersec-core/browser';
import { ProtocolProvider, useProtocol } from '../src/client';
import type { ProtocolContract } from '../src/contract';
import { createComponent, createRoot } from 'solid-js';

const contract: ProtocolContract = { id: 'test', createRpc: () => ({}) };
const { close, createConnectionController } = vi.hoisted(() => {
  const close = vi.fn(async () => {});
  return {
    close,
    createConnectionController: vi.fn(() => ({
      state: 'idle',
      subscribe: () => () => {},
      start: () => {},
      waitForSession: async () => ({}) as never,
      close,
    })),
  };
});

vi.mock('@floegence/flowersec-core/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@floegence/flowersec-core/browser')>()),
  createConnectionController,
}));

afterEach(() => {
  close.mockClear();
  createConnectionController.mockClear();
});

describe('ProtocolProvider controller ownership', () => {
  it('does not rebuild a waiting or connected controller for ordinary connect calls', async () => {
    const config = {
      source: {
        acquire: async () => ({ kind: 'failure', code: 'test', disposition: { kind: 'terminal' } }),
      },
    } as never;
    let connect!: (config: typeof config) => Promise<void>;
    let dispose!: () => void;
    createRoot((rootDispose) => {
      dispose = rootDispose;
      createComponent(ProtocolProvider, {
        contract,
        get children() {
          return createComponent(() => {
            connect = useProtocol().connect;
            return null;
          }, {});
        },
      });
    });
    await connect(config);
    await connect(config);
    expect(createConnectionController).toHaveBeenCalledOnce();
    dispose();
  });

  it('requires explicit replacement before changing the source identity', async () => {
    const first = {
      source: {
        acquire: async () => ({ kind: 'failure', code: 'one', disposition: { kind: 'terminal' } }),
      },
    } as never;
    const second = {
      source: {
        acquire: async () => ({ kind: 'failure', code: 'two', disposition: { kind: 'terminal' } }),
      },
    } as never;
    let connect!: (config: typeof first) => Promise<void>;
    let replace!: (config: typeof second) => Promise<void>;
    let dispose!: () => void;
    createRoot((rootDispose) => {
      dispose = rootDispose;
      createComponent(ProtocolProvider, {
        contract,
        get children() {
          return createComponent(() => {
            const protocol = useProtocol();
            connect = protocol.connect;
            replace = protocol.replaceConnection;
            return null;
          }, {});
        },
      });
    });
    await connect(first);
    await expect(connect(second)).rejects.toThrow(/replaceConnection/u);
    await replace(second);
    expect(createConnectionController).toHaveBeenCalledTimes(2);
    dispose();
  });

  it('disconnects and closes the controller', async () => {
    const config = {
      source: {
        acquire: async () => ({ kind: 'failure', code: 'test', disposition: { kind: 'terminal' } }),
      },
    } as never;
    let connect!: Promise<void>;
    let disconnect!: () => void;
    function Harness() {
      const protocol = useProtocol();
      connect = protocol.connect(config);
      disconnect = protocol.disconnect;
      return null;
    }
    let dispose!: () => void;
    createRoot((rootDispose) => {
      dispose = rootDispose;
      createComponent(ProtocolProvider, {
        contract,
        get children() {
          return createComponent(Harness, {});
        },
      });
    });
    await connect;

    disconnect();
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
    dispose();
  });

  it('exposes session-free diagnostics and structured controller failures', async () => {
    let publish!: (snapshot: never) => void;
    const session = { rpc: {}, close: async () => {}, waitTermination: async () => ({ error: new Error('closed') }) } as never;
    createConnectionController.mockImplementationOnce(() => ({
      state: 'idle',
      subscribe: (listener: (snapshot: never) => void) => {
        publish = listener;
        listener({ state: 'idle', attempt: 0 } as never);
        return () => {};
      },
      start: () => {},
      retryNow: () => false,
      waitForSession: async () => session,
      close,
    }));

    const config = {
      source: {
        acquire: async () => ({ kind: 'failure', code: 'test', disposition: { kind: 'terminal' } }),
      },
    } as never;
    let protocol!: ReturnType<typeof useProtocol>;
    let dispose!: () => void;
    createRoot((rootDispose) => {
      dispose = rootDispose;
      createComponent(ProtocolProvider, {
        contract,
        get children() {
          return createComponent(() => {
            protocol = useProtocol();
            return null;
          }, {});
        },
      });
    });

    await protocol.connect(config);
    publish({ state: 'connected', attempt: 1, currentSession: session } as never);
    expect(protocol.diagnostic()).toEqual({ state: 'connected', attempt: 1 });
    expect('currentSession' in protocol.diagnostic()).toBe(false);

    publish({
      state: 'waiting',
      attempt: 2,
      failure: { phase: 'connect', code: 'connection_failed' },
      retryDisposition: { kind: 'retryable' },
    } as never);
    expect(protocol.diagnostic()).toMatchObject({
      state: 'waiting',
      failure: { phase: 'connect', code: 'connection_failed' },
      retryDisposition: { kind: 'retryable' },
    });
    expect(protocol.error()).toBeNull();

    publish({
      state: 'failed',
      attempt: 3,
      failure: { phase: 'connect', code: 'connection_failed' },
      retryDisposition: { kind: 'terminal' },
    } as never);
    expect(protocol.error()).toBeInstanceOf(ConnectionControllerError);
    expect(protocol.error()).toMatchObject({
      code: 'failed',
      failure: { phase: 'connect', code: 'connection_failed' },
      retryDisposition: { kind: 'terminal' },
      diagnostic: protocol.diagnostic(),
    });
    dispose();
  });

  it('does not publish idle when a closing controller no longer owns the connection', async () => {
    let finishFirstClose!: () => void;
    const firstClosePending = new Promise<void>((resolve) => {
      finishFirstClose = resolve;
    });
    const firstController = {
      state: 'connected' as const,
      subscribe: (listener: (snapshot: never) => void) => {
        listener({ state: 'connected', attempt: 1, currentSession: {} } as never);
        return () => {};
      },
      start: () => {},
      waitForSession: async () => ({}) as never,
      close: vi.fn(() => firstClosePending),
    };
    const secondController = {
      state: 'connected' as const,
      subscribe: (listener: (snapshot: never) => void) => {
        listener({ state: 'connected', attempt: 1, currentSession: {} } as never);
        return () => {};
      },
      start: () => {},
      waitForSession: async () => ({}) as never,
      close: vi.fn(async () => {}),
    };
    createConnectionController
      .mockImplementationOnce(() => firstController)
      .mockImplementationOnce(() => secondController);

    const config = {
      source: {
        acquire: async () => ({ kind: 'failure', code: 'test', disposition: { kind: 'terminal' } }),
      },
    } as never;
    let connect!: (config: typeof config) => Promise<void>;
    let disconnect!: () => void;
    let status!: () => string;
    let dispose!: () => void;
    createRoot((rootDispose) => {
      dispose = rootDispose;
      createComponent(ProtocolProvider, {
        contract,
        get children() {
          return createComponent(() => {
            const protocol = useProtocol();
            connect = protocol.connect;
            disconnect = protocol.disconnect;
            status = protocol.status;
            return null;
          }, {});
        },
      });
    });

    await connect(config);
    disconnect();
    await connect(config);
    expect(status()).toBe('connected');

    finishFirstClose();
    await firstClosePending;
    await vi.waitFor(() => expect(firstController.close).toHaveBeenCalledOnce());
    expect(status()).toBe('connected');
    dispose();
  });
});
