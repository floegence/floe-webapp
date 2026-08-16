import { describe, expect, it, vi } from 'vitest';

const leases: Array<{ artifact: unknown; commitSpend: (signal?: AbortSignal) => Promise<void> }> = [];

vi.mock('@floegence/flowersec-core', () => ({
  parseArtifact: (value: string | Uint8Array) => ({ value }),
  createArtifactLease: (artifact: unknown, commitSpend: (signal?: AbortSignal) => Promise<void>) => {
    const lease = { artifact, commitSpend };
    leases.push(lease);
    return lease;
  },
}));

vi.mock('@floegence/flowersec-core/proxy', () => ({
  assertProxyRuntimeScope: (payload: unknown) => payload,
  PROXY_RUNTIME_SCOPE: { name: 'proxy.runtime', version: 2 },
}));

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const result = await crypto.subtle.digest('SHA-256', bytes);
  return encodeBase64Url(new Uint8Array(result));
}

async function envelope(artifact = '{}', projection = JSON.stringify({
  scope: 'proxy.runtime',
  scope_version: 2,
  critical: true,
  payload: { mode: 'controller_bridge', controllerBridge: { allowedOrigins: ['https://app.example.com'] } },
})): Promise<Record<string, unknown>> {
  const receipt = `r1.k.${encodeBase64Url(new Uint8Array(32).fill(7))}`;
  return {
    v: 1,
    connect_artifact: artifact,
    critical_scope_projection_json: projection,
    spend_scope: {
      v: 1,
      receipt,
      artifact_digest_b64u: await digest(artifact),
      projection_digest_b64u: await digest(projection),
      launcher_origin: 'https://launcher.example.com',
      runtime_origin: 'https://runtime.example.com',
      app_origin: 'https://app.example.com',
      consumer: 'trusted',
      target_binding: { env_public_id: 'env_demo' },
      expires_at: '2099-01-01T00:00:00Z',
    },
  };
}

