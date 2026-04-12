export type WaitForMessageOptions<T> = Readonly<{
  expectedOrigins: string[];
  expectedSource: Window;
  timeoutMs?: number;
  accept: (data: unknown) => T | null;
}>;

export function postMessageToOrigins(target: Window, origins: string[], message: unknown): void {
  const uniqOrigins = Array.from(new Set((origins ?? []).map((origin) => String(origin ?? '').trim()).filter(Boolean)));
  for (const origin of uniqOrigins) {
    try {
      target.postMessage(message, origin);
    } catch {
      // ignore
    }
  }
}

export function waitForMessage<T>(opts: WaitForMessageOptions<T>): Promise<T> {
  const origins = Array.from(new Set((opts.expectedOrigins ?? []).map((origin) => String(origin ?? '').trim()).filter(Boolean)));
  if (origins.length === 0) return Promise.reject(new Error('expectedOrigins is required'));
  if (!opts.expectedSource) return Promise.reject(new Error('expectedSource is required'));

  const timeoutMs = Math.max(0, Math.floor(opts.timeoutMs ?? 8_000));

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Handshake timeout'));
    }, timeoutMs);

    const onMessage = (ev: MessageEvent) => {
      if (!origins.includes(ev.origin)) return;
      if (ev.source !== opts.expectedSource) return;
      const accepted = opts.accept(ev.data);
      if (accepted == null) return;
      cleanup();
      resolve(accepted);
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
    };

    window.addEventListener('message', onMessage);
  });
}
