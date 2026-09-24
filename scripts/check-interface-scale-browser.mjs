/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium } from 'playwright';
const require = createRequire(new URL('../apps/demo/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = await createServer({ root: fileURLToPath(new URL('../apps/demo/', import.meta.url)), configFile: fileURLToPath(new URL('../apps/demo/vite.config.ts', import.meta.url)), server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch();
try {
  for (const touch of [false, true]) {
    const page = await browser.newPage({ viewport: { width: touch ? 320 : 1280, height: 900 }, hasTouch: touch });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/density.html`);
    const surface = page.getByTestId('interface-scale');
    await surface.getByRole('heading').waitFor();
    const metrics = await surface.evaluate(element => {
      const measure = selector => {
        const node = element.querySelector(selector), css = getComputedStyle(node);
        return { height: node.getBoundingClientRect().height, size: css.fontSize, weight: css.fontWeight };
      };
      return { heading: measure('h1'), input: measure('input'), buttons: [...element.querySelectorAll('button')].map(node => node.getBoundingClientRect().height), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
    });
    assert.equal(metrics.heading.size, '16px');
    assert.equal(metrics.heading.weight, '500');
    assert.equal(metrics.input.size, touch ? '16px' : '13px');
    assert.deepEqual(metrics.buttons, touch ? [44, 44] : [28, 32]);
    assert.equal(metrics.input.height, touch ? 44 : 32);
    assert.equal(metrics.overflow, false);
    const input = surface.getByRole('textbox');
    await input.fill('Retained draft');
    const before = await input.boundingBox();
    await input.focus();
    assert.deepEqual(await input.boundingBox(), before);
    assert.equal(await input.inputValue(), 'Retained draft');
    const compounds = page.getByTestId('compound-scale');
    for (const field of await compounds.locator('input, textarea').all()) {
      assert.equal(await field.evaluate(node => getComputedStyle(node).fontSize), touch ? '16px' : '13px');
    }
    if (touch) {
      for (const button of await compounds.locator('button').all()) {
        const box = await button.boundingBox();
        assert.ok(box.height >= 44 && box.width >= 44, 'Compound controls retain touch targets');
      }
    }
    await page.close();
  }
  console.log('Interface scale passed: desktop geometry, touch targets, readable input and retained draft.');
} finally { await browser.close(); await server.close(); }
