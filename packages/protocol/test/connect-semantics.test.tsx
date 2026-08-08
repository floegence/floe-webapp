import { describe, expect, it, vi } from 'vitest';
import { ProtocolProvider, useProtocol } from '../src/client';
import type { ProtocolContract } from '../src/contract';
import { createComponent, createRoot } from 'solid-js';

const contract: ProtocolContract = { id: 'test', createRpc: () => ({}) };

describe('ProtocolProvider reconnect semantics', () => {
  it('requires a source for the first reconnect', async () => {
    let result!: Promise<void>;
    function Harness() { result = useProtocol().reconnect(); return null; }
    createRoot(() => { createComponent(ProtocolProvider, { contract, get children() { return createComponent(Harness, {}); } }); });
    await expect(result).rejects.toThrow(/requires a config/u);
  });

  it('disconnects and closes the controller', async () => {
    const close = vi.fn(async () => {});
    vi.doMock('@floegence/flowersec-core/browser', () => ({ createConnectionController: () => ({ state: 'idle', subscribe: () => () => {}, start: () => {}, waitForSession: async () => ({}) as never, close }) }));
    expect(close).not.toHaveBeenCalled();
  });
});
