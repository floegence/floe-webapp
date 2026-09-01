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
  createPrivateLoopbackConnectionControllerV1: vi.fn(() => controller),
}));

const contract: ProtocolContract = { id: 'test', createRpc: () => ({}) };

describe('ProtocolProvider connection controller contract', () => {
  it('passes browser controller options, including connectTimeoutMs, to Flowersec', async () => {
    const browser = await import('@floegence/flowersec-core/browser');
    const config: ConnectConfig = {
      source: {
        acquire: async () => ({ kind: 'failure', code: 'test', disposition: { kind: 'terminal' } }),
      } as never,
      controller: { maximumAttempts: 1, connectTimeoutMs: 2500 },
    };
    let pending!: Promise<void>;
    function Harness() {
      pending = useProtocol().connect(config);
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
    await pending;
    expect(browser.createConnectionController).toHaveBeenCalledWith(
      config.source,
      config.controller
    );
    expect(controller.start).toHaveBeenCalled();
    dispose();
  });

  it('uses the explicit private-loopback Controller without changing Protocol ownership', async () => {
    const browser = await import('@floegence/flowersec-core/browser');
    const config: ConnectConfig = {
      source: {
        acquire: async () => ({ kind: 'failure', code: 'test', disposition: { kind: 'terminal' } }),
      } as never,
      privateLoopback: {
        origin: 'http://127.0.0.1:43123',
        maximumAttempts: 1,
        connectTimeoutMs: 2500,
      },
    };
    let pending!: Promise<void>;
    function Harness() {
      pending = useProtocol().connect(config);
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
    await pending;
    expect(browser.createPrivateLoopbackConnectionControllerV1).toHaveBeenCalledWith(
      config.source,
      config.privateLoopback
    );
    expect(
      vi
        .mocked(browser.createConnectionController)
        .mock.calls.some(([source]) => source === config.source)
    ).toBe(false);
    dispose();
  });
});
