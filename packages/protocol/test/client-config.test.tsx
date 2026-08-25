import { describe, expect, it, vi } from 'vitest';
import { createComponent, createRoot } from 'solid-js';
import { ProtocolProvider, useProtocol, type ConnectConfig } from '../src/client';
import type { ProtocolContract } from '../src/contract';

const controller = {
  state: 'connected' as const,
  subscribe: vi.fn((listener: (snapshot: { state: 'connected'; currentSession: null }) => void) => {
    listener({ state: 'connected', currentSession: null });
    return () => {};
  }),
  start: vi.fn(),
  waitForSession: vi.fn(async () => ({}) as never),
  close: vi.fn(async () => {}),
};

vi.mock('@floegence/flowersec-core/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@floegence/flowersec-core/browser')>()),
  createConnectionController: vi.fn(() => controller),
}));

const contract: ProtocolContract = { id: 'test', createRpc: () => ({}) };

describe('ProtocolProvider connection controller contract', () => {
  it('passes browser controller options, including connectTimeoutMs, to Flowersec 3.1.1', async () => {
    const browser = await import('@floegence/flowersec-core/browser');
    const config: ConnectConfig = {
      source: { acquire: async () => ({ kind: 'failure', code: 'test', disposition: { kind: 'terminal' } }) } as never,
      controller: { maximumAttempts: 1, connectTimeoutMs: 2500 },
    };
    let pending!: Promise<void>;
    function Harness() { pending = useProtocol().connect(config); return null; }
    let dispose!: () => void;
    createRoot((rootDispose) => { dispose = rootDispose; createComponent(ProtocolProvider, { contract, get children() { return createComponent(Harness, {}); } }); });
    await pending;
    expect(browser.createConnectionController).toHaveBeenCalledWith(config.source, config.controller);
    expect(controller.start).toHaveBeenCalled();
    dispose();
  });
});
