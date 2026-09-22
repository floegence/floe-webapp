import { describe, expect, it, vi } from 'vitest';
import { createResourceCache, enforceResourceCacheBudget, type ResourceCacheStorage } from '../src/resource-cache';

function storage() {
  const values = new Map<string, string>();
  const adapter: ResourceCacheStorage = {
    get: async key => values.get(key) ?? null,
    set: vi.fn(async (key, value) => { values.set(key, value); }),
    remove: async key => { values.delete(key); },
    list: async () => [...values].map(([key, value], index) => ({ key, bytes: value.length, lastAccessedAt: index })),
  };
  return { adapter, values };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const definition = { scope: 'alice/host', key: 'apps', version: 1, decode: (value: unknown) => {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error('invalid');
  return value as string[];
} };

describe('persistent resource continuity', () => {
  it.each(['hit', 'empty', 'miss', 'corrupt', 'version', 'failure'])('finishes restoration atomically for %s storage', async outcome => {
    const { adapter } = storage();
    const disk = deferred<string | null>();
    adapter.get = () => disk.promise;
    const cache = createResourceCache({ storage: adapter });
    const resource = cache.resource(definition);
    const snapshots: unknown[] = [];
    resource.subscribe(() => snapshots.push(resource.snapshot()));
    expect(resource.snapshot()).toMatchObject({ data: undefined, restoring: true });
    if (outcome === 'failure') disk.reject(new Error('unavailable'));
    else disk.resolve(outcome === 'miss' ? null : outcome === 'corrupt' ? '{broken' : JSON.stringify({
      version: outcome === 'version' ? 99 : 1, data: outcome === 'empty' ? [] : ['Editor'],
    }));
    await resource.hydrate();
    expect(resource.snapshot()).toMatchObject({ restoring: false, refreshing: false });
    expect(resource.snapshot().data).toEqual(outcome === 'hit' ? ['Editor'] : outcome === 'empty' ? [] : undefined);
    expect(snapshots).toHaveLength(1);
    cache.dispose();
  });

  it('ends presentation restoration when the network wins and fences the late disk read', async () => {
    const { adapter } = storage();
    const disk = deferred<string | null>();
    adapter.get = () => disk.promise;
    const cache = createResourceCache({ storage: adapter });
    const resource = cache.resource(definition);
    await resource.refresh(async () => []);
    expect(resource.snapshot()).toMatchObject({ data: [], restoring: false });
    disk.resolve(JSON.stringify({ version: 1, data: ['Old'] }));
    await resource.hydrate();
    expect(resource.snapshot()).toMatchObject({ data: [], restoring: false });
    cache.dispose();
  });

  it('restores the previous successful list while a new request is pending', async () => {
    const { adapter } = storage();
    const first = createResourceCache({ storage: adapter });
    await first.resource(definition).refresh(async () => ['Editor']);
    await first.flush();
    first.dispose();
    const next = createResourceCache({ storage: adapter });
    const resource = next.resource(definition);
    const request = deferred<string[]>();
    const refreshing = resource.refresh(() => request.promise);
    await resource.hydrate();
    expect(resource.snapshot()).toMatchObject({ data: ['Editor'], refreshing: true, stale: true });
    request.resolve(['Editor', 'Terminal']);
    await refreshing;
    expect(resource.snapshot()).toMatchObject({ data: ['Editor', 'Terminal'], refreshing: false, stale: false });
    next.dispose();
  });

  it('deduplicates readers, preserves empty results and does not persist identical polls', async () => {
    const { adapter } = storage();
    const cache = createResourceCache({ storage: adapter });
    const a = cache.resource(definition);
    expect(cache.resource(definition)).toBe(a);
    const request = deferred<string[]>();
    const fetch = vi.fn(() => request.promise);
    const one = a.refresh(fetch);
    const two = a.refresh(fetch);
    request.resolve([]);
    await Promise.all([one, two]);
    await cache.flush();
    await a.refresh(async () => []);
    await cache.flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(adapter.set).toHaveBeenCalledTimes(1);
    expect(a.snapshot().data).toEqual([]);
    cache.dispose();
  });

  it('keeps data on a failed refresh without writing the failure', async () => {
    const { adapter } = storage();
    const cache = createResourceCache({ storage: adapter });
    const resource = cache.resource(definition);
    await resource.refresh(async () => ['Editor']);
    await cache.flush();
    await expect(resource.refresh(async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    expect(resource.snapshot()).toMatchObject({ data: ['Editor'], stale: true, refreshing: false });
    await cache.flush();
    expect(adapter.set).toHaveBeenCalledTimes(1);
    cache.dispose();
  });

  it('never lets slow hydration overwrite fresh network data', async () => {
    const { adapter } = storage();
    const old = deferred<string | null>();
    adapter.get = () => old.promise;
    const cache = createResourceCache({ storage: adapter });
    const resource = cache.resource(definition);
    await resource.refresh(async () => ['New']);
    old.resolve(JSON.stringify({ version: 1, data: ['Old'] }));
    await resource.hydrate();
    expect(resource.snapshot().data).toEqual(['New']);
    cache.dispose();
  });

  it('fences mutation invalidation and removes revoked scope data', async () => {
    const { adapter, values } = storage();
    const cache = createResourceCache({ storage: adapter });
    const resource = cache.resource(definition);
    resource.set(['Old']);
    await cache.flush();
    const request = deferred<string[]>();
    const refresh = resource.refresh(() => request.promise);
    resource.invalidate();
    request.resolve(['Resurrected']);
    await refresh;
    expect(resource.snapshot().data).toEqual(['Old']);
    expect(resource.snapshot().stale).toBe(true);
    await cache.clearScope(definition.scope);
    expect(resource.snapshot().data).toBeUndefined();
    expect(values.size).toBe(0);
    cache.dispose();
  });

  it('isolates scopes and versions and tolerates corrupt or unavailable storage', async () => {
    const { adapter } = storage();
    adapter.get = async () => '{broken';
    adapter.set = async () => { throw new Error('quota'); };
    const cache = createResourceCache({ storage: adapter });
    const resource = cache.resource(definition);
    await resource.hydrate();
    await resource.refresh(async () => ['Editor']);
    await cache.flush();
    expect(cache.resource({ ...definition, scope: 'bob/host' }).snapshot().data).toBeUndefined();
    expect(cache.resource({ ...definition, version: 2 }).snapshot().data).toBeUndefined();
    expect(resource.snapshot().data).toEqual(['Editor']);
    cache.dispose();
  });

  it('evicts least recently accessed persisted entries to the configured byte budget', async () => {
    const { adapter, values } = storage();
    const cache = createResourceCache({ storage: adapter, maxBytes: 50 });
    cache.resource(definition).set(['First']);
    await cache.flush();
    cache.resource({ ...definition, key: 'second' }).set(['Second']);
    await cache.flush();
    expect(values.size).toBe(1);
    expect([...values.values()][0]).toContain('Second');
    cache.dispose();
  });

  it('fences delayed disk reads when permission is revoked', async () => {
    const { adapter } = storage();
    const disk = deferred<string | null>();
    adapter.get = () => disk.promise;
    const cache = createResourceCache({ storage: adapter });
    const resource = cache.resource(definition);
    await cache.clearScope(definition.scope);
    disk.resolve(JSON.stringify({ version: 1, data: ['Private session'] }));
    await resource.hydrate();
    expect(resource.snapshot().data).toBeUndefined();
    cache.dispose();
  });

  it('persists only the reviewed projection and retries transient storage failures', async () => {
    const { adapter, values } = storage();
    const write = adapter.set;
    adapter.set = vi.fn().mockRejectedValueOnce(new Error('disk unavailable')).mockImplementation(write);
    const cache = createResourceCache({ storage: adapter });
    const resource = cache.resource({ scope: 'scope', key: 'sessions', version: 1,
      decode: (value: unknown) => value as { name: string; ticket?: string },
      persist: value => ({ name: value.name }),
    });
    await resource.refresh(async () => ({ name: 'Editor', ticket: 'private-credential' }));
    await cache.flush();
    await resource.refresh(async () => ({ name: 'Editor', ticket: 'private-credential' }));
    await cache.flush();
    expect(adapter.set).toHaveBeenCalledTimes(2);
    expect([...values.values()].join()).toContain('Editor');
    expect([...values.values()].join()).not.toContain('private-credential');
    cache.dispose();
  });
});

it('shares the same budget policy with multi-owner asynchronous host storage', async () => {
  const remove = vi.fn(async (_key: string) => {});
  const removed = await enforceResourceCacheBudget({
    list: async () => [{ key: 'owner-a', bytes: 20, lastAccessedAt: 1 }, { key: 'owner-b', bytes: 20, lastAccessedAt: 2 }], remove,
  }, 32);
  expect(removed).toEqual(['owner-a']);
  expect(remove).toHaveBeenCalledWith('owner-a');
});
