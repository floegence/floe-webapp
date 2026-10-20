import type { Marked } from 'marked';
import { createIncrementalMarkdownParser, type MarkdownUpdate } from './incremental';

export type MarkdownSessionRequest<Config = unknown> = Readonly<{
  type: 'markdown-session';
  request: number;
  session: number;
  sequence: number;
  operation: 'open' | 'reset' | 'append' | 'finish' | 'close';
  offset: number;
  text?: string;
  config?: Config;
}>;

export type MarkdownSessionResponse = Readonly<{
  type: 'markdown-session';
  request: number;
  session: number;
  sequence: number;
  update?: MarkdownUpdate;
  error?: string;
}>;

export interface MarkdownSessionLimits {
  /** Total parser sessions owned by this worker. */
  maxSessions: number;
  /** Original UTF-16 source units across all sessions; tokens use additional memory. */
  maxSourceLength: number;
}

/** Install this handler in a host worker to register the host's exact parser extensions. */
export function createMarkdownSessionHandler<Config>(
  createParser: (config: Config) => Marked<string, string>,
  limits: MarkdownSessionLimits = { maxSessions: 32, maxSourceLength: 8 * 1024 * 1024 },
) {
  if (!Number.isSafeInteger(limits.maxSessions) || limits.maxSessions <= 0 ||
      !Number.isSafeInteger(limits.maxSourceLength) || limits.maxSourceLength <= 0) {
    throw new Error('Markdown session limits must be positive integers');
  }
  const sessions = new Map<number, { parser: ReturnType<typeof createIncrementalMarkdownParser>; sequence: number; accountedLength: number }>();
  let sourceLength = 0;

  function release(id: number) {
    const session = sessions.get(id);
    if (session) sourceLength -= session.accountedLength;
    sessions.delete(id);
  }

  function handle(message: MarkdownSessionRequest<Config>): MarkdownSessionResponse {
    const response = { type: 'markdown-session' as const, request: message?.request ?? 0, session: message?.session ?? 0, sequence: message?.sequence ?? 0 };
    try {
      if (message?.type !== 'markdown-session' || !Number.isSafeInteger(message.request) || message.request < 1 ||
          !Number.isSafeInteger(message.session) || message.session < 1 || !Number.isSafeInteger(message.sequence) ||
          message.sequence < 0 || !Number.isSafeInteger(message.offset) || message.offset < 0) {
        throw new Error('Invalid Markdown session identity');
      }
      if (message.operation === 'open') {
        if (sessions.has(message.session) || message.sequence !== 0 || message.offset !== 0 || message.text !== undefined) {
          throw new Error('Invalid Markdown session admission');
        }
        if (sessions.size >= limits.maxSessions) throw new Error('Markdown session limit exceeded');
        const parser = createIncrementalMarkdownParser(createParser(message.config as Config));
        sessions.set(message.session, { parser, sequence: 0, accountedLength: 0 });
        return response;
      }
      const session = sessions.get(message.session);
      if (!session || message.sequence !== session.sequence + 1 || message.offset !== session.parser.sourceLength) {
        throw new Error('Markdown session continuity lost');
      }
      if (message.operation === 'close') {
        release(message.session);
        return response;
      }
      if (message.operation !== 'reset' && message.operation !== 'append' && message.operation !== 'finish') {
        throw new Error('Unknown Markdown session operation');
      }
      if (message.operation !== 'finish' && typeof message.text !== 'string') throw new Error('Markdown source is required');
      if (message.operation === 'finish' && message.text !== undefined) throw new Error('Markdown finish cannot append source');
      const previousLength = session.parser.sourceLength;
      const nextLength = message.operation === 'reset' ? message.text!.length : previousLength + (message.text?.length ?? 0);
      if (sourceLength - previousLength + nextLength > limits.maxSourceLength) throw new Error('Markdown source budget exceeded');
      const update = message.operation === 'reset' ? session.parser.reset(message.text!)
        : message.operation === 'append' ? session.parser.append(message.text!) : session.parser.finish();
      sourceLength += session.parser.sourceLength - previousLength;
      session.accountedLength = session.parser.sourceLength;
      session.sequence = message.sequence;
      return { ...response, update };
    } catch (error) {
      release(response.session);
      return { ...response, error: error instanceof Error ? error.message : 'Markdown session failed' };
    }
  }

  return { handle, close: () => { sessions.clear(); sourceLength = 0; }, diagnostics: () => ({ sessions: sessions.size, sourceLength }) };
}

export interface MarkdownWorkerSession {
  reset(text: string): Promise<MarkdownUpdate>;
  append(text: string): Promise<MarkdownUpdate>;
  finish(): Promise<MarkdownUpdate>;
  close(): void;
}

