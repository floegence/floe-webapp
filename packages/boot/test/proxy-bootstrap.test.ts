import { describe, expect, it, vi } from 'vitest';

const runtimes: Array<{ dispose: ReturnType<typeof vi.fn>; fetch: ReturnType<typeof vi.fn> }> = [];

vi.mock('@floegence/flowersec-core', () => ({
  parseArtifact: (value: string | Uint8Array) => ({ value }),
  createArtifactLease: (_artifact: unknown, commitSpend: (signal?: AbortSignal) => Promise<void>) => ({ commitSpend }),
}));

vi.mock('@floegence/flowersec-core/proxy', () => ({
  assertProxyRuntimeScope: (payload: unknown) => payload,
  PROXY_RUNTIME_SCOPE: { name: 'proxy.runtime', version: 2 },
  createProxyRuntime: vi.fn(() => {
    const runtime = { dispose: vi.fn(), fetch: vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('ok')) };
    runtimes.push(runtime);
    return runtime;
  }),
}));

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

async function digest(value: string): Promise<string> {
  const result = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return encodeBase64Url(new Uint8Array(result));
}

async function validEnvelope(): Promise<Record<string, unknown>> {
  const artifact = 'opaque';
  const projection = JSON.stringify({
    scope: 'proxy.runtime',
    scope_version: 2,
    critical: true,
    payload: {
      mode: 'service_worker',
      appBasePath: '/app',
      serviceWorker: { scriptUrl: '/proxy-sw.js', scope: '/' },
    },
  });
  return {
    v: 1,
    connect_artifact: artifact,
    critical_scope_projection_json: projection,
    spend_scope: {
      v: 1,
      receipt: `r1.k.${encodeBase64Url(new Uint8Array(32).fill(3))}`,
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

const session = {
  rpc: {},
  close: vi.fn(async () => {}),
  waitTermination: vi.fn(async () => ({ error: { code: 'closed' } })),
};

describe('proxy bootstrap ownership', () => {
  it('derives runtime limits from projection and disposes every replaced generation', async () => {
    runtimes.length = 0;
    const acquisition = await import('../src/acquisition');
    const mod = await import('../src/index');
    const source = { acquire: async () => ({ kind: 'failure', code: 'unused', disposition: { kind: 'terminal' } }) } as never;
    acquisition.registerAcquisitionSource(source);
    const lease = await acquisition.materializeAcquisitionForSource(source, await validEnvelope(), {
      expectedConsumer: 'trusted',
      commitSpend: vi.fn(async () => {}),
      validateSpendBinding: () => 'binding',
    });
    const state = acquisition.synchronizeAcquisitionSourceSnapshot(source, { state: 'connecting', attempt: 1 });
    expect(state).toBeNull();
    const sourceState = acquisition.synchronizeAcquisitionSourceSnapshot;
    await (lease as unknown as { commitSpend(): Promise<void> }).commitSpend();
    const connected = acquisition.synchronizeAcquisitionSourceSnapshot(source, { state: 'connected', attempt: 1, currentSession: session as never });
    expect(connected).toBeDefined();
    const disposedBinding = vi.fn();
    const owner = mod.createProxyBootstrapOwner({
      serviceWorker: ({ runtime, scriptUrl, serviceWorkerScope, appBasePath }) => {
        expect(runtime).toBeDefined();
        expect(scriptUrl).toBe('/proxy-sw.js');
        expect(serviceWorkerScope).toBe('/');
        expect(appBasePath).toBe('/app');
        return { dispose: disposedBinding };
      },
    });
    const first = mod.synchronizeProxyBootstrap(owner, connected);
    expect(first).toMatchObject({ generation: 1, mode: 'service_worker', bindingIdentity: 'binding' });
    mod.synchronizeProxyBootstrap(owner, null);
    expect(disposedBinding).toHaveBeenCalledOnce();
    expect(runtimes[0]?.dispose).toHaveBeenCalledOnce();
    expect(sourceState).toBeDefined();
  });
});


it('uses one session HTTP runtime across direct HTTP, TLS, private bridge and remote configurations', async () => {
  const acquisition = await import('../src/acquisition');
  const boot = await import('../src/index');
  for (const mode of ['http', 'tls', 'private', 'remote']) {
    runtimes.length = 0;
    const source = { acquire: vi.fn() } as never;
    acquisition.registerAcquisitionSource(source);
    const lease = await acquisition.materializeAcquisitionForSource(source, await validEnvelope(), {
      expectedConsumer: 'trusted', commitSpend: vi.fn(async () => {}), validateSpendBinding: () => 'binding',
    });
    await (lease as unknown as { commitSpend(): Promise<void> }).commitSpend();
    const bootstrap = boot.createProxyBootstrapOwner({ serviceWorker: () => ({ dispose() {} }) });
    const config = mode === 'http' ? boot.createHTTPDirectConnectionConfig({ source, httpDirect: { origin: 'http://localhost:1234' } })
      : mode === 'private' ? boot.createPrivateLoopbackDirectConnectionConfig({ source, privateLoopback: { origin: 'http://localhost:1234' } })
      : mode === 'remote' ? boot.createProxyRuntimeTunnelConnectionConfig({ source, proxyBootstrap: bootstrap })
      : boot.createArtifactDirectConnectionConfig({ source });
    try {
      await expect(config.lifecycle.fetch('/app/events')).rejects.toThrow(/unavailable/);
      const snapshot = { state: 'connected', attempt: 1, currentSession: session } as never;
      config.lifecycle.synchronize(snapshot);
      config.lifecycle.synchronize(snapshot);
      expect(runtimes).toHaveLength(1);
      expect(await (await config.lifecycle.fetch('/app/api')).text()).toBe('ok');
      config.lifecycle.synchronize({ state: 'waiting', attempt: 1 } as never);
      expect(runtimes[0]!.dispose).toHaveBeenCalledOnce();
      await expect(config.lifecycle.fetch('/app/events')).rejects.toThrow(/unavailable/);
    } finally { config.lifecycle.dispose(); }
  }
});

it('fences already parsed events when the acquisition changes without adding a reconnect loop', async () => {
  const acquisition = await import('../src/acquisition');
  const boot = await import('../src/index');
  const source = { acquire: vi.fn() } as never;
  acquisition.registerAcquisitionSource(source);
  const lease = await acquisition.materializeAcquisitionForSource(source, await validEnvelope(), {
    expectedConsumer: 'trusted', commitSpend: vi.fn(async () => {}), validateSpendBinding: () => 'binding',
  });
  await (lease as unknown as { commitSpend(): Promise<void> }).commitSpend();
  const lifecycle = boot.createArtifactDirectConnectionConfig({ source }).lifecycle;
  lifecycle.synchronize({ state: 'connected', attempt: 1, currentSession: session as never });
  const runtime = runtimes.at(-1)!;
  runtime.fetch.mockImplementation(async (_input: unknown, init?: RequestInit) => {
    expect(new Headers(init?.headers).get('accept')).toBe('text/event-stream');
    return new Response('data: first\n\ndata: stale\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  });
  const iterator = lifecycle.events('/app/events');
  expect(await iterator.next()).toMatchObject({ value: { data: 'first' } });
  lifecycle.synchronize({ state: 'waiting', attempt: 1 } as never);
  await expect(iterator.next()).rejects.toThrow(/unavailable|replaced/);
  expect(runtime.fetch).toHaveBeenCalledOnce();
  lifecycle.dispose();
});
