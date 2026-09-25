import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL, URL } from 'node:url';
import { expect, test } from 'vitest';
import { pdfAssetsPlugin } from '../packages/core/scripts/pdf-assets.mjs';

const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer, build } = await import(pathToFileURL(require.resolve('vite')).href);
const root = dirname(require.resolve('pdfjs-dist/package.json'));
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const prefix = `pdf-assets/${version}/legacy/`;
const resources = new Map([
  ['pdf.worker.min.mjs', 'legacy/build/pdf.worker.min.mjs'],
  ['LICENSE', 'LICENSE'],
]);
for (const directory of ['cmaps', 'standard_fonts', 'wasm', 'iccs', 'images']) {
  const source = directory === 'images' ? 'legacy/web/images' : directory;
  const file = readdirSync(join(root, source)).find(name => !/license/i.test(name));
  resources.set(`${directory}/${file}`, `${source}/${file}`);
}

test('serves the pinned legacy worker and resources under a nested application base', async () => {
  const server = await createServer({ configFile: false, base: '/product/',
    plugins: [pdfAssetsPlugin()], optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: '127.0.0.1', port: 0 } });
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    for (const [name, source] of resources) {
      const response = await globalThis.fetch(`${origin}/product/${prefix}${name}`);
      expect(response.status, name).toBe(200);
      expect(Buffer.from(await response.arrayBuffer()), name).toEqual(readFileSync(join(root, source)));
      if (name.endsWith('.mjs')) expect(response.headers.get('content-type')).toBe('text/javascript');
      if (name.endsWith('.wasm')) expect(response.headers.get('content-type')).toBe('application/wasm');
    }
  } finally { await server.close(); }
});

test('emits the same legacy resources and exposes their build-specific URL in production', async () => {
  const result = await build({ configFile: false, base: '/product/', logLevel: 'silent',
    plugins: [pdfAssetsPlugin(), {
      name: 'pdf-asset-consumer',
      resolveId(id) { if (id === 'pdf-asset-consumer') return '\0pdf-asset-consumer'; },
      load(id) { if (id === '\0pdf-asset-consumer') return "export { default } from 'virtual:floe-pdf-assets';"; },
    }],
    build: { write: false, minify: false,
      rollupOptions: { input: 'pdf-asset-consumer', preserveEntrySignatures: 'strict' } },
  });
  const assets = new Map(result.output.filter(item => item.type === 'asset').map(item => [item.fileName, item.source]));
  for (const [name, source] of resources) {
    expect(Buffer.from(assets.get(prefix + name)), name).toEqual(readFileSync(join(root, source)));
  }
  expect(result.output.find(item => item.type === 'chunk' && item.isEntry).code).toContain(`/product/${prefix}`);
  expect([...assets.keys()].every(name => name.startsWith(prefix))).toBe(true);
});
