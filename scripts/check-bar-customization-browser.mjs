/* global document */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium } from 'playwright';
const require = createRequire(new URL('../apps/demo/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = await createServer({ root: fileURLToPath(new URL('../apps/demo', import.meta.url)), configFile: fileURLToPath(new URL('../apps/demo/vite.config.ts', import.meta.url)), server: { host: '127.0.0.1', port: 5276, strictPort: true } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 750 } });
  const errors = []; page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  const url = `http://127.0.0.1:${server.httpServer.address().port}/bar-customization.html`;
  const keys = locator => locator.locator('[data-floe-bar-key]').evaluateAll(nodes => nodes.map(node => node.dataset.floeBarKey));
  const drag = async (source, target, axis, cancel = false) => {
    const a = await source.boundingBox(), b = await target.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + (axis === 'x' ? b.width - 2 : b.width / 2), b.y + (axis === 'y' ? b.height - 2 : b.height / 2), { steps: 8 });
    if (cancel) await page.keyboard.press('Escape');
    await page.mouse.up();
  };
  for (const theme of ['light', 'dark']) {
    await page.goto(url);
    await page.locator('[data-floe-bar-key="files"]').waitFor();
    await page.evaluate(mode => document.documentElement.classList.add(mode), theme);
    const rail = page.locator('nav'), dock = page.locator('.workbench-dock');
    await drag(rail.locator('[data-floe-bar-key="files"]'), rail.locator('[data-floe-bar-key="plugins"]'), 'y');
    assert.deepEqual(await keys(rail), ['terminal', 'plugins', 'files']);
    assert.equal(await page.locator('[data-active]').textContent(), 'files');
    await rail.locator('[data-floe-bar-key="files"]').press('Alt+Shift+ArrowUp');
    assert.deepEqual(await keys(rail), ['terminal', 'files', 'plugins']);
    await drag(rail.locator('[data-floe-bar-key="terminal"]'), rail.locator('[data-floe-bar-key="plugins"]'), 'y', true);
    assert.deepEqual(await keys(rail), ['terminal', 'files', 'plugins']);
    await drag(dock.locator('[data-floe-bar-key="widget:files"]'), dock.locator('[data-floe-bar-key="host:weather"]'), 'x');
    assert.deepEqual(await keys(dock), ['widget:terminal', 'action:plugins', 'host:weather', 'widget:files', 'tool:sticky-note']);
    assert.equal(await page.locator('[data-created]').textContent(), '0');
    assert.equal(await page.locator('[data-activated]').textContent(), '0');
    await dock.locator('[data-floe-bar-key="widget:files"]').press('Alt+Shift+ArrowLeft');
    assert.deepEqual(await keys(dock), ['widget:terminal', 'action:plugins', 'widget:files', 'host:weather', 'tool:sticky-note']);
    await drag(dock.locator('[data-floe-bar-key="widget:terminal"]'), dock.locator('[data-floe-bar-key="host:weather"]'), 'x', true);
    assert.equal((await keys(dock))[0], 'widget:terminal');
    const source = await dock.locator('[data-floe-bar-key="widget:terminal"]').boundingBox();
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2); await page.mouse.down();
    await page.mouse.move(600, 240, { steps: 8 }); await page.mouse.up();
    assert.equal(await page.locator('[data-created]').textContent(), '1');
    await dock.locator('[data-floe-bar-key="action:plugins"]').click();
    assert.equal(await page.locator('[data-activated]').textContent(), '1');
  }
  assert.deepEqual(errors, []);
  console.log('Navigation customization: pointer/keyboard order, cancellation, stable selection and canvas creation passed in light/dark.');
} finally { await browser?.close(); await server.close(); }