export interface MarkdownWorkerClientOptions {
  timeoutMs?: number;
  /** Includes queued source and configuration in the transport, not the worker heap. */
  maxPendingBytes?: number;
}

class MarkdownSessionError extends Error {}

/** Owns the supplied worker. Transport failure rejects all requests; parser errors release only their session. */
export function createMarkdownWorkerClient<Config = undefined>(worker: Worker, options: MarkdownWorkerClientOptions = {}) {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxPendingBytes = options.maxPendingBytes ?? 1024 * 1024;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isSafeInteger(maxPendingBytes) || maxPendingBytes <= 0) {
    throw new Error('Markdown worker budgets must be positive');
  }
  let requestID = 0;
  let sessionID = 0;
  let pendingBytes = 0;
  let closed: Error | undefined;
  const pending = new Map<number, {
    resolve: (message: MarkdownSessionResponse) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
    bytes: number;
    session: number;
    sequence: number;
  }>();

  function terminate(error = new Error('Markdown worker closed')) {
    if (closed) return;
    closed = error;
    worker.removeEventListener('message', receive);
    worker.removeEventListener('error', fail);
    worker.removeEventListener('messageerror', fail);
    worker.terminate();
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
    pendingBytes = 0;
  }

  function fail() { terminate(new Error('Markdown worker failed')); }

  function receive(event: MessageEvent<MarkdownSessionResponse>) {
    const message = event.data;
    if (message?.type !== 'markdown-session') return;
    const request = pending.get(message.request);
    if (!request) return;
    if (message.session !== request.session || message.sequence !== request.sequence) {
      terminate(new Error('Markdown worker response identity mismatch'));
      return;
    }
    pending.delete(message.request);
    pendingBytes -= request.bytes;
    clearTimeout(request.timer);
    if (message.error) request.reject(new MarkdownSessionError(message.error));
    else request.resolve(message);
  }

  worker.addEventListener('message', receive);
  worker.addEventListener('error', fail);
  worker.addEventListener('messageerror', fail);

  function send(message: Omit<MarkdownSessionRequest<Config>, 'type' | 'request'>) {
    if (closed) return Promise.reject(closed);
    let bytes: number;
    try { bytes = 256 + (message.text?.length ?? 0) * 2 + (JSON.stringify(message.config)?.length ?? 0) * 2; }
    catch { return Promise.reject(new Error('Markdown configuration must be serializable')); }
    if (bytes + pendingBytes > maxPendingBytes) return Promise.reject(new Error('Markdown worker pending budget exceeded'));
    const request = ++requestID;
    return new Promise<MarkdownSessionResponse>((resolve, reject) => {
      const timer = setTimeout(() => terminate(new Error('Markdown worker timed out')), timeoutMs);
      pending.set(request, { resolve, reject, timer, bytes, session: message.session, sequence: message.sequence });
      pendingBytes += bytes;
      try { worker.postMessage({ ...message, type: 'markdown-session', request }); }
      catch { terminate(new Error('Markdown worker request could not be sent')); }
    });
  }

  async function open(config: Config): Promise<MarkdownWorkerSession> {
    const session = ++sessionID;
    await send({ operation: 'open', session, sequence: 0, offset: 0, config });
    let sequence = 0;
    let length = 0;
    let sessionClosed = false;
    const run = (operation: 'reset' | 'append' | 'finish', text?: string) => {
      if (sessionClosed) return Promise.reject(new Error('Markdown session closed'));
      const offset = length;
      length = operation === 'reset' ? text!.length : length + (text?.length ?? 0);
      return send({ operation, session, sequence: ++sequence, offset, text }).then((response) => {
        if (!response.update) throw new Error('Markdown worker omitted its update');
        return response.update;
      }).catch((error: unknown) => {
        sessionClosed = true;
        // A rejected command can leave later queued offsets untrustworthy.
        if (!(error instanceof MarkdownSessionError)) {
          terminate(error instanceof Error ? error : new Error('Markdown session failed'));
        }
        throw error;
      });
    };
    return {
      reset: (text) => run('reset', text), append: (text) => run('append', text), finish: () => run('finish'),
      close() {
        if (sessionClosed) return;
        sessionClosed = true;
        void send({ operation: 'close', session, sequence: ++sequence, offset: length }).catch((error: unknown) => {
          if (!(error instanceof MarkdownSessionError)) {
            terminate(error instanceof Error ? error : new Error('Markdown close failed'));
          }
        });
      },
    };
  }

  return { open, close: () => terminate(), diagnostics: () => ({ pendingRequests: pending.size, pendingBytes, closed: !!closed }) };
}
