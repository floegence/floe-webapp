import { describe, expect, it, vi } from 'vitest';
import { createMarkdownParser } from '../src/components/chat/markdown/parser';
import { createIncrementalMarkdownParser } from '../src/components/chat/markdown/incremental';
import { createMarkdownSessionHandler, createMarkdownWorkerClient, type MarkdownSessionRequest, type MarkdownSessionResponse } from '../src/components/chat/markdown/workerSession';

function createTestWorker() {
  const listeners = new Map<string, Set<EventListener>>();
  const handler = createMarkdownSessionHandler(() => createMarkdownParser());
  const worker = {
    addEventListener(type: string, listener: EventListener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type: string, listener: EventListener) { listeners.get(type)?.delete(listener); },
    postMessage: vi.fn((message: MarkdownSessionRequest) => {
      const response = handler.handle(structuredClone(message));
      queueMicrotask(() => { for (const listener of listeners.get('message') ?? []) listener({ data: response } as MessageEvent); });
    }),
    terminate: vi.fn(() => handler.close()),
  };
  return { worker: worker as unknown as Worker, raw: worker, handler, listeners };
}

describe('Markdown worker sessions', () => {
  it('matches the same parser for reset, append, references, CRLF, extensions and finish', () => {
    const parser = () => {
      const markdown = createMarkdownParser({ breaks: false });
      markdown.use({ extensions: [{ name: 'citation', level: 'inline',
        start: (source) => source.indexOf('🌸'),
        tokenizer: (source) => source.startsWith('🌸') ? { type: 'citation', raw: '🌸', text: 'citation' } : undefined,
        renderer: () => '<span>citation</span>',
      }] });
      return markdown;
    };
    const handler = createMarkdownSessionHandler(parser);
    const model = createIncrementalMarkdownParser(parser());
    let request = 1;
    let sequence = 0;
    let offset = 0;
    const call = (operation: MarkdownSessionRequest['operation'], text?: string) => {
      const result = handler.handle({ type: 'markdown-session', request: request++, session: 1, sequence, operation, offset, text });
      expect(result.error).toBeUndefined();
      sequence++;
      offset = operation === 'reset' ? text!.length : offset + (text?.length ?? 0);
      return result;
    };
    call('open');
    expect(call('reset', 'First [guide]\r').update).toEqual(model.reset('First [guide]\r'));
    for (const delta of ['\n\n🌸 **注意：**正文', '\n\n[guide]: /first\n\n', '~~~ts\n', '<script>世界</script>', '\n~~~\n']) {
      expect(call('append', delta).update).toEqual(model.append(delta));
    }
    expect(call('finish').update).toEqual(model.finish());
    expect(call('reset', 'Replacement').update).toEqual(model.reset('Replacement'));
    call('close');
    expect(handler.diagnostics()).toEqual({ sessions: 0, sourceLength: 0 });
  });

  it('fails closed and releases sessions on gaps, wrong offsets and source overflow', () => {
    const handler = createMarkdownSessionHandler(() => createMarkdownParser(), { maxSessions: 1, maxSourceLength: 8 });
    const base = { type: 'markdown-session' as const, request: 1, session: 1, sequence: 0, offset: 0 };
    const open = () => expect(handler.handle({ ...base, operation: 'open' }).error).toBeUndefined();
    open();
    expect(handler.handle({ ...base, session: 2, operation: 'open' }).error).toContain('limit');
    expect(handler.diagnostics().sessions).toBe(1);
    expect(handler.handle({ ...base, sequence: 2, operation: 'append', text: 'a' }).error).toContain('continuity');
    expect(handler.diagnostics().sessions).toBe(0);
    open();
    expect(handler.handle({ ...base, sequence: 1, operation: 'reset', text: '12345678' }).error).toBeUndefined();
    expect(handler.handle({ ...base, sequence: 2, offset: 8, operation: 'append', text: '9' }).error).toContain('budget');
    expect(handler.diagnostics()).toEqual({ sessions: 0, sourceLength: 0 });
    open();
    expect(handler.handle({ ...base, sequence: 1, offset: 1, operation: 'finish' }).error).toContain('continuity');
    expect(handler.diagnostics().sessions).toBe(0);
  });

  it('retains only source length on the client and releases pending state on disposal', async () => {
    const fixture = createTestWorker();
    const client = createMarkdownWorkerClient(fixture.worker);
    const session = await client.open(undefined);
    await session.reset('Hello');
    await session.append(' 世界🌸');
    expect((await session.finish()).sourceLength).toBe('Hello 世界🌸'.length);
    expect(client.diagnostics().pendingBytes).toBe(0);
    session.close();
    await Promise.resolve();
    expect(fixture.handler.diagnostics().sessions).toBe(0);
    client.close();
    expect(fixture.raw.terminate).toHaveBeenCalledOnce();
    expect([...fixture.listeners.values()].every((listeners) => listeners.size === 0)).toBe(true);
    await expect(session.append('late')).rejects.toThrow('closed');
  });

  it('rejects pending work on timeout, worker failure, post failure and malformed identity', async () => {
    vi.useFakeTimers();
    try {
      for (const failure of ['timeout', 'error', 'messageerror', 'post', 'identity']) {
        const fixture = createTestWorker();
        fixture.raw.postMessage.mockImplementation((message) => {
          if (failure === 'post') throw new Error('uncloneable');
          if (failure === 'identity') {
            const response: MarkdownSessionResponse = { type: 'markdown-session', request: message.request, session: 999, sequence: 0 };
            queueMicrotask(() => { for (const listener of fixture.listeners.get('message') ?? []) listener({ data: response } as MessageEvent); });
          }
        });
        const client = createMarkdownWorkerClient(fixture.worker, { timeoutMs: 10 });
        const result = client.open(undefined);
        const rejected = expect(result).rejects.toThrow();
        if (failure === 'error' || failure === 'messageerror') for (const listener of fixture.listeners.get(failure) ?? []) listener({} as Event);
        await vi.advanceTimersByTimeAsync(10);
        await rejected;
        expect(client.diagnostics()).toEqual({ pendingRequests: 0, pendingBytes: 0, closed: true });
        expect(fixture.raw.terminate).toHaveBeenCalledOnce();
      }
    } finally { vi.useRealTimers(); }
  });

  it('bounds queued source and frees the parser after overflow', async () => {
    const fixture = createTestWorker();
    const client = createMarkdownWorkerClient(fixture.worker, { maxPendingBytes: 512 });
    const session = await client.open(undefined);
    await expect(session.reset('x'.repeat(512))).rejects.toThrow('budget');
    expect(fixture.handler.diagnostics()).toEqual({ sessions: 0, sourceLength: 0 });
    expect(client.diagnostics().pendingRequests).toBe(0);
  });

  it('rejects malformed requests and restores source accounting after a parser failure', () => {
    const handler = createMarkdownSessionHandler(() => {
      const parser = createMarkdownParser();
      parser.use({ extensions: [{ name: 'explode', level: 'inline', start: source => source.indexOf('💥'),
        tokenizer: source => { if (source.startsWith('💥')) throw new Error('parser failed'); return undefined; },
      }] });
      return parser;
    }, { maxSessions: 2, maxSourceLength: 100 });
    expect(handler.handle(null as unknown as MarkdownSessionRequest).error).toContain('identity');
    const base = { type: 'markdown-session' as const, request: 1, session: 1, sequence: 0, offset: 0 };
    handler.handle({ ...base, operation: 'open' });
    handler.handle({ ...base, sequence: 1, operation: 'reset', text: 'retained' });
    expect(handler.handle({ ...base, sequence: 2, offset: 8, operation: 'append', text: ' 💥' }).error).toContain('parser failed');
    expect(handler.diagnostics()).toEqual({ sessions: 0, sourceLength: 0 });
    handler.handle({ ...base, session: 2, operation: 'open' });
    expect(handler.handle({ ...base, session: 2, sequence: 1, operation: 'reset', text: 'x'.repeat(100) }).error).toBeUndefined();
  });

  it('keeps other sessions available after a source-budget parser rejection', async () => {
    const fixture = createTestWorker();
    const client = createMarkdownWorkerClient(fixture.worker, { maxPendingBytes: 20 * 1024 * 1024 });
    const first = await client.open(undefined);
    const second = await client.open(undefined);
    await second.reset('Other window');
    await expect(first.reset('x'.repeat(8 * 1024 * 1024 + 1))).rejects.toThrow('source budget');
    expect(fixture.handler.diagnostics()).toEqual({ sessions: 1, sourceLength: 12 });
    expect((await second.append(' remains available')).sourceLength).toBe(30);
    await expect(first.append('late')).rejects.toThrow('closed');
    second.close();
    await Promise.resolve();
    client.close();
  });
});
