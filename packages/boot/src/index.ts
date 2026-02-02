export type WaitForMessageOptions<T> = Readonly<{
  expectedOrigins: string[];
  expectedSource: Window;
  timeoutMs?: number;
  accept: (data: unknown) => T | null;
}>;

export function base64UrlToBase64(s: string): string {
  let out = String(s ?? '').replace(/-/g, '+').replace(/_/g, '/');
  while (out.length % 4 !== 0) out += '=';
  return out;
}

export function parseHashParam(key: string): string | null {
  const k = String(key ?? '').trim();
  if (!k) return null;

  const raw = String(window.location.hash ?? '').trim();
  const h = raw.startsWith('#') ? raw.slice(1) : raw;
  if (!h) return null;

  try {
    const params = new URLSearchParams(h);
    const v = String(params.get(k) ?? '').trim();
    return v || null;
  } catch {
    return null;
  }
}

export function parseBase64UrlJsonFromHash<T>(key: string): T | null {
  const encoded = parseHashParam(key);
  if (!encoded) return null;

  try {
    const jsonText = atob(base64UrlToBase64(encoded));
    return (jsonText ? JSON.parse(jsonText) : null) as T;
  } catch {
    return null;
  }
}

export function clearLocationHash(): void {
  try {
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  } catch {
    // ignore
  }
}

export function getSessionStorage(key: string): string {
  try {
    return String(sessionStorage.getItem(key) ?? '').trim();
  } catch {
    return '';
  }
}

export function setSessionStorage(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function removeSessionStorage(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function postMessageToOrigins(target: Window, origins: string[], message: unknown): void {
  const uniq = Array.from(new Set((origins ?? []).map((o) => String(o ?? '').trim()).filter(Boolean)));
  for (const origin of uniq) {
    try {
      target.postMessage(message, origin);
    } catch {
      // ignore
    }
  }
}

export function waitForMessage<T>(opts: WaitForMessageOptions<T>): Promise<T> {
  const origins = Array.from(new Set((opts.expectedOrigins ?? []).map((o) => String(o ?? '').trim()).filter(Boolean)));
  if (origins.length === 0) return Promise.reject(new Error('expectedOrigins is required'));
  if (!opts.expectedSource) return Promise.reject(new Error('expectedSource is required'));

  const timeoutMs = Math.max(0, Math.floor(opts.timeoutMs ?? 8_000));

  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => {
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
      window.clearTimeout(t);
      window.removeEventListener('message', onMessage);
    };

    window.addEventListener('message', onMessage);
  });
}

