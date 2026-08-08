import { createComponent, createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { ProtocolProvider } from '../src/client';
import type { ProtocolContract } from '../src/contract';
import { ProtocolNotConnectedError, useRpc } from '../src/rpc';

const contract: ProtocolContract = { id: 'test', createRpc: () => ({}) };

describe('useRpc Flowersec 2.0 session transport', () => {
  it('returns ProtocolNotConnectedError while detached', async () => {
    let rpc!: ReturnType<typeof useRpc>;
    let dispose!: () => void;
    createRoot((rootDispose) => {
      dispose = rootDispose;
      createComponent(ProtocolProvider, { contract, get children() { return createComponent(() => { rpc = useRpc(); return null; }, {}); } });
    });
    try {
      await expect(rpc.call(1, {})).rejects.toBeInstanceOf(ProtocolNotConnectedError);
      await expect(rpc.notifyBestEffort(2, {})).resolves.toBeUndefined();
    } finally { dispose(); }
  });
});
