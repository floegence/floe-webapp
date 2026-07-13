import { describe, expect, it, vi } from 'vitest';

vi.mock('@floegence/flowersec-core/proxy', () => ({
  assertProxyRuntimeScopeV1: vi.fn(),
}));

describe('boot reconnect helpers', () => {
  it('creates a tunnel artifact reconnect config that delegates artifact loading', async () => {
    const artifactSource = {
      kind: 'factory' as const,
      getArtifact: vi.fn(async ({ traceId }: { traceId?: string }) => ({ v: 1, transport: 'tunnel', traceId })),
    };

    const mod = await import('../src/index');
    const config = mod.createArtifactTunnelReconnectConfig({
      artifactSource,
      connect: {
        keepaliveIntervalMs: 15_000,
        transportSecurityPolicy: 'require_tls',
      },
    });

    expect(config.mode).toBe('tunnel');
    expect(config.connect).toMatchObject({
      keepaliveIntervalMs: 15_000,
      transportSecurityPolicy: 'require_tls',
    });
    await expect(config.getArtifact?.({ traceId: 'trace-1' })).resolves.toMatchObject({
      v: 1,
      transport: 'tunnel',
      traceId: 'trace-1',
    });
    expect(artifactSource.getArtifact).toHaveBeenCalledWith({ traceId: 'trace-1' });
  });

  it('creates a proxy-runtime tunnel config that injects the shared bootstrap scope resolver', async () => {
    const artifactSource = {
      kind: 'entry_controlplane' as const,
      getArtifact: vi.fn(async () => ({ v: 1, transport: 'tunnel' })),
    };
    const customScopeResolver = vi.fn();

    const mod = await import('../src/index');
    const config = mod.createProxyRuntimeTunnelReconnectConfig({
      artifactSource,
      connect: {
        scopeResolvers: {
          custom: customScopeResolver,
        },
      },
    });

    expect(config.connect?.scopeResolvers).toMatchObject({
      custom: customScopeResolver,
      [mod.PROXY_RUNTIME_SCOPE_NAME]: mod.validateProxyRuntimeScopeEntry,
    });
  });

  it('creates a direct artifact reconnect config without proxy-runtime scope injection', async () => {
    const artifactSource = {
      kind: 'factory' as const,
      getArtifact: vi.fn(async () => ({ v: 1, transport: 'direct' })),
    };

    const mod = await import('../src/index');
    const config = mod.createArtifactDirectReconnectConfig({
      artifactSource,
      connect: {
        keepaliveIntervalMs: 10_000,
        transportSecurityPolicy: 'allow_plaintext_for_loopback',
      },
    });

    expect(config.mode).toBe('direct');
    expect(config.connect).toMatchObject({
      keepaliveIntervalMs: 10_000,
      transportSecurityPolicy: 'allow_plaintext_for_loopback',
    });
    expect(config.connect?.scopeResolvers).toBeUndefined();
  });

  it('rejects fixed artifact sources when autoReconnect is enabled by default', async () => {
    const mod = await import('../src/index');
    const artifactSource = mod.createFixedArtifactSource({ v: 1, transport: 'tunnel' } as never);

    expect(() =>
      mod.createArtifactTunnelReconnectConfig({
        artifactSource,
        autoReconnect: { enabled: true },
      }),
    ).toThrow(mod.FixedArtifactAutoReconnectError);
  });

  it('rejects direct fixed artifact sources when autoReconnect is enabled by default', async () => {
    const mod = await import('../src/index');
    const artifactSource = mod.createFixedArtifactSource({ v: 1, transport: 'direct' } as never);

    expect(() =>
      mod.createArtifactDirectReconnectConfig({
        artifactSource,
        autoReconnect: { enabled: true },
      }),
    ).toThrow(mod.FixedArtifactAutoReconnectError);
  });

  it('allows fixed artifact autoReconnect only with explicit opt-in', async () => {
    const mod = await import('../src/index');
    const artifactSource = mod.createFixedArtifactSource(
      { v: 1, transport: 'tunnel' } as never,
      { allowAutoReconnect: true },
    );

    const config = mod.createArtifactTunnelReconnectConfig({
      artifactSource,
      autoReconnect: { enabled: true },
    });

    expect(config.mode).toBe('tunnel');
    expect(config.autoReconnect).toMatchObject({ enabled: true });
  });

  it('allows direct fixed artifact autoReconnect only with explicit opt-in', async () => {
    const mod = await import('../src/index');
    const artifactSource = mod.createFixedArtifactSource(
      { v: 1, transport: 'direct' } as never,
      { allowAutoReconnect: true },
    );

    const config = mod.createArtifactDirectReconnectConfig({
      artifactSource,
      autoReconnect: { enabled: true },
    });

    expect(config.mode).toBe('direct');
    expect(config.autoReconnect).toMatchObject({ enabled: true });
  });

  it('keeps dynamic artifact sources compatible with enabled autoReconnect', async () => {
    const mod = await import('../src/index');
    const artifactSource = mod.createArtifactSourceFromFactory(async () => ({ v: 1, transport: 'direct' }) as never);

    const config = mod.createArtifactDirectReconnectConfig({
      artifactSource,
      autoReconnect: { enabled: true },
    });

    expect(config.mode).toBe('direct');
    expect(config.autoReconnect).toMatchObject({ enabled: true });
  });
});
