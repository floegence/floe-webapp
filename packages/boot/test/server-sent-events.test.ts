import { describe, expect, it, vi } from 'vitest';
import {
  ServerSentEventStreamError,
  fetchServerSentEvents,
} from '../src/server-sent-events';

const encoder = new TextEncoder();

function responseFromChunks(
  chunks: readonly (string | Uint8Array)[],
  onCancel?: () => void,
  close = true
): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
      }
      if (close) controller.close();
    },
    cancel() {
      onCancel?.();
    },
  }), {
    status: 200,
    headers: { 'content-type': 'text/event-stream; charset=utf-8' },
  });
}

async function collect(stream: AsyncIterable<unknown>): Promise<unknown[]> {
  const values: unknown[] = [];
  for await (const value of stream) values.push(value);
  return values;
}

describe('fetchServerSentEvents', () => {
  it('decodes fragmented UTF-8, CRLF boundaries, multiline data, id, event, and retry', async () => {
    const unicode = encoder.encode('data: \u4f60\u597d\r\n');
    const fetch = vi.fn(async () => responseFromChunks([
      'event: thread.batch\r',
      '\n',
      'id: cursor-7\r\n',
      'retry: 2500\r\n',
      unicode.slice(0, unicode.length - 2),
      unicode.slice(unicode.length - 2),
      'data: second line\r\n\r',
      '\n',
    ]));

    await expect(collect(fetchServerSentEvents('/stream', {
      fetch,
      headers: { authorization: 'Bearer test' },
    }))).resolves.toEqual([{
      event: 'thread.batch',
      id: 'cursor-7',
      retry: 2500,
      data: '\u4f60\u597d\nsecond line',
    }]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/stream', expect.objectContaining({
      headers: { authorization: 'Bearer test' },
    }));
  });

  it('treats comments as activity without yielding heartbeat events', async () => {
    const onActivity = vi.fn();
    const values = await collect(fetchServerSentEvents('/stream', {
      fetch: async () => responseFromChunks([': heartbeat\n\ndata: ready\n\n']),
      onActivity,
    }));

    expect(values).toEqual([{ data: 'ready' }]);
    expect(onActivity).toHaveBeenCalled();
  });

  it('rejects unexpected status and unsupported content type with typed errors', async () => {
    await expect(collect(fetchServerSentEvents('/stream', {
      fetch: async () => new Response('busy', { status: 429, headers: { 'retry-after': '3' } }),
    }))).rejects.toMatchObject({
      name: 'ServerSentEventStreamError',
      code: 'unexpected_status',
      status: 429,
      retryAfter: '3',
    });

    await expect(collect(fetchServerSentEvents('/stream', {
      fetch: async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    }))).rejects.toMatchObject({
      name: 'ServerSentEventStreamError',
      code: 'unsupported_content_type',
    });
  });

  it('classifies fetch failures and malformed UTF-8', async () => {
    await expect(collect(fetchServerSentEvents('/stream', {
      fetch: async () => { throw new Error('offline'); },
    }))).rejects.toMatchObject({ code: 'transport' });

    await expect(collect(fetchServerSentEvents('/stream', {
      fetch: async () => responseFromChunks([new Uint8Array([0x64, 0x61, 0x74, 0x61, 0x3a, 0x20, 0xc3, 0x28])]),
    }))).rejects.toMatchObject({ code: 'malformed_frame' });
  });

  it('enforces frame and pending-buffer byte limits', async () => {
    await expect(collect(fetchServerSentEvents('/stream', {
      fetch: async () => responseFromChunks(['data: 12345\n\n']),
      maxFrameBytes: 8,
    }))).rejects.toMatchObject({ code: 'oversized_frame' });

    await expect(collect(fetchServerSentEvents('/stream', {
      fetch: async () => responseFromChunks(['data: 12345']),
      maxBufferBytes: 8,
    }))).rejects.toMatchObject({ code: 'oversized_buffer' });

    await expect(collect(fetchServerSentEvents('/stream', {
      fetch: async () => responseFromChunks(['data: 1\n\ndata: 2\n\n']),
      maxBufferBytes: 8,
    }))).resolves.toEqual([{ data: '1' }, { data: '2' }]);
  });

  it('releases and cancels the response reader when iteration stops early', async () => {
    const onCancel = vi.fn();
    const stream = fetchServerSentEvents('/stream', {
      fetch: async () => responseFromChunks(['data: first\n\ndata: second\n\n'], onCancel, false),
    });

    for await (const value of stream) {
      expect(value).toEqual({ data: 'first' });
      break;
    }
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('exports a stable typed error class', () => {
    const error = new ServerSentEventStreamError('transport', 'failed');
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('transport');
  });
});
