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

describe('ProtocolProvider reconnect semantics', () => {
  it('requires a source for the first reconnect', async () => {
    let result!: Promise<void>;
    function Harness() { result = useProtocol().reconnect(); return null; }
    createRoot(() => { createComponent(ProtocolProvider, { contract, get children() { return createComponent(Harness, {}); } }); });
    await expect(result).rejects.toThrow(/requires a config/u);
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
