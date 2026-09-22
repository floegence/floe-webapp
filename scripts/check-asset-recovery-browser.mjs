import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, URL } from 'node:url';
import { chromium } from 'playwright';
import solid from 'vite-plugin-solid';

const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { build } = await import(pathToFileURL(require.resolve('vite')).href);
const root = await mkdtemp(resolve('packages/core/.asset-recovery-'));
let browser;
let server;
try {
  await writeFile(join(root, 'index.html'), '<html><div id="root"></div><script type="module" src="/main.tsx"></script></html>');
  await writeFile(join(root, 'Cold.tsx'), 'export default function Cold() { return <article>Loaded build {BUILD}</article>; }');
  await writeFile(join(root, 'main.tsx'), `
    import { createSignal, lazy, Show } from 'solid-js';
    import { render } from 'solid-js/web';
    import { KeepAliveStack } from '../src/components/layout/KeepAliveStack';
    import { createDocumentAssetRecovery } from '../src/app/createDocumentAssetRecovery';
    const Cold = lazy(() => import('./Cold'));
    function App() {
      const [active, setActive] = createSignal('warm');
      const recovery = createDocumentAssetRecovery({ url: '/' });
      return <>
        <button onClick={() => setActive('warm')}>Draft</button>
        <button onClick={() => setActive('cold')}>Cold page</button>
        <button onClick={() => recovery.check()}>Check connection</button>
        <Show when={recovery.reason()}><aside role="status">{recovery.reason()}<button onClick={() => window.location.reload()}>Reload</button></aside></Show>
        <KeepAliveStack activeId={active()} renderFallback={() => <p>Loading page</p>}
          renderError={() => <p role="alert">Page unavailable</p>}
          views={[{ id: 'warm', render: () => <input aria-label="Unsaved draft" /> }, { id: 'cold', render: () => <Cold /> }]} />
      </>;
    }
    render(() => <App />, document.getElementById('root'));
  `);
  for (const version of ['old', 'new']) {
    await mkdir(join(root, version));
    await build({ root, configFile: false, plugins: [solid()], logLevel: 'error',
      define: { BUILD: JSON.stringify(version) },
      build: { outDir: join(root, version), emptyOutDir: true } });
  }
  let current = 'old';
  const missing = [];
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    try {
      const body = await readFile(join(root, current, pathname === '/' ? 'index.html' : pathname));
      response.writeHead(200, { 'Content-Type': extname(pathname) === '.js' ? 'text/javascript' : 'text/html', 'Cache-Control': 'no-store' });
      response.end(body);
    } catch {
      missing.push(pathname);
      response.writeHead(404);
      response.end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('textbox').fill('Preserve across reconnect');
  await page.getByRole('button', { name: 'Check connection' }).click();
  await page.waitForLoadState('networkidle');
  assert.equal(await page.getByRole('status').count(), 0);
  current = 'new';
  await page.getByRole('button', { name: 'Check connection' }).click();
  await page.getByRole('status').filter({ hasText: 'updated' }).waitFor();
  assert.equal(await page.getByRole('textbox').inputValue(), 'Preserve across reconnect');
  await page.getByRole('button', { name: 'Cold page' }).click();
  await page.getByRole('alert').waitFor();
  assert.ok(missing.some((path) => /Cold-.*\.js$/.test(path)), 'the old lazy module must really return 404');
  assert.equal(await page.getByText('Loading page', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Draft', exact: true }).click();
  assert.equal(await page.getByRole('textbox').inputValue(), 'Preserve across reconnect');
  await page.getByRole('button', { name: 'Reload', exact: true }).click();
  await page.getByRole('button', { name: 'Cold page' }).click();
  await page.getByText('Loaded build new', { exact: true }).waitFor();

  // The same build can fail during an outage too. Reload obtains a fresh module map.
  await page.reload();
  await page.route('**/Cold-*.js', (route) => route.abort());
  await page.getByRole('button', { name: 'Cold page' }).click();
  await page.getByRole('alert').waitFor();
  await page.getByRole('status').filter({ hasText: 'load-failed' }).waitFor();
  await page.unroute('**/Cold-*.js');
  await page.getByRole('button', { name: 'Reload', exact: true }).click();
  await page.getByRole('button', { name: 'Cold page' }).click();
  await page.getByText('Loaded build new', { exact: true }).waitFor();
  assert.deepEqual(errors, [], 'import rejection must be owned by the page boundary');
  console.log('PASS: unchanged entry, changed deployment, real chunk 404, retained draft, transient import failure, explicit reload, no unhandled errors');
} finally {
  await browser?.close();
  await new Promise((resolve) => server ? server.close(resolve) : resolve());
  await rm(root, { recursive: true, force: true });
}
