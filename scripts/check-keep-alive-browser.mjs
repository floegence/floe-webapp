/* global window, document */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const requireCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { build, preview } = await import(requireCore.resolve('vite'));
const temporary = await realpath(await mkdtemp(path.join(tmpdir(), 'floe-keep-alive-')));
const solid = path.dirname(requireCore.resolve('solid-js/package.json'));
let server;
let browser;
try {
  await writeFile(path.join(temporary, 'index.html'), '<!doctype html><main></main><script type="module" src="/fixture.js"></script>');
  await writeFile(path.join(temporary, 'fixture.js'), `
import { createComponent, createSignal, onCleanup } from ${JSON.stringify(path.join(solid, 'dist/solid.js'))};
import { render } from ${JSON.stringify(path.join(solid, 'web/dist/web.js'))};
import { KeepAliveStack } from ${JSON.stringify(path.resolve('packages/core/dist/layout.js'))};
window.mount = (boundaries) => {
  const host = document.querySelector('main');
  const disposed = [];
  const view = (id) => ({ id, render: () => {
    onCleanup(() => disposed.push(id));
    const frame = document.createElement('iframe');
    frame.dataset.document = id;
    frame.title = id;
    frame.srcdoc = '<input aria-label="Draft"><div style="height:2000px"></div>';
    return frame;
  } });
  const first = view('first'), second = view('second');
  const [views, setViews] = createSignal([first, second]);
  const [activeId, setActiveId] = createSignal('second');
  const dispose = render(() => createComponent(KeepAliveStack, {
    get views() { return views(); }, get activeId() { return activeId(); }, lazyMount: false,
    renderFallback: boundaries ? () => 'Loading' : undefined,
    renderError: boundaries ? () => 'Failed' : undefined,
  }), host);
  return { setViews: ids => setViews(ids.map(id => id === 'first' ? first : second)), setActiveId, disposed, dispose };
};
window.ready = true;`);
  await build({ configFile: false, root: temporary, base: './', logLevel: 'error', resolve: { alias: [
    { find: /^solid-js$/, replacement: path.join(solid, 'dist/solid.js') },
    { find: /^solid-js\/web$/, replacement: path.join(solid, 'web/dist/web.js') },
  ] }, build: { outDir: path.join(temporary, 'dist') } });
  server = await preview({ configFile: false, root: temporary, logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const boundaries of [false, true]) {
    await page.goto(server.resolvedUrls.local[0]);
    await page.waitForFunction(() => window.ready);
    await page.evaluate(boundaries => { window.current = window.mount(boundaries); }, boundaries);
    const frame = page.frameLocator('iframe[data-document="second"]');
    await frame.getByRole('textbox', { name: 'Draft' }).fill('Unsaved document');
    await page.evaluate(() => {
      window.savedFrame = document.querySelector('iframe[data-document="second"]');
      window.savedInput = window.savedFrame.contentDocument.querySelector('input');
    });
    for (const ids of [['second'], ['second', 'first'], ['first', 'second']]) {
      await page.evaluate(ids => window.current.setViews(ids), ids);
      await page.evaluate(() => new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));
      const identity = await page.evaluate(() => ({
        frame: document.querySelector('iframe[data-document="second"]') === window.savedFrame,
        input: window.savedFrame.contentDocument.querySelector('input') === window.savedInput,
        value: window.savedFrame.contentDocument.querySelector('input')?.value,
        disposed: window.current.disposed,
      }));
      assert.deepEqual(identity, { frame: true, input: true, value: 'Unsaved document', disposed: ['first'] }, 'sibling changes must retain the document, not merely its iframe element');
    }
    await page.evaluate(() => window.current.setActiveId('first'));
    assert.equal(await page.locator('[data-floe-keep-alive-view="second"]').evaluate(el => el.inert), true);
    await page.evaluate(() => window.current.setActiveId('second'));
    assert.equal(await frame.getByRole('textbox', { name: 'Draft' }).inputValue(), 'Unsaved document');
    await page.evaluate(() => window.current.setViews(['first']));
    assert.equal(await page.locator('iframe[data-document="second"]').count(), 0, 'explicit removal must dispose the exact document');
    assert.equal(await page.evaluate(() => window.current.disposed.filter(id => id === 'second').length), 1);
    await page.evaluate(() => window.current.dispose());
  }
  assert.deepEqual(errors, []);
  console.log('PASS: built KeepAliveStack retains iframe documents and drafts across sibling removal, addition, ordering and activation; explicit removal still disposes, with and without boundaries');
} finally {
  await browser?.close();
  await new Promise(resolve => server ? server.httpServer.close(resolve) : resolve());
  await rm(temporary, { recursive: true, force: true });
}
