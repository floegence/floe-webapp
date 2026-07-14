import { describe, expect, it } from 'vitest';

describe('boot artifact source surface', () => {
  it('reexports the Flowersec artifact source helper', async () => {
    const shared = await import('@floegence/flowersec-core/reconnect');
    const local = await import('../src/index');

    expect(local.createControlplaneArtifactSource).toBe(shared.createControlplaneArtifactSource);
  });

  it('uses the shared refreshable source contract for normal and entry requests', async () => {
    const mod = await import('../src/index');
    const standard = mod.createControlplaneArtifactSource({
      baseUrl: 'https://cp.example.com',
      endpointId: 'env_demo',
    });
    const entry = mod.createControlplaneArtifactSource({
      baseUrl: 'https://cp.example.com',
      endpointId: 'env_demo',
      entryTicket: 'ticket-1',
    });

    expect(standard.kind).toBe('refreshable');
    expect(entry.kind).toBe('refreshable');
  });
});
