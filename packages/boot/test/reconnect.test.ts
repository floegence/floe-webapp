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
      connect: { keepaliveIntervalMs: 15_000 },
    });

    expect(config.mode).toBe('tunnel');
    expect(config.connect).toMatchObject({ keepaliveIntervalMs: 15_000 });
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
      connect: { keepaliveIntervalMs: 10_000 },
    });

    expect(config.mode).toBe('direct');
    expect(config.connect).toMatchObject({ keepaliveIntervalMs: 10_000 });
    expect(config.connect?.scopeResolvers).toBeUndefined();
  });
});
