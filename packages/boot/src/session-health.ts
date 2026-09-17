import type { Session } from '@floegence/flowersec-core';

// Stay comfortably inside Flowersec's 60-second idle window. This monitor
// owns liveness only; the existing controller owns acquisition and retries.
const PROBE_INTERVAL_MS = 20_000;
const PROBE_TIMEOUT_MS = 10_000;

export function createSessionHealthMonitor() {
  let session: Session | null = null;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let probe: AbortController | undefined;
  const target = typeof window === 'undefined' ? undefined : window;
  const doc = typeof document === 'undefined' ? undefined : document;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    const previous = probe;
    probe = undefined;
    previous?.abort();
  };
  const schedule = () => {
    clearTimeout(timer);
    if (!disposed && session !== null) timer = setTimeout(check, PROBE_INTERVAL_MS);
  };
  const check = () => {
    if (disposed || session === null || probe !== undefined) return;
    const current = session;
    const pending = new AbortController();
    probe = pending;
    const ownsProbe = () => !disposed && session === current && probe === pending;
    const fail = () => {
      if (!ownsProbe()) return;
      session = null;
      cancel();
      // Closing a stale session lets Flowersec classify its termination and
      // reacquire normally, without resetting backoff or terminal authority.
      void current.close().catch(() => undefined);
    };
    clearTimeout(timer);
    timer = setTimeout(fail, PROBE_TIMEOUT_MS);
    void (async () => {
      try {
        await current.probeLiveness({ signal: pending.signal });
        if (!ownsProbe()) return;
        probe = undefined;
        schedule();
      } catch {
        fail();
      }
    })();
  };
  const onVisible = () => {
    if (doc?.visibilityState === 'visible') check();
  };
  target?.addEventListener('online', check);
  target?.addEventListener('focus', check);
  target?.addEventListener('pageshow', check);
  doc?.addEventListener('visibilitychange', onVisible);

  return Object.freeze({
    synchronize(next: Session | null) {
      if (disposed || next === session) return;
      cancel();
      session = next;
      schedule();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      session = null;
      cancel();
      target?.removeEventListener('online', check);
      target?.removeEventListener('focus', check);
      target?.removeEventListener('pageshow', check);
      doc?.removeEventListener('visibilitychange', onVisible);
    },
  });
}
