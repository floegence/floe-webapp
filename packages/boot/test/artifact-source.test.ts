import { describe, expect, it, vi } from 'vitest';

it('materializes a native isolated handoff without a browser location or consumer downgrade', async () => {
  const { createIsolatedControlplaneArtifactSource } = await import('../src/artifact-source');
  const projection = JSON.stringify({
    scope: 'proxy.runtime',
    scope_version: 2,
    critical: true,
    payload: {
      mode: 'controller_bridge',
      appBasePath: '/',
      controllerBridge: { allowedOrigins: ['https://app.example.com'] },
    },
  });
  const body = await envelope('{}', projection);
  (body.spend_scope as Record<string, unknown>).consumer = 'isolated';
  const isolatedContext = {
    envPublicId: 'env_demo',
    floeApp: 'code',
    codeSpaceId: 'space',
    appPath: '/',
    launcherKind: 'cs' as const,
    launcherId: 'space',
    launcherOrigin: 'https://launcher.example.com',
    validateTargetBinding: vi.fn((_binding: unknown) => undefined),
  };
  const response = () => ({
    v: 6,
    runtime_origin: 'https://runtime.example.com',
    runtime_handoff_b64u: encodeBase64Url(
      new TextEncoder().encode(
        JSON.stringify({
          v: 6,
          env_public_id: 'env_demo',
          floe_app: 'code',
          code_space_id: 'space',
          app_path: '/',
          launcher_kind: 'cs',
          launcher_id: 'space',
          launcher_origin: isolatedContext.launcherOrigin,
          runtime_origin: 'https://runtime.example.com',
          app_origin: 'https://app.example.com',
          acquisition: body,
        })
      )
    ),
  });
  const source = createIsolatedControlplaneArtifactSource({
    baseUrl: isolatedContext.launcherOrigin,
    endpointId: 'env_demo',
    entryTicket: 'entry',
    isolatedContext,
    fetch: vi.fn(async () => new Response(JSON.stringify(response()))),
    commitSpend: vi.fn(async () => undefined),
    validateSpendBinding: (binding) => {
      expect(binding.consumer).toBe('isolated');
    },
  });
  expect((await source.acquire({ signal: new AbortController().signal })).kind).toBe('lease');
  isolatedContext.validateTargetBinding.mockImplementationOnce(() => {
    throw new Error('wrong resource');
  });
  expect(await source.acquire({ signal: new AbortController().signal })).toMatchObject({
    kind: 'failure',
    code: 'artifact_invalid',
    disposition: { kind: 'terminal' },
  });
  (body.spend_scope as Record<string, unknown>).consumer = 'trusted';
  expect((await source.acquire({ signal: new AbortController().signal })).kind).toBe('failure');
});

const leases: Array<{ artifact: unknown; commitSpend: (signal?: AbortSignal) => Promise<void> }> =
  [];
const privateLeases: Array<{
  artifact: unknown;
  commitSpend: (signal?: AbortSignal) => Promise<void>;
}> = [];

vi.mock('@floegence/flowersec-core', () => ({
  parseArtifact: (value: string | Uint8Array) => ({ value }),
  createArtifactLease: (
    artifact: unknown,
    commitSpend: (signal?: AbortSignal) => Promise<void>
  ) => {
    const lease = { artifact, commitSpend };
    leases.push(lease);
    return lease;
  },
}));

vi.mock('@floegence/flowersec-core/proxy', () => ({
  assertProxyRuntimeScope: (payload: unknown) => payload,
  PROXY_RUNTIME_SCOPE: { name: 'proxy.runtime', version: 2 },
}));

