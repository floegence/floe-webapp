import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureMarkdownWorker, hasMarkdownWorker, renderMarkdown, terminateMarkdownWorker, waitForMarkdownWorker } from '../src/components/chat/hooks/useMarkdown';

function fixture() {
  const raw = {
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as (() => void) | null,
    onmessageerror: null as (() => void) | null,
    terminate: vi.fn(),
    postMessage: vi.fn(),
  };
  return { raw, worker: raw as unknown as Worker, receive: (data: unknown) => raw.onmessage?.({ data } as MessageEvent) };
}

afterEach(() => { terminateMarkdownWorker(); vi.useRealTimers(); });

describe('Markdown full-result worker lifecycle', () => {
  it('rejects initialization waiters on replacement and ignores obsolete messages', async () => {
    const first = fixture();
    const initialized = configureMarkdownWorker(first.worker);
    const obsoleteReceive = first.raw.onmessage;
    const waiting = waitForMarkdownWorker();
    const rendering = renderMarkdown('Waiting for initialization');
    const results = [initialized, waiting, rendering].map(result => expect(result).rejects.toThrow('replaced'));
    const second = fixture();
    const ready = configureMarkdownWorker(second.worker);
    obsoleteReceive?.({ data: { type: 'ready' } } as MessageEvent);
    second.receive({ type: 'ready' });
    await ready;
    await Promise.all(results);
    expect(first.raw.terminate).toHaveBeenCalledOnce();
    expect(await waitForMarkdownWorker()).toBe(true);
  });

  it('settles all pending calls and removes handlers on every terminal path', async () => {
    vi.useFakeTimers();
    for (const failure of ['close', 'error', 'messageerror', 'post', 'malformed', 'timeout']) {
      const current = fixture();
      const ready = configureMarkdownWorker(current.worker);
      current.receive({ type: 'ready' });
      await ready;
      if (failure === 'post') current.raw.postMessage.mockImplementation(() => { throw new Error('clone'); });
      const rejected = expect(renderMarkdown('Uncached ' + failure)).rejects.toThrow();
      await Promise.resolve();
      if (failure === 'close') terminateMarkdownWorker();
      if (failure === 'error') current.raw.onerror?.();
      if (failure === 'messageerror') current.raw.onmessageerror?.();
      if (failure === 'malformed') current.receive(null);
      if (failure === 'timeout') await vi.advanceTimersByTimeAsync(15_000);
      await rejected;
      expect(current.raw.terminate).toHaveBeenCalledOnce();
      expect(current.raw.onmessage).toBeNull();
      expect(current.raw.onerror).toBeNull();
      expect(current.raw.onmessageerror).toBeNull();
      expect(hasMarkdownWorker()).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    }
  });

  it('times out initialization without synchronously parsing waiting source', async () => {
    vi.useFakeTimers();
    const current = fixture();
    const ready = expect(configureMarkdownWorker(current.worker)).rejects.toThrow('initialization timed out');
    const rendering = expect(renderMarkdown('Waiting source')).rejects.toThrow('initialization timed out');
    await vi.advanceTimersByTimeAsync(15_000);
    await Promise.all([ready, rendering]);
    expect(current.raw.postMessage).not.toHaveBeenCalled();
    expect(current.raw.terminate).toHaveBeenCalledOnce();
  });

  it('preserves explicit large full-result requests, isolates parse errors and caches empty results', async () => {
    const current = fixture();
    const ready = configureMarkdownWorker(current.worker);
    current.receive({ type: 'ready' });
    await ready;
    const source = 'x'.repeat(1024 * 1024);
    const result = renderMarkdown(source);
    await Promise.resolve();
    const request = current.raw.postMessage.mock.calls[0]![0] as { id: string; content: string };
    expect(request.content).toBe(source);
    current.receive({ id: request.id, html: '' });
    expect(await result).toBe('');
    expect(await renderMarkdown(source)).toBe('');
    expect(current.raw.postMessage).toHaveBeenCalledOnce();
    const rejected = expect(renderMarkdown('bad source')).rejects.toThrow('parse failed');
    await Promise.resolve();
    const next = current.raw.postMessage.mock.calls[1]![0] as { id: string };
    current.receive({ id: next.id, html: '', error: 'parse failed' });
    await rejected;
    expect(hasMarkdownWorker()).toBe(true);
  });
});
