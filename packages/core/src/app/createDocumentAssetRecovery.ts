import { createSignal, onCleanup, type Accessor } from 'solid-js';

export type DocumentAssetRecoveryReason = 'updated' | 'load-failed' | null;
export type DocumentAssetCheckResult = 'current' | 'updated' | 'unavailable';

export interface DocumentAssetRecovery {
  reason: Accessor<DocumentAssetRecoveryReason>;
  checking: Accessor<boolean>;
  /** Call after connectivity returns. No polling, navigation, or automatic reload is performed. */
  check: () => Promise<DocumentAssetCheckResult>;
}

export interface DocumentAssetRecoveryOptions {
  /** Stable HTML entry URL. The host supplies routing and authorization. */
  url: string;
  fetch?: typeof globalThis.fetch;
  document?: Document;
  timeoutMs?: number;
}

function entryModules(document: Document, baseURL: string): string | null {
  const entries = [...document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]')]
    .map((script) => new URL(script.getAttribute('src')!, baseURL).href);
  return entries.length ? JSON.stringify(entries.sort()) : null;
}

/**
 * Detect a changed ESM application entry and observe Vite import failures.
 * The loaded document remains authoritative until the user chooses to reload:
 * checking never resets drafts, remounts views, or silently accepts a new build.
 */
export function createDocumentAssetRecovery(options: DocumentAssetRecoveryOptions): DocumentAssetRecovery {
  const currentDocument = options.document ?? document;
  const view = currentDocument.defaultView ?? window;
  const url = new URL(options.url, currentDocument.baseURI).href;
  const loaded = entryModules(currentDocument, currentDocument.baseURI);
  const fetchDocument = options.fetch ?? globalThis.fetch.bind(globalThis);
  const [reason, setReason] = createSignal<DocumentAssetRecoveryReason>(null);
  const [checking, setChecking] = createSignal(false);
  let disposed = false;
  let pending: Promise<DocumentAssetCheckResult> | undefined;
  let controller: AbortController | undefined;

  const check = (): Promise<DocumentAssetCheckResult> => {
    if (disposed || !loaded) return Promise.resolve('unavailable');
    if (pending) return pending;
    const request = new AbortController();
    controller = request;
    const timeout = setTimeout(() => request.abort(), options.timeoutMs ?? 10_000);
    setChecking(true);
    pending = Promise.resolve().then(async (): Promise<DocumentAssetCheckResult> => {
      try {
        const response = await fetchDocument(url, {
          cache: 'no-store', redirect: 'error', signal: request.signal,
          headers: { Accept: 'text/html' },
        });
        if (!response.ok || response.redirected || !response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
          return 'unavailable';
        }
        const html = await response.text();
        if (disposed || request.signal.aborted) return 'unavailable';
        const next = entryModules(new DOMParser().parseFromString(html, 'text/html'), response.url || url);
        if (!next) return 'unavailable';
        if (next !== loaded) {
          setReason('updated');
          return 'updated';
        }
        return 'current';
      } catch {
        // Availability and authentication remain owned by the host connection.
        return 'unavailable';
      } finally {
        clearTimeout(timeout);
        controller = undefined;
        pending = undefined;
        if (!disposed) setChecking(false);
      }
    });
    return pending;
  };

  const onLoadFailure = () => {
    if (reason() !== 'updated') setReason('load-failed');
    void check();
    // Do not preventDefault: consumers' error boundaries must receive the rejection.
  };
  view.addEventListener('vite:preloadError', onLoadFailure);
  onCleanup(() => {
    disposed = true;
    controller?.abort();
    view.removeEventListener('vite:preloadError', onLoadFailure);
  });
  return { reason, checking, check };
}
