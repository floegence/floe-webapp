import { afterEach, describe, expect, it, vi } from 'vitest';
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
      waitForSession: async () => ({} as never),
      close,
    })),
  };
});

vi.mock('@floegence/flowersec-core/browser', () => ({ createConnectionController }));

afterEach(() => {
  close.mockClear();
  createConnectionController.mockClear();
});

describe('ProtocolProvider controller ownership', () => {
  it('does not rebuild a waiting or connected controller for ordinary connect calls', async () => {
    const config = {
      source: { acquire: async () => ({ kind: 'failure', code: 'test', disposition: { kind: 'terminal' } }) },
    } as never;
    let connect!: (config: typeof config) => Promise<void>;
    let dispose!: () => void;
    createRoot((rootDispose) => {
      dispose = rootDispose;
      createComponent(ProtocolProvider, { contract, get children() {
        return createComponent(() => { connect = useProtocol().connect; return null; }, {});
      } });
    });
    await connect(config);
    await connect(config);
    expect(createConnectionController).toHaveBeenCalledOnce();
    dispose();
  });

  it('requires explicit replacement before changing the source identity', async () => {
    const first = { source: { acquire: async () => ({ kind: 'failure', code: 'one', disposition: { kind: 'terminal' } }) } } as never;
    const second = { source: { acquire: async () => ({ kind: 'failure', code: 'two', disposition: { kind: 'terminal' } }) } } as never;
    let connect!: (config: typeof first) => Promise<void>;
    let replace!: (config: typeof second) => Promise<void>;
    let dispose!: () => void;
    createRoot((rootDispose) => {
      dispose = rootDispose;
      createComponent(ProtocolProvider, { contract, get children() {
        return createComponent(() => {
          const protocol = useProtocol();
          connect = protocol.connect;
          replace = protocol.replaceConnection;
          return null;
        }, {});
      } });
    });
    await connect(first);
    await expect(connect(second)).rejects.toThrow(/replaceConnection/u);
    await replace(second);
    expect(createConnectionController).toHaveBeenCalledTimes(2);
    dispose();
  });

  it('disconnects and closes the controller', async () => {
    const config = {
      source: { acquire: async () => ({ kind: 'failure', code: 'test', disposition: { kind: 'terminal' } }) },
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
      createComponent(ProtocolProvider, { contract, get children() { return createComponent(Harness, {}); } });
    });
    await connect;

    disconnect();
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
    dispose();
  });
});