vi.mock('@floegence/flowersec-core/browser', () => ({
  validatePrivateLoopbackOriginV1: (raw: string) => {
    const url = new URL(raw);
    if (url.protocol !== 'http:' || !/^(?:127(?:\.[0-9]{1,3}){3}|\[::1\])$/u.test(url.hostname)) {
      throw new Error('invalid private loopback origin');
    }
    return url.origin;
  },
  parseHTTPDirectArtifactV1: (value: string | Uint8Array) => ({ httpValue: value }),
  createHTTPDirectArtifactLeaseV1: (
    artifact: unknown,
    commitSpend: (signal?: AbortSignal) => Promise<void>
  ) => ({ artifact, commitSpend }),
  parsePrivateLoopbackArtifactV1: (value: string | Uint8Array) => ({ privateValue: value }),
  createPrivateLoopbackArtifactLeaseV1: (
    artifact: unknown,
    commitSpend: (signal?: AbortSignal) => Promise<void>
  ) => {
    const lease = { artifact, commitSpend };
    privateLeases.push(lease);
    return lease;
  },
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

async function envelope(
  artifact = '{}',
  projection = JSON.stringify({
    scope: 'proxy.runtime',
    scope_version: 2,
    critical: true,
    payload: {
      mode: 'controller_bridge',
      controllerBridge: { allowedOrigins: ['https://app.example.com'] },
    },
  })
): Promise<Record<string, unknown>> {
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
  it('verifies acquisition integrity and spends once without SubtleCrypto', async () => {
    const mod = await import('../src/index');
    const body = await envelope();
    const commitSpend = vi.fn(async () => {});
    const source = mod.createControlplaneArtifactSource({
      baseUrl: 'https://cp.example.com',
      endpointId: 'demo',
      fetch: vi.fn(async () => new Response(JSON.stringify(body))),
      commitSpend,
      validateSpendBinding: () => 'http-binding',
    });
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    vi.stubGlobal('crypto', { getRandomValues });
    try {
      const result = await source.acquire({ signal: new AbortController().signal });
      expect(result.kind).toBe('lease');
      const lease = leases.at(-1)!;
      await lease.commitSpend();
      expect(commitSpend).toHaveBeenCalledOnce();
      await expect(lease.commitSpend()).rejects.toMatchObject({ code: 'spend_binding_consumed' });
      body.connect_artifact = '{"tampered":true}';
      expect(await source.acquire({ signal: new AbortController().signal })).toMatchObject({
        kind: 'failure',
        disposition: { kind: 'terminal' },
      });
      expect(commitSpend).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('uses explicit HTTP acquisition with independent spends and connected state', async () => {
    const mod = await import('../src/index');
    const body = await envelope();
    const spend = vi.fn(async () => {});
    const fetch = vi.fn(async () => new Response(JSON.stringify(body)));
    const options = {
      baseUrl: 'http://192.168.1.20:23998',
      endpointId: 'runtime',
      fetch,
      commitSpend: spend,
      validateSpendBinding: () => 'http-binding',
    };
    const first = mod.createHTTPDirectControlplaneArtifactSource(options);
    const second = mod.createHTTPDirectControlplaneArtifactSource(options);
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    vi.stubGlobal('crypto', { getRandomValues });
    try {
      const results = [];
      // Keep mocked dynamic module imports sequential; real parallel connections run in the release consumer smoke.
      for (const source of [first, second])
        results.push(await source.acquire({ signal: new AbortController().signal }));
      expect(results).toEqual([
        expect.objectContaining({ kind: 'lease' }),
        expect.objectContaining({ kind: 'lease' }),
      ]);
      for (const result of results) {
        if (result.kind !== 'lease') throw new Error('Expected lease');
        await (result.lease as unknown as { commitSpend: () => Promise<void> }).commitSpend();
      }
      expect(spend).toHaveBeenCalledTimes(2);
      expect(spend.mock.calls[0]?.[0]).not.toEqual(spend.mock.calls[1]?.[0]);
      const config = mod.createHTTPDirectConnectionConfig({
        source: second,
        httpDirect: { origin: options.baseUrl },
      });
      mod.clearAcquisitionSource(first);
      expect(() =>
        config.lifecycle.synchronize({
          state: 'connected',
          attempt: 1,
          currentSession: {} as never,
        })
      ).not.toThrow();
      config.lifecycle.dispose();
      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.1.20:23998/v1/connect/artifact',
        expect.objectContaining({ redirect: 'error', credentials: 'omit' })
      );
      body.critical_scope_projection_json = '{}';
      expect(await second.acquire({ signal: new AbortController().signal })).toMatchObject({
        kind: 'failure',
        code: 'artifact_invalid',
        disposition: { kind: 'terminal' },
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([
    'https://192.168.1.20:23998',
    'http://user:secret@192.168.1.20:23998',
    'http://192.168.1.20:23998/',
    'http://192.168.1.20:23998/path',
    'http://192.168.1.20:23998?token=secret',
  ])('rejects a non-origin HTTP acquisition URL %s', async (baseUrl) => {
    const mod = await import('../src/index');
    expect(() =>
      mod.createHTTPDirectControlplaneArtifactSource({
        baseUrl,
        endpointId: 'runtime',
        commitSpend: vi.fn(),
        validateSpendBinding: vi.fn(),
      })
    ).toThrow(expect.objectContaining({ code: 'transport_policy_denied' }));
  });

  it.each([
    ['https://cp.example.com', 'https://cp.example.com/v1/connect/artifact'],
    ['https://cp.example.com/', 'https://cp.example.com/v1/connect/artifact'],
    ['https://cp.example.com/control/', 'https://cp.example.com/control/v1/connect/artifact'],
  ])(
    'keeps artifact requests on the configured control-plane origin for %s',
    async (baseUrl, expectedUrl) => {
      const mod = await import('../src/index');
      const fetch = vi.fn(
        async () => new Response(JSON.stringify(await envelope()), { status: 200 })
      );
      const source = mod.createControlplaneArtifactSource({
        baseUrl,
        endpointId: 'demo',
        fetch,
        commitSpend: vi.fn(async () => {}),
        validateSpendBinding: () => 'binding-origin',
      });

      await source.acquire({ signal: new AbortController().signal });

      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch.mock.calls[0]?.[0]).toBe(expectedUrl);
    }
  );

  it('commits an exact opaque artifact spend before the connector can consume it', async () => {
    leases.length = 0;
    const mod = await import('../src/index');
    const commitSpend = vi.fn(async () => {});
    const validateSpendBinding = vi.fn(() => 'binding-1');
    const fetch = vi.fn(
      async () => new Response(JSON.stringify(await envelope()), { status: 200 })
    );
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
    expect(validateSpendBinding).toHaveBeenCalledWith(
      expect.objectContaining({ consumer: 'trusted' })
    );
    const lease = leases[0];
    expect(lease).toBeDefined();
    await lease!.commitSpend();
    expect(commitSpend).toHaveBeenCalledOnce();
    expect(commitSpend.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        attemptId: expect.any(String),
        receipt: expect.stringMatching(/^r1\./u),
        artifactDigestB64u: expect.any(String),
      })
    );
    await expect(lease!.commitSpend()).rejects.toMatchObject({ code: 'spend_binding_consumed' });
  });

  it('materializes a private-loopback Lease through the same spend and acquisition state', async () => {
    privateLeases.length = 0;
    const mod = await import('../src/index');
    const commitSpend = vi.fn(async () => {});
    const source = await mod.createPrivateLoopbackControlplaneArtifactSource({
      baseUrl: 'http://127.0.0.1:43123',
      endpointId: 'desktop-private',
      fetch: vi.fn(async () => new Response(JSON.stringify(await envelope()), { status: 200 })),
      commitSpend,
      validateSpendBinding: () => 'private-binding',
    });

    const result = await source.acquire({ signal: new AbortController().signal });
    expect(result.kind).toBe('lease');
    expect(privateLeases).toHaveLength(1);
    await privateLeases[0]!.commitSpend();
    expect(commitSpend).toHaveBeenCalledOnce();
    expect(() =>
      mod.synchronizeAcquisitionSourceSnapshot(source, {
        state: 'connected',
        attempt: 1,
        currentSession: {} as never,
      })
    ).not.toThrow();
  });

  it.each([
    'http://localhost:43123',
    'http://127.0.0.1',
    'http://127.0.0.1:80',
    'http://127.0.0.2:43123',
    'https://127.0.0.1:43123',
    'http://127.0.0.1:43123/path',
    'http://127.0.0.1:43123/?query=1',
  ])('rejects non-private source origin %s', async (baseUrl) => {
    const mod = await import('../src/index');
    expect(() =>
      mod.createPrivateLoopbackControlplaneArtifactSource({
        baseUrl,
        endpointId: 'desktop-private',
        commitSpend: vi.fn(async () => {}),
        validateSpendBinding: vi.fn(),
      })
    ).toThrow(expect.objectContaining({ code: 'transport_policy_denied' }));
  });

  it('burns the spend binding and removes the pending acquisition when durability fails', async () => {
    leases.length = 0;
    const mod = await import('../src/index');
    const commitSpend = vi.fn(async () => {
      throw new Error('durability failed');
    });
    const fetch = vi.fn(
      async () => new Response(JSON.stringify(await envelope()), { status: 200 })
    );
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
    expect(() =>
      mod.synchronizeAcquisitionSourceSnapshot(source, {
        state: 'connected',
        attempt: 1,
        currentSession: {} as never,
      })
    ).toThrow(/connected_acquisition_mismatch/u);
  });

  it('rejects digest-bound object artifacts and malformed projections', async () => {
    const mod = await import('../src/index');
    const options = {
      baseUrl: 'https://cp.example.com',
      endpointId: 'demo',
      commitSpend: vi.fn(async () => {}),
      validateSpendBinding: vi.fn(),
    };
    const objectFetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ ...(await envelope()), connect_artifact: {} }), {
          status: 200,
        })
    );
    const objectSource = mod.createControlplaneArtifactSource({ ...options, fetch: objectFetch });
    await expect(
      objectSource.acquire({ signal: new AbortController().signal })
    ).resolves.toMatchObject({ kind: 'failure', code: 'artifact_invalid' });

    const invalidProjection = JSON.stringify({
      scope: 'proxy.runtime',
      scope_version: 1,
      critical: true,
      payload: {},
    });
    const badFetch = vi.fn(
      async () =>
        new Response(JSON.stringify(await envelope('{}', invalidProjection)), { status: 200 })
    );
    const badSource = mod.createControlplaneArtifactSource({ ...options, fetch: badFetch });
    await expect(
      badSource.acquire({ signal: new AbortController().signal })
    ).resolves.toMatchObject({ kind: 'failure', code: 'artifact_invalid' });
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
      code: 'artifact_invalid',
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
    await expect(
      invalidIdentitySource.acquire({ signal: new AbortController().signal })
    ).resolves.toMatchObject({
      kind: 'failure',
      code: 'artifact_invalid',
      disposition: { kind: 'terminal' },
    });
  });

  it('classifies HTTP policy and Retry-After without exposing response bodies', async () => {
    const mod = await import('../src/index');
    expect(mod.classifyControlplaneFailure({ status: 401, code: 'unauthorized' })).toEqual({
      code: 'unauthorized',
      disposition: { kind: 'terminal' },
    });
    expect(
      mod.classifyControlplaneFailure({ status: 503, code: 'temporarily_unavailable' })
    ).toEqual({ code: 'temporarily_unavailable', disposition: { kind: 'retryable' } });
    expect(
      mod.classifyControlplaneFailure({
        status: 429,
        code: 'rate_limited',
        retryAfter: '5',
        nowUnixMilliseconds: 1_000,
      })
    ).toEqual({
      code: 'rate_limited',
      disposition: { kind: 'retry_after', notBeforeUnixMilliseconds: 6_000 },
    });
    expect(mod.classifyControlplaneFailure({ status: 500, code: 'Bad Code' })).toEqual({
      code: 'invalid_error_code',
      disposition: { kind: 'terminal' },
    });
  });

  it('denies loopback HTTP unless explicitly enabled and requires spend hooks', async () => {
    const mod = await import('../src/index');
    const base = {
      endpointId: 'demo',
      commitSpend: vi.fn(async () => {}),
      validateSpendBinding: vi.fn(),
    };
    expect(() =>
      mod.createControlplaneArtifactSource({ ...base, baseUrl: 'http://127.0.0.1:8787' })
    ).toThrow(/transport_policy_denied/u);
    expect(() =>
      mod.createControlplaneArtifactSource({
        baseUrl: 'https://cp.example.com',
        endpointId: 'demo',
      } as never)
    ).toThrow(/commitSpend is required/u);
  });
});
