export type ServerSentEventStreamErrorCode =
  | 'transport'
  | 'unexpected_status'
  | 'unsupported_content_type'
  | 'malformed_frame'
  | 'oversized_frame'
  | 'oversized_buffer';

export class ServerSentEventStreamError extends Error {
  readonly code: ServerSentEventStreamErrorCode;
  readonly status?: number;
  readonly retryAfter?: string;

  constructor(
    code: ServerSentEventStreamErrorCode,
    message: string,
    options: ErrorOptions & Readonly<{ status?: number; retryAfter?: string }> = {}
  ) {
    super(message, options);
    this.name = 'ServerSentEventStreamError';
    this.code = code;
    if (options.status !== undefined) this.status = options.status;
    if (options.retryAfter !== undefined) this.retryAfter = options.retryAfter;
  }
}

export type ServerSentEvent = Readonly<{
  data: string;
  event?: string;
  id?: string;
  retry?: number;
}>;

export type FetchServerSentEventsOptions = Omit<RequestInit, 'signal'> & Readonly<{
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
  maxFrameBytes?: number;
  maxBufferBytes?: number;
  onActivity?: () => void;
}>;

const DEFAULT_MAX_FRAME_BYTES = 1024 * 1024;
const DEFAULT_MAX_BUFFER_BYTES = 2 * 1024 * 1024;

function positiveLimit(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError('server-sent event byte limits must be positive safe integers');
  }
  return value;
}

function eventStreamContentType(response: Response): boolean {
  return response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
    === 'text/event-stream';
}

async function cancelResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // The response is already unusable; cancellation remains best effort.
  }
}

export async function* fetchServerSentEvents(
  input: RequestInfo | URL,
  options: FetchServerSentEventsOptions = {}
): AsyncGenerator<ServerSentEvent, void, undefined> {
  const {
    fetch: fetchImplementation = globalThis.fetch,
    maxFrameBytes: rawMaxFrameBytes,
    maxBufferBytes: rawMaxBufferBytes,
    onActivity,
    signal,
    ...requestInit
  } = options;
  const maxFrameBytes = positiveLimit(rawMaxFrameBytes, DEFAULT_MAX_FRAME_BYTES);
  const maxBufferBytes = positiveLimit(rawMaxBufferBytes, DEFAULT_MAX_BUFFER_BYTES);

  let response: Response;
  try {
    response = await fetchImplementation(input, { ...requestInit, signal });
  } catch (cause) {
    throw new ServerSentEventStreamError('transport', 'failed to open server-sent event stream', { cause });
  }
  if (!response.ok) {
    const retryAfter = response.headers.get('retry-after') ?? undefined;
    await cancelResponseBody(response);
    throw new ServerSentEventStreamError(
      'unexpected_status',
      `server-sent event request returned HTTP ${response.status}`,
      { status: response.status, retryAfter }
    );
  }
  if (!eventStreamContentType(response)) {
    await cancelResponseBody(response);
    throw new ServerSentEventStreamError(
      'unsupported_content_type',
      'server-sent event response must use text/event-stream'
    );
  }
  if (response.body === null) {
    throw new ServerSentEventStreamError('malformed_frame', 'server-sent event response has no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const byteEncoder = new TextEncoder();
  let buffer = '';
  let frameBytes = 0;
  let dataLines: string[] = [];
  let eventName: string | undefined;
  let eventID: string | undefined;
  let retry: number | undefined;
  let sawData = false;
  let completed = false;

  const resetFrame = () => {
    frameBytes = 0;
    dataLines = [];
    eventName = undefined;
    retry = undefined;
    sawData = false;
  };
  const consumeLine = (line: string, newlineBytes: number): ServerSentEvent | undefined => {
    frameBytes += byteEncoder.encode(line).byteLength + newlineBytes;
    if (frameBytes > maxFrameBytes) {
      throw new ServerSentEventStreamError('oversized_frame', 'server-sent event frame exceeds its byte limit');
    }
    if (line === '') {
      if (!sawData) {
        resetFrame();
        return undefined;
      }
      const event: ServerSentEvent = {
        data: dataLines.join('\n'),
        ...(eventName === undefined ? {} : { event: eventName }),
        ...(eventID === undefined ? {} : { id: eventID }),
        ...(retry === undefined ? {} : { retry }),
      };
      resetFrame();
      return event;
    }
    if (line.startsWith(':')) {
      onActivity?.();
      return undefined;
    }
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    switch (field) {
      case 'data':
        sawData = true;
        dataLines.push(value);
        break;
      case 'event':
        eventName = value;
        break;
      case 'id':
        if (!value.includes('\0')) eventID = value;
        break;
      case 'retry':
        if (/^[0-9]+$/u.test(value)) {
          const parsed = Number(value);
          if (Number.isSafeInteger(parsed)) retry = parsed;
        }
        break;
      default:
        break;
    }
    return undefined;
  };

  try {
    while (true) {
      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await reader.read();
      } catch (cause) {
        throw new ServerSentEventStreamError('transport', 'failed while reading server-sent event stream', { cause });
      }
      if (result.value !== undefined) {
        onActivity?.();
        try {
          buffer += decoder.decode(result.value, { stream: !result.done });
        } catch (cause) {
          throw new ServerSentEventStreamError('malformed_frame', 'server-sent event stream is not valid UTF-8', { cause });
        }
      } else if (result.done) {
        try {
          buffer += decoder.decode();
        } catch (cause) {
          throw new ServerSentEventStreamError('malformed_frame', 'server-sent event stream ends with invalid UTF-8', { cause });
        }
      }
      let offset = 0;
      while (offset < buffer.length) {
        const lf = buffer.indexOf('\n', offset);
        const cr = buffer.indexOf('\r', offset);
        let end = -1;
        if (lf >= 0 && cr >= 0) end = Math.min(lf, cr);
        else end = Math.max(lf, cr);
        if (end < 0) break;
        if (buffer[end] === '\r' && end + 1 === buffer.length && !result.done) break;
        const newlineBytes = buffer[end] === '\r' && buffer[end + 1] === '\n' ? 2 : 1;
        const event = consumeLine(buffer.slice(offset, end), newlineBytes);
        offset = end + newlineBytes;
        if (event !== undefined) yield event;
      }
      buffer = buffer.slice(offset);
      if (byteEncoder.encode(buffer).byteLength > maxBufferBytes) {
        throw new ServerSentEventStreamError('oversized_buffer', 'server-sent event pending buffer exceeds its byte limit');
      }
      if (result.done) {
        completed = true;
        return;
      }
    }
  } finally {
    if (!completed) {
      try {
        await reader.cancel();
      } catch {
        // Reader cleanup must not mask the stream result.
      }
    }
    reader.releaseLock();
  }
}
