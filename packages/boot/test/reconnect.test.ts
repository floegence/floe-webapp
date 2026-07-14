import { createBrowserReconnectConfig } from '@floegence/flowersec-core/browser';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@floegence/flowersec-core/proxy', () => ({
  assertProxyRuntimeScopeV1: vi.fn(),
}));

describe('boot reconnect helpers', () => {
  it('creates a tunnel reconnect config with the shared refreshable source', async () => {
    const source = {
      kind: 'refreshable' as const,
      acquire: vi.fn(
        async ({ traceId }: { traceId?: string }) =>
          ({ v: 1, transport: 'tunnel', traceId }) as never
      ),
    };

    const mod = await import('../src/index');
    const config = mod.createArtifactTunnelReconnectConfig({
      source,
      connect: {
        liveness: { intervalMs: 15_000, timeoutMs: 10_000 },
        transportSecurityPolicy: 'require_tls',
      },
    });

    expect(config.source).toBe(source);
    expect(config.connect).toMatchObject({
      liveness: { intervalMs: 15_000, timeoutMs: 10_000 },
      transportSecurityPolicy: 'require_tls',
    });
  });

  it('creates a proxy-runtime tunnel config that injects the shared bootstrap scope resolver', async () => {
    const source = {
      kind: 'refreshable' as const,
      acquire: vi.fn(async () => ({ v: 1, transport: 'tunnel' }) as never),
    };
    const customScopeResolver = vi.fn();

    const mod = await import('../src/index');
    const config = mod.createProxyRuntimeTunnelReconnectConfig({
      source,
      connect: {
        scopeResolvers: {
          custom: customScopeResolver,
        },
      },
    });

    expect(config.source).toBe(source);
    expect(config.connect?.scopeResolvers).toMatchObject({
      custom: customScopeResolver,
      [mod.PROXY_RUNTIME_SCOPE_NAME]: mod.validateProxyRuntimeScopeEntry,
    });
  });

  it('creates a direct reconnect config without proxy-runtime scope injection', async () => {
    const source = {
      kind: 'refreshable' as const,
      acquire: vi.fn(async () => ({ v: 1, transport: 'direct' }) as never),
    };

    const mod = await import('../src/index');
    const config = mod.createArtifactDirectReconnectConfig({
      source,
      connect: {
        liveness: { intervalMs: 10_000, timeoutMs: 10_000 },
        transportSecurityPolicy: 'allow_plaintext_for_loopback',
      },
    });

    expect(config.source).toBe(source);
    expect(config.connect).toMatchObject({
      liveness: { intervalMs: 10_000, timeoutMs: 10_000 },
      transportSecurityPolicy: 'allow_plaintext_for_loopback',
    });
    expect(config.connect?.scopeResolvers).toBeUndefined();
  });

  it('lets Flowersec reject one-time sources with automatic reconnect', async () => {
    const mod = await import('../src/index');
    const config = mod.createArtifactTunnelReconnectConfig({
      source: { kind: 'once', artifact: { v: 1, transport: 'tunnel' } as never },
      autoReconnect: { enabled: true },
    });

    expect(() => createBrowserReconnectConfig(config)).toThrow(/refreshable artifact source/u);
  });

  it('keeps refreshable sources compatible with automatic reconnect', async () => {
    const mod = await import('../src/index');
    const config = mod.createArtifactDirectReconnectConfig({
      source: {
        kind: 'refreshable',
        acquire: async () => ({ v: 1, transport: 'direct' }) as never,
      },
      autoReconnect: { enabled: true },
    });

    expect(() => createBrowserReconnectConfig(config)).not.toThrow();
  });
});
