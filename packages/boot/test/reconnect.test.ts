import { describe, expect, it } from 'vitest';

describe('boot Flowersec connection helpers', () => {
  it('preserves the artifact source and controller options', async () => {
    const mod = await import('../src/index');
    const source = {
      acquire: async () => ({ kind: 'failure', code: 'test', disposition: { kind: 'terminal' } }),
    } as never;
    const controller = { maximumAttempts: 2 };
    const tunnel = mod.createArtifactTunnelConnectionConfig({ source, controller });
    const direct = mod.createArtifactDirectConnectionConfig({ source, controller });
    const proxy = mod.createProxyRuntimeTunnelConnectionConfig({
      source,
      controller,
      proxyBootstrap: mod.createProxyBootstrapOwner({}),
    });
    expect(tunnel).toMatchObject({ source, controller });
    expect(direct).toMatchObject({ source, controller });
    expect(proxy).toMatchObject({ source, controller });
    expect(tunnel.lifecycle).toEqual(
      expect.objectContaining({ synchronize: expect.any(Function), dispose: expect.any(Function) })
    );
  });

  it('creates an explicit private-loopback config with the shared acquisition lifecycle', async () => {
    const mod = await import('../src/index');
    const source = {
      acquire: async () => ({ kind: 'failure', code: 'test', disposition: { kind: 'terminal' } }),
    } as never;
    const privateLoopback = {
      origin: 'http://127.0.0.1:43123',
      maximumAttempts: 2,
      connectTimeoutMs: 5_000,
    };
    const config = mod.createPrivateLoopbackDirectConnectionConfig({ source, privateLoopback });
    expect(config).toMatchObject({ source, privateLoopback });
    expect(config).not.toHaveProperty('controller');
    expect(config.lifecycle).toEqual(
      expect.objectContaining({ synchronize: expect.any(Function), dispose: expect.any(Function) })
    );
  });
});
