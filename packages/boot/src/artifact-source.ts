import type {
  ArtifactLease,
  ArtifactSource,
  JsonObject,
  RetryDisposition,
} from '@floegence/flowersec-core';
import type {
  PrivateLoopbackArtifactLeaseV1,
  PrivateLoopbackArtifactSourceV1,
} from '@floegence/flowersec-core/browser';
import {
  AcquisitionError,
  materializeAcquisitionForSource,
  materializePrivateLoopbackAcquisitionForSource,
  registerAcquisitionSource,
  type CommitSpend,
  type ValidateSpendBinding,
} from './acquisition';

const BUSINESS_CODE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/u;

export type ControlplaneArtifactSourceOptions = Readonly<{
  baseUrl: string;
  endpointId: string;
  payload?: JsonObject;
  correlation?: Readonly<{ traceId?: string }>;
  entryTicket?: string;
  allowLoopbackHTTP?: boolean;
  fetch?: typeof globalThis.fetch;
  commitSpend: CommitSpend;
  validateSpendBinding: ValidateSpendBinding;
  retryableBusinessCodes?: readonly string[];
}>;

export type PrivateLoopbackControlplaneArtifactSourceOptions = Omit<
  ControlplaneArtifactSourceOptions,
  'allowLoopbackHTTP' | 'entryTicket'
>;

export class ControlplaneRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string
  ) {
    super(`Floe controlplane request failed (code=${code})`);
    this.name = 'ControlplaneRequestError';
  }
}

export type ControlplaneFailureInput = Readonly<{
  status: number;
  code: string;
  retryAfter?: string | null;
  retryableBusinessCodes?: readonly string[];
  nowUnixMilliseconds?: number;
}>;

export type ClassifiedControlplaneFailure = Readonly<{
  code: string;
  disposition: RetryDisposition;
}>;

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '::1' ||
    normalized === '127.0.0.1' ||
    normalized.startsWith('127.')
  );
}

function resolveBaseUrl(value: string, allowLoopbackHTTP: boolean): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ControlplaneRequestError(0, 'transport_policy_denied');
  }
  if (
    url.protocol !== 'https:' &&
    !(allowLoopbackHTTP && url.protocol === 'http:' && isLoopbackHostname(url.hostname))
  ) {
    throw new ControlplaneRequestError(0, 'transport_policy_denied');
  }
  url.pathname = url.pathname.replace(/\/+$/u, '');
  return url;
}

function artifactEndpoint(baseUrl: URL, entryTicket?: string): string {
  const suffix = entryTicket === undefined ? '/v1/connect/artifact' : '/v1/connect/artifact/entry';
  return new URL(`${baseUrl.pathname}${suffix}`, baseUrl).toString();
}

export function classifyControlplaneFailure(
  input: ControlplaneFailureInput
): ClassifiedControlplaneFailure {
  if (!BUSINESS_CODE_PATTERN.test(input.code)) {
    return Object.freeze({
      code: 'invalid_error_code',
      disposition: Object.freeze({ kind: 'terminal' }),
    });
  }
  const retryableCodes = new Set(input.retryableBusinessCodes ?? []);
  if (retryableCodes.has(input.code)) {
    return Object.freeze({ code: input.code, disposition: Object.freeze({ kind: 'retryable' }) });
  }
  if (input.status === 429) {
    const notBefore = parseRetryAfter(input.retryAfter, input.nowUnixMilliseconds ?? Date.now());
    return Object.freeze({
      code: input.code,
      disposition:
        notBefore === undefined
          ? Object.freeze({ kind: 'retryable' })
          : Object.freeze({ kind: 'retry_after', notBeforeUnixMilliseconds: notBefore }),
    });
  }
  if (input.status === 408 || input.status === 425 || input.status >= 500) {
    return Object.freeze({ code: input.code, disposition: Object.freeze({ kind: 'retryable' }) });
  }
  return Object.freeze({ code: input.code, disposition: Object.freeze({ kind: 'terminal' }) });
}

export function createControlplaneArtifactSource(
  options: ControlplaneArtifactSourceOptions
): ArtifactSource {
  const source = createControlplaneSource<ArtifactLease>(options, materializeAcquisitionForSource);
  registerAcquisitionSource(source);
  return source;
}

export function createPrivateLoopbackControlplaneArtifactSource(
  options: PrivateLoopbackControlplaneArtifactSourceOptions
): PrivateLoopbackArtifactSourceV1 {
  const candidate = privateLoopbackBaseURL(options.baseUrl);
  const source = createControlplaneSource<PrivateLoopbackArtifactLeaseV1>(
    { ...options, baseUrl: candidate.origin, allowLoopbackHTTP: true },
    materializePrivateLoopbackAcquisitionForSource
  );
  registerAcquisitionSource(source);
  return source;
}

type ArtifactSourceResultFor<Lease> =
  | Readonly<{
      kind: 'lease';
      lease: Lease;
    }>
  | Readonly<{
      kind: 'failure';
      code: string;
      disposition: RetryDisposition;
    }>;

