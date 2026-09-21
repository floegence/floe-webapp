import type { Session } from '@floegence/flowersec-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAcquisitionConnectionLifecycle } from '../src/acquisition-lifecycle';

vi.mock('../src/acquisition', () => ({
  AcquisitionError: Error,
  clearAcquisitionSource: vi.fn(),
  synchronizeAcquisitionSourceSnapshot: (_source: unknown, snapshot: { currentSession?: Session }) =>
    snapshot.currentSession ?? null,
}));

vi.mock('../src/proxy-bootstrap', () => ({
  createProxyBootstrapOwner: () => ({}),
  synchronizeProxyBootstrap: vi.fn(),
  closeProxyBootstrap: vi.fn(),
  fetchProxyBootstrap: vi.fn(),
  readProxyBootstrapEvents: vi.fn(),
}));

const disposers: Array<() => void> = [];
function fixture() {
  const lifecycle = createAcquisitionConnectionLifecycle({} as never);
  disposers.push(lifecycle.dispose);
  const session = { probeLiveness: vi.fn(async (_options?: { signal?: AbortSignal }) => 1), close: vi.fn(async () => {}) };
  lifecycle.synchronize({ state: 'connected', attempt: 1, currentSession: session as unknown as Session });
  return { lifecycle, session };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('acquisition session health', () => {
  it('keeps an idle established session alive without application RPC traffic', async () => {
    const { session } = fixture();
    await vi.advanceTimersByTimeAsync(65_000);
    expect(session.probeLiveness).toHaveBeenCalledTimes(3);
    expect(session.close).not.toHaveBeenCalled();
  });

  it('closes an unresponsive session once so its existing controller can recover', async () => {
    const { session } = fixture();
    session.probeLiveness.mockImplementation(() => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(session.close).toHaveBeenCalledTimes(1);
    expect(session.probeLiveness.mock.calls[0]?.[0]).toMatchObject({ signal: expect.any(AbortSignal) });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it('cancels an old probe on replacement and ignores its late failure', async () => {
    const { session, lifecycle } = fixture();
    let rejectProbe: (reason: Error) => void = () => {};
    session.probeLiveness.mockImplementation(() => new Promise((_resolve, reject) => { rejectProbe = reject; }));
    await vi.advanceTimersByTimeAsync(20_000);
    const next = { probeLiveness: vi.fn(async () => 1), close: vi.fn(async () => {}) };
    lifecycle.synchronize({ state: 'connected', attempt: 2, currentSession: next as unknown as Session });
    rejectProbe(new Error('old connection'));
    await vi.advanceTimersByTimeAsync(20_000);
    expect(session.close).not.toHaveBeenCalled();
    expect(next.close).not.toHaveBeenCalled();
    expect(next.probeLiveness).toHaveBeenCalledTimes(1);
  });

  it('probes on foreground, network restoration and page restoration and coalesces event bursts', async () => {
    const target = new EventTarget();
    const doc = Object.assign(new EventTarget(), { visibilityState: 'hidden' });
    vi.stubGlobal('window', target);
    vi.stubGlobal('document', doc);
    const { session, lifecycle } = fixture();
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(session.probeLiveness).not.toHaveBeenCalled();
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    target.dispatchEvent(new Event('focus'));
    target.dispatchEvent(new Event('online'));
    expect(session.probeLiveness).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    target.dispatchEvent(new Event('pageshow'));
    expect(session.probeLiveness).toHaveBeenCalledTimes(2);
    lifecycle.dispose();
    target.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(session.probeLiveness).toHaveBeenCalledTimes(2);
    expect(session.close).not.toHaveBeenCalled();
  });

  it('never restarts waiting or terminal connections and releases all timers', async () => {
    const { session, lifecycle } = fixture();
    lifecycle.synchronize({ state: 'failed', attempt: 1, retryDisposition: { kind: 'terminal' } });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(session.probeLiveness).not.toHaveBeenCalled();
    expect(session.close).not.toHaveBeenCalled();
    lifecycle.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});