describe('boot artifact source', () => {
  it('commits an exact opaque artifact spend before the connector can consume it', async () => {
    leases.length = 0;
    const mod = await import('../src/index');
    const commitSpend = vi.fn(async () => {});
    const validateSpendBinding = vi.fn(() => 'binding-1');
    const fetch = vi.fn(async () => new Response(JSON.stringify(await envelope()), { status: 200 }));
    const source = mod.createControlplaneArtifactSource({
      baseUrl: 'https://cp.example.com',
      endpointId: 'demo',
      fetch,
      commitSpend,
      validateSpendBinding,
    });

    const result = await source.acquire({ signal: new AbortController().signal });
    expect(result.kind).toBe('lease');
    expect(fetch).toHaveBeenCalledOnce();
    expect(validateSpendBinding).toHaveBeenCalledWith(expect.objectContaining({ consumer: 'trusted' }));
    const lease = leases[0];
    expect(lease).toBeDefined();
    await lease!.commitSpend();
    expect(commitSpend).toHaveBeenCalledOnce();
    expect(commitSpend.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      attemptId: expect.any(String),
      receipt: expect.stringMatching(/^r1\./u),
      artifactDigestB64u: expect.any(String),
    }));
    await expect(lease!.commitSpend()).rejects.toMatchObject({ code: 'spend_binding_consumed' });
  });

  it('burns the spend binding and removes the pending acquisition when durability fails', async () => {
    leases.length = 0;
    const mod = await import('../src/index');
    const commitSpend = vi.fn(async () => {
      throw new Error('durability failed');
    });
    const fetch = vi.fn(async () => new Response(JSON.stringify(await envelope()), { status: 200 }));
    const source = mod.createControlplaneArtifactSource({
      baseUrl: 'https://cp.example.com',
      endpointId: 'demo',
      fetch,
      commitSpend,
      validateSpendBinding: () => 'binding-failed',
    });

    await source.acquire({ signal: new AbortController().signal });
    const lease = leases[0];
    expect(lease).toBeDefined();
    await expect(lease!.commitSpend()).rejects.toThrow('durability failed');
    await expect(lease!.commitSpend()).rejects.toMatchObject({ code: 'spend_binding_consumed' });
    expect(commitSpend).toHaveBeenCalledOnce();
    expect(() => mod.synchronizeAcquisitionSourceSnapshot(
      source,
      { state: 'connected', attempt: 1, currentSession: {} as never },
    )).toThrow(/connected_acquisition_mismatch/u);
  });

  it('rejects digest-bound object artifacts and malformed projections', async () => {
    const mod = await import('../src/index');
    const options = {
      baseUrl: 'https://cp.example.com',
      endpointId: 'demo',
      commitSpend: vi.fn(async () => {}),
      validateSpendBinding: vi.fn(),
    };
    const objectFetch = vi.fn(async () => new Response(JSON.stringify({ ...(await envelope()), connect_artifact: {} }), { status: 200 }));
    const objectSource = mod.createControlplaneArtifactSource({ ...options, fetch: objectFetch });
    await expect(objectSource.acquire({ signal: new AbortController().signal })).resolves.toMatchObject({ kind: 'failure', code: 'invalid_acquisition_envelope' });

    const invalidProjection = JSON.stringify({ scope: 'proxy.runtime', scope_version: 1, critical: true, payload: {} });
    const badFetch = vi.fn(async () => new Response(JSON.stringify(await envelope('{}', invalidProjection)), { status: 200 }));
    const badSource = mod.createControlplaneArtifactSource({ ...options, fetch: badFetch });
    await expect(badSource.acquire({ signal: new AbortController().signal })).resolves.toMatchObject({ kind: 'failure', code: 'invalid_critical_scope_projection' });
  });

  it('treats host spend-binding rejection as a terminal acquisition failure', async () => {
    leases.length = 0;
    const mod = await import('../src/index');
    const source = mod.createControlplaneArtifactSource({
      baseUrl: 'https://cp.example.com',
      endpointId: 'demo',
      fetch: vi.fn(async () => new Response(JSON.stringify(await envelope()), { status: 200 })),
      commitSpend: vi.fn(async () => {}),
      validateSpendBinding: () => {
        throw new Error('host binding details must not escape');
      },
    });

    await expect(source.acquire({ signal: new AbortController().signal })).resolves.toEqual({
      kind: 'failure',
      code: 'invalid_spend_binding',
      disposition: { kind: 'terminal' },
    });
    expect(leases).toHaveLength(0);

    const invalidIdentitySource = mod.createControlplaneArtifactSource({
      baseUrl: 'https://cp.example.com',
      endpointId: 'demo',
      fetch: vi.fn(async () => new Response(JSON.stringify(await envelope()), { status: 200 })),
      commitSpend: vi.fn(async () => {}),
      validateSpendBinding: () => 1 as never,
    });
    await expect(invalidIdentitySource.acquire({ signal: new AbortController().signal })).resolves.toMatchObject({
      kind: 'failure',
      code: 'invalid_spend_binding_identity',
      disposition: { kind: 'terminal' },
    });
  });

  it('classifies HTTP policy and Retry-After without exposing response bodies', async () => {
    const mod = await import('../src/index');
    expect(mod.classifyControlplaneFailure({ status: 401, code: 'unauthorized' })).toEqual({ code: 'unauthorized', disposition: { kind: 'terminal' } });
    expect(mod.classifyControlplaneFailure({ status: 503, code: 'temporarily_unavailable' })).toEqual({ code: 'temporarily_unavailable', disposition: { kind: 'retryable' } });
    expect(mod.classifyControlplaneFailure({ status: 429, code: 'rate_limited', retryAfter: '5', nowUnixMilliseconds: 1_000 })).toEqual({
      code: 'rate_limited',
      disposition: { kind: 'retry_after', notBeforeUnixMilliseconds: 6_000 },
    });
    expect(mod.classifyControlplaneFailure({ status: 500, code: 'Bad Code' })).toEqual({ code: 'invalid_error_code', disposition: { kind: 'terminal' } });
  });

  it('denies loopback HTTP unless explicitly enabled and requires spend hooks', async () => {
    const mod = await import('../src/index');
    const base = {
      endpointId: 'demo',
      commitSpend: vi.fn(async () => {}),
      validateSpendBinding: vi.fn(),
    };
    expect(() => mod.createControlplaneArtifactSource({ ...base, baseUrl: 'http://127.0.0.1:8787' })).toThrow(/transport_policy_denied/u);
    expect(() => mod.createControlplaneArtifactSource({ baseUrl: 'https://cp.example.com', endpointId: 'demo' } as never)).toThrow(/commitSpend is required/u);
  });
});
