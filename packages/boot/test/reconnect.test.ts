import { describe, expect, it } from 'vitest';

describe('boot Flowersec connection helpers', () => {
  it('preserves the artifact source and controller options', async () => {
    const mod = await import('../src/index');
    const source = { acquire: async () => ({ kind: 'failure', code: 'test', disposition: { kind: 'terminal' } }) } as never;
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
    expect(tunnel.lifecycle).toEqual(expect.objectContaining({ synchronize: expect.any(Function), dispose: expect.any(Function) }));
  });
});
