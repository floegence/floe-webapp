import {
  createArtifactLease,
  parseArtifact,
  type ArtifactSource,
  type JsonObject,
} from '@floegence/flowersec-core';

export type ControlplaneArtifactSourceOptions = Readonly<{
  baseUrl: string;
  endpointId: string;
  payload?: JsonObject;
  correlation?: Readonly<{ traceId?: string }>;
  entryTicket?: string;
  allowLoopbackHTTP?: boolean;
  fetch?: typeof globalThis.fetch;
}>;

export class ControlplaneRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ControlplaneRequestError';
    this.status = status;
    this.code = code;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost' || normalized === '::1' || normalized === '127.0.0.1' || normalized.startsWith('127.');
}

function resolveBaseUrl(value: string, allowLoopbackHTTP: boolean): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(allowLoopbackHTTP && url.protocol === 'http:' && isLoopbackHostname(url.hostname))) {
    throw new ControlplaneRequestError(0, 'transport_policy_denied', 'controlplane transport policy denied');
  }
  url.pathname = url.pathname.replace(/\/+$/u, '');
  return url;
}

function artifactEndpoint(baseUrl: URL, entryTicket?: string): string {
  const suffix = entryTicket === undefined ? '/v1/connect/artifact' : '/v1/connect/artifact/entry';
  return new URL(`${baseUrl.pathname}${suffix}`, baseUrl).toString();
}

function asArtifactEnvelope(value: unknown): string {
  if (!value || typeof value !== 'object' || !('connect_artifact' in value)) {
    throw new ControlplaneRequestError(200, 'invalid_request', 'Invalid controlplane response: missing `connect_artifact`');
  }
  return JSON.stringify((value as { connect_artifact: unknown }).connect_artifact);
}

export function createControlplaneArtifactSource(options: ControlplaneArtifactSourceOptions): ArtifactSource {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl, options.allowLoopbackHTTP === true);
  const endpoint = artifactEndpoint(baseUrl, options.entryTicket);

  return {
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
            ...(options.entryTicket === undefined ? {} : { authorization: `Bearer ${options.entryTicket}` }),
          },
          body: JSON.stringify(body),
          credentials: 'omit',
          redirect: 'error',
          signal,
        });
        if (!response.ok) {
          let code = 'request_failed';
          try {
            const errorBody = (await response.json()) as { error?: { code?: string } };
            code = errorBody.error?.code ?? code;
          } catch {
            // Preserve the stable HTTP status when the response is not JSON.
          }
          throw new ControlplaneRequestError(response.status, code, `controlplane request failed: ${response.status}`);
        }
        const artifact = parseArtifact(asArtifactEnvelope(await response.json()));
        return {
          kind: 'lease' as const,
          lease: createArtifactLease(artifact, async () => undefined),
        };
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        if (error instanceof ControlplaneRequestError) {
          return { kind: 'failure' as const, code: error.code, disposition: { kind: 'retryable' as const } };
        }
        throw error;
      }
    },
  };
}
