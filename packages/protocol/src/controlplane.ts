import { parseArtifact, type Artifact, type JsonObject } from '@floegence/flowersec-core';

export type RequestConnectArtifactInput = Readonly<{
  baseUrl: string;
  endpointId: string;
  payload?: JsonObject;
  correlation?: Readonly<{ traceId?: string }>;
  fetch?: typeof globalThis.fetch;
}>;

export type RequestEntryConnectArtifactInput = RequestConnectArtifactInput & Readonly<{ entryTicket: string }>;

export class ControlplaneRequestError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'ControlplaneRequestError';
  }
}

async function request(input: RequestConnectArtifactInput | RequestEntryConnectArtifactInput): Promise<Artifact> {
  const fetchImpl = input.fetch ?? globalThis.fetch;
  const base = new URL(input.baseUrl);
  if (base.protocol !== 'https:') throw new ControlplaneRequestError(0, 'transport_policy_denied', 'controlplane transport policy denied');
  const isEntry = 'entryTicket' in input;
  const endpoint = new URL(`/v1/connect/artifact${isEntry ? '/entry' : ''}`, base).toString();
  const body = {
    endpoint_id: input.endpointId,
    ...(input.payload === undefined ? {} : { payload: input.payload }),
    ...(!isEntry && input.correlation === undefined ? {} : !isEntry ? { correlation: { trace_id: input.correlation?.traceId } } : {}),
  };
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(!isEntry ? {} : { authorization: `Bearer ${(input as RequestEntryConnectArtifactInput).entryTicket}` }),
    },
    body: JSON.stringify(body),
    credentials: 'omit',
    redirect: 'error',
  });
  if (!response.ok) throw new ControlplaneRequestError(response.status, 'request_failed', `controlplane request failed: ${response.status}`);
  const value = await response.json() as { connect_artifact?: unknown };
  if (value.connect_artifact === undefined) {
    throw new ControlplaneRequestError(200, 'invalid_request', 'Invalid controlplane response: missing `connect_artifact`');
  }
  const encoded = typeof value.connect_artifact === 'string' || value.connect_artifact instanceof Uint8Array
    ? value.connect_artifact
    : JSON.stringify(value.connect_artifact);
  return parseArtifact(encoded);
}

export function requestConnectArtifact(input: RequestConnectArtifactInput): Promise<Artifact> {
  return request(input);
}

export function requestEntryConnectArtifact(input: RequestEntryConnectArtifactInput): Promise<Artifact> {
  return request(input);
}
