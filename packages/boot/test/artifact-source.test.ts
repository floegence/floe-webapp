import { describe, expect, it, vi } from 'vitest';

vi.mock('@floegence/flowersec-core', () => ({
  parseArtifact: (value: string | Uint8Array) => ({ value }),
  createArtifactLease: (artifact: unknown) => ({ artifact }),
}));

describe('boot artifact source surface', () => {
  it('requests an opaque Flowersec artifact and applies transport policy', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ connect_artifact: '{}' }), { status: 200 }));
    const mod = await import('../src/index');
    const source = mod.createControlplaneArtifactSource({
      baseUrl: 'https://cp.example.com',
      endpointId: 'env_demo',
      fetch,
    });
    await expect(source.acquire({ signal: new AbortController().signal })).resolves.toMatchObject({ kind: 'lease' });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('denies loopback HTTP unless explicitly enabled', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
    const mod = await import('../src/index');
    expect(() => mod.createControlplaneArtifactSource({ baseUrl: 'http://127.0.0.1:8787', endpointId: 'demo', fetch })).toThrow(/transport policy denied/u);
    expect(fetch).not.toHaveBeenCalled();
  });
});
