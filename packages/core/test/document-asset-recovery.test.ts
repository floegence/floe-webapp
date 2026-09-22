// @vitest-environment jsdom
import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDocumentAssetRecovery, type DocumentAssetRecovery } from '../src/app/createDocumentAssetRecovery';

const html = (version: string) => `<html><script type="module" src="/app/assets/index-${version}.js"></script><div id="root"></div></html>`;
const response = (version: string) => new Response(html(version), { headers: { 'content-type': 'text/html' } });

describe('document asset recovery', () => {
  let dispose = () => {};
  afterEach(() => { dispose(); document.head.innerHTML = ''; vi.useRealTimers(); });
  function setup(fetchDocument: typeof fetch, timeoutMs?: number) {
    document.head.innerHTML = '<script type="module" src="/app/assets/index-old.js"></script>';
    let recovery!: DocumentAssetRecovery;
    createRoot((cleanup) => {
      dispose = cleanup;
      recovery = createDocumentAssetRecovery({ url: '/app/', fetch: fetchDocument, timeoutMs });
    });
    return recovery;
  }

  it('compares with the loaded entry after reconnect and retains a detected update', async () => {
    const fetchDocument = vi.fn<typeof fetch>().mockResolvedValueOnce(response('old')).mockResolvedValueOnce(response('new')).mockResolvedValueOnce(response('new'));
    const recovery = setup(fetchDocument);
    expect(await recovery.check()).toBe('current');
    expect(recovery.reason()).toBeNull();
    expect(await recovery.check()).toBe('updated');
    expect(recovery.reason()).toBe('updated');
    expect(await recovery.check()).toBe('updated');
    expect(fetchDocument.mock.calls[0]?.[1]).toMatchObject({ cache: 'no-store', redirect: 'error', headers: { Accept: 'text/html' } });
    expect(document.querySelector('script')?.getAttribute('src')).toContain('index-old');
  });

  it('shares concurrent checks and does not change the document on import failure', async () => {
    let complete!: (value: Response) => void;
    const fetchDocument = vi.fn<typeof fetch>(() => new Promise((resolve) => { complete = resolve; }));
    const recovery = setup(fetchDocument);
    const first = recovery.check();
    expect(recovery.check()).toBe(first);
    const event = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(recovery.reason()).toBe('load-failed');
    await Promise.resolve();
    expect(fetchDocument).toHaveBeenCalledTimes(1);
    complete(response('old'));
    expect(await first).toBe('current');
    expect(recovery.reason()).toBe('load-failed');
    expect(recovery.checking()).toBe(false);
  });

  it.each([
    () => Promise.reject(new TypeError('Network unavailable')),
    () => { throw new TypeError('Synchronous fetch failure'); },
    () => Promise.resolve(new Response('offline', { status: 503 })),
    () => Promise.resolve(new Response('{}', { headers: { 'content-type': 'application/json' } })),
    () => Promise.resolve(new Response('<html>Sign in</html>', { headers: { 'content-type': 'text/html' } })),
  ])('does not mistake an unavailable entry for an update and permits a later check', async (failure) => {
    const fetchDocument = vi.fn<typeof fetch>().mockImplementationOnce(failure).mockResolvedValueOnce(response('new'));
    const recovery = setup(fetchDocument);
    expect(await recovery.check()).toBe('unavailable');
    expect(recovery.reason()).toBeNull();
    expect(await recovery.check()).toBe('updated');
  });

  it('aborts timed out reads without adding a retry loop', async () => {
    vi.useFakeTimers();
    const fetchDocument = vi.fn<typeof fetch>((_, init) => new Promise((_, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const recovery = setup(fetchDocument, 50);
    const result = recovery.check();
    await vi.advanceTimersByTimeAsync(50);
    expect(await result).toBe('unavailable');
    expect(recovery.checking()).toBe(false);
    expect(fetchDocument).toHaveBeenCalledTimes(1);
  });

  it('disposes listeners and prevents a late response from updating state', async () => {
    let complete!: (value: Response) => void;
    const fetchDocument = vi.fn<typeof fetch>(() => new Promise((resolve) => { complete = resolve; }));
    const recovery = setup(fetchDocument);
    const result = recovery.check();
    await Promise.resolve();
    dispose();
    expect(fetchDocument.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    complete(response('new'));
    expect(await result).toBe('unavailable');
    window.dispatchEvent(new Event('vite:preloadError'));
    expect(recovery.reason()).toBeNull();
    expect(fetchDocument).toHaveBeenCalledTimes(1);
  });
});