type ArtifactSourceFor<Lease> = Readonly<{
  acquire(options: Readonly<{ signal: AbortSignal }>): Promise<ArtifactSourceResultFor<Lease>>;
}>;

function createControlplaneSource<Lease>(
  options: ControlplaneArtifactSourceOptions,
  materialize: (
    source: ArtifactSourceFor<Lease>,
    value: unknown,
    options: Readonly<{
      commitSpend: CommitSpend;
      validateSpendBinding: ValidateSpendBinding;
      expectedConsumer: 'trusted';
    }>
  ) => Promise<Lease>
): ArtifactSourceFor<Lease> {
  if (typeof options.commitSpend !== 'function') throw new TypeError('commitSpend is required');
  if (typeof options.validateSpendBinding !== 'function')
    throw new TypeError('validateSpendBinding is required');
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch is required');
  const baseUrl = resolveBaseUrl(options.baseUrl, options.allowLoopbackHTTP === true);
  const endpoint = artifactEndpoint(baseUrl, options.entryTicket);

  const source: ArtifactSourceFor<Lease> = {
    acquire: async ({ signal }) => {
      try {
        const body: Record<string, unknown> = {
          endpoint_id: options.endpointId,
          ...(options.payload === undefined ? {} : { payload: options.payload }),
          ...(options.entryTicket === undefined && options.correlation !== undefined
            ? { correlation: { trace_id: options.correlation.traceId } }
            : {}),
        };
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            ...(options.entryTicket === undefined
              ? {}
              : { authorization: `Bearer ${options.entryTicket}` }),
          },
          body: JSON.stringify(body),
          credentials: 'omit',
          redirect: 'error',
          signal,
        });
        if (!response.ok) {
          const code = await responseErrorCode(response);
          const failure = classifyControlplaneFailure({
            status: response.status,
            code,
            retryAfter: response.headers.get('retry-after'),
            retryableBusinessCodes: options.retryableBusinessCodes,
          });
          return { kind: 'failure' as const, ...failure };
        }
        let envelope: unknown;
        try {
          envelope = (await response.json()) as unknown;
        } catch {
          return terminalFailure('invalid_controlplane_response');
        }
        const lease = await materialize(source, envelope, {
          commitSpend: options.commitSpend,
          validateSpendBinding: (binding) => {
            try {
              return options.validateSpendBinding(binding);
            } catch {
              throw new AcquisitionError('invalid_spend_binding');
            }
          },
          expectedConsumer: 'trusted',
        });
        return Object.freeze({ kind: 'lease' as const, lease });
      } catch (error) {
        if (signal.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        if (error instanceof AcquisitionError) return terminalFailure(error.code);
        if (error instanceof ControlplaneRequestError) return terminalFailure(error.code);
        return Object.freeze({
          kind: 'failure' as const,
          code: 'network_error',
          disposition: Object.freeze({ kind: 'retryable' as const }),
        });
      }
    },
  };
  return source;
}

function privateLoopbackBaseURL(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ControlplaneRequestError(0, 'transport_policy_denied');
  }
  if (
    value !== url.origin ||
    url.protocol !== 'http:' ||
    url.username !== '' ||
    url.password !== '' ||
    !privateLoopbackPort(url.port) ||
    !numericLoopbackHostname(url.hostname)
  ) {
    throw new ControlplaneRequestError(0, 'transport_policy_denied');
  }
  return url;
}

function privateLoopbackPort(value: string): boolean {
  if (!/^[1-9][0-9]*$/u.test(value)) return false;
  const port = Number(value);
  return Number.isSafeInteger(port) && port >= 1024 && port <= 65_535;
}

function numericLoopbackHostname(value: string): boolean {
  return value === '127.0.0.1' || value === '[::1]';
}

async function responseErrorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as unknown;
    if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
      const error = (body as Record<string, unknown>).error;
      if (error !== null && typeof error === 'object' && !Array.isArray(error)) {
        const code = (error as Record<string, unknown>).code;
        if (typeof code === 'string') return code;
      }
    }
  } catch {
    // The status remains authoritative when the body is not valid JSON.
  }
  return 'request_failed';
}

function parseRetryAfter(value: string | null | undefined, now: number): number | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/u.test(trimmed)) {
    const seconds = Number(trimmed);
    if (!Number.isSafeInteger(seconds)) return undefined;
    const result = now + seconds * 1_000;
    return Number.isSafeInteger(result) && result > now ? result : undefined;
  }
  const parsed = Date.parse(trimmed);
  return Number.isSafeInteger(parsed) && parsed > now ? parsed : undefined;
}

function terminalFailure(
  code: string
): ClassifiedControlplaneFailure & Readonly<{ kind: 'failure' }> {
  return Object.freeze({
    kind: 'failure',
    code: BUSINESS_CODE_PATTERN.test(code) ? code : 'invalid_error_code',
    disposition: Object.freeze({ kind: 'terminal' }),
  });
}
