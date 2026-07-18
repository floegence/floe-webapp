import { describe, expect, it, vi } from 'vitest';

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

  it('keeps loopback HTTP denied unless the caller explicitly opts in', async () => {
    const deniedFetch = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ error: { code: 'invalid_request', message: 'rejected' } }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        })
    );
    const denied = (await import('../src/index')).createControlplaneArtifactSource({
      baseUrl: 'http://127.0.0.1:8787',
      endpointId: 'env_demo',
      fetch: deniedFetch,
    });
    if (denied.kind !== 'refreshable') throw new Error('expected a refreshable artifact source');

    await expect(denied.acquire({})).rejects.toMatchObject({
      status: 0,
      code: 'transport_policy_denied',
    });
    expect(deniedFetch).not.toHaveBeenCalled();

    const allowedFetch = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ error: { code: 'invalid_request', message: 'rejected' } }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        })
    );
    const allowed = (await import('../src/index')).createControlplaneArtifactSource({
      baseUrl: 'http://127.0.0.1:8787',
      endpointId: 'env_demo',
      allowLoopbackHTTP: true,
      fetch: allowedFetch,
    });
    if (allowed.kind !== 'refreshable') throw new Error('expected a refreshable artifact source');

    await expect(allowed.acquire({})).rejects.toMatchObject({
      status: 400,
      code: 'invalid_request',
    });
    expect(allowedFetch).toHaveBeenCalledOnce();
    expect(allowedFetch.mock.calls[0]?.[1]?.redirect).toBe('error');
  });

  it('forwards the no-redirect policy to custom fetch for normal and entry requests', async () => {
    const mod = await import('../src/index');

    for (const entryTicket of [undefined, 'ticket-1']) {
      const sentinel = new Error(`fetch reached: ${entryTicket ?? 'normal'}`);
      const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
        throw sentinel;
      });
      const source = mod.createControlplaneArtifactSource({
        baseUrl: 'https://cp.example.com',
        endpointId: 'env_demo',
        ...(entryTicket === undefined ? {} : { entryTicket }),
        fetch,
      });
      if (source.kind !== 'refreshable') throw new Error('expected a refreshable artifact source');

      await expect(source.acquire({})).rejects.toBe(sentinel);
      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch.mock.calls[0]?.[1]?.redirect).toBe('error');
    }
  });
});
