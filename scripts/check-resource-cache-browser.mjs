import { URL } from 'node:url';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const source = await readFile(new URL('../packages/core/dist/resource-cache.js', import.meta.url));
const server = createServer((request, response) => {
  response.setHeader('content-type', request.url === '/cache.js' ? 'text/javascript' : 'text/html');
  response.end(request.url === '/cache.js' ? source : '<!doctype html><title>Resource cache acceptance</title>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async () => {
    const { createIndexedDBResourceCacheStorage, createResourceCache } = await import('/cache.js');
    const cache = createResourceCache({ storage: createIndexedDBResourceCacheStorage() });
    const resource = cache.resource({ scope: 'alice/host', key: 'applications', version: 1, decode: value => value });
    await resource.refresh(async () => ['Editor']);
    await cache.flush();
    cache.dispose();
  });
  await page.reload();
  const result = await page.evaluate(async () => {
    const { createIndexedDBResourceCacheStorage, createResourceCache } = await import('/cache.js');
    const storage = createIndexedDBResourceCacheStorage();
    const cache = createResourceCache({ storage });
    const definition = { scope: 'alice/host', key: 'applications', version: 1, decode: value => value };
    const resource = cache.resource(definition);
    let finish;
    const request = resource.refresh(() => new Promise(resolve => { finish = resolve; }));
    await resource.hydrate();
    const restored = resource.snapshot();
    finish(['Editor', 'Terminal']);
    await request;
    await cache.flush();
    const current = resource.snapshot();
    let finishObsolete;
    const obsolete = resource.refresh(() => new Promise(resolve => { finishObsolete = resolve; })).catch(error => error.name);
    await Promise.resolve();
    cache.cancelRefreshes(definition.scope);
    const cancelled = await obsolete;
    const retained = resource.snapshot();
    await resource.refresh(async () => ['Current']);
    finishObsolete(['Obsolete']);
    await Promise.resolve();
    const fenced = resource.snapshot().data;
    const other = cache.resource({ ...definition, scope: 'bob/host' });
    await other.hydrate();
    const isolated = other.snapshot().data === undefined;
    await cache.clearScope('alice/host');
    const cleared = (await storage.list()).length === 0 && resource.snapshot().data === undefined;
    cache.dispose();
    return { restored, current, cancelled, retained, fenced, isolated, cleared };
  });
  assert.deepEqual(result.restored.data, ['Editor']);
  assert.equal(result.restored.refreshing, true);
  assert.equal(result.restored.restoring, false);
  assert.deepEqual(result.current.data, ['Editor', 'Terminal']);
  assert.equal(result.current.refreshing, false);
  assert.equal(result.cancelled, 'AbortError');
  assert.deepEqual(result.retained.data, result.current.data);
  assert.equal(result.retained.restoring, false);
  assert.deepEqual(result.fenced, ['Current']);
  assert.equal(result.isolated, true);
  assert.equal(result.cleared, true);
  console.log('Resource cache: IndexedDB survives reload, refresh preserves data, and scopes remain isolated.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
