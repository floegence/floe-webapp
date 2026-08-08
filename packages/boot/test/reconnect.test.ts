import { describe, expect, it } from 'vitest';

describe('boot Flowersec 2.0 connection helpers', () => {
  it('preserves the artifact source and controller options', async () => {
    const mod = await import('../src/index');
    const source = { acquire: async () => ({ kind: 'failure', code: 'test', disposition: { kind: 'terminal' } }) } as never;
    const controller = { maximumAttempts: 2 };
    expect(mod.createArtifactTunnelConnectionConfig({ source, controller })).toEqual({ source, controller });
    expect(mod.createProxyRuntimeTunnelConnectionConfig({ source, controller })).toEqual({ source, controller });
    expect(mod.createArtifactDirectConnectionConfig({ source, controller })).toEqual({ source, controller });
  });
});
