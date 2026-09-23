/* global document, window */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium, webkit } from 'playwright';

const require = createRequire(new URL('../apps/demo/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = await createServer({ root: fileURLToPath(new URL('../apps/demo/', import.meta.url)), configFile: fileURLToPath(new URL('../apps/demo/vite.config.ts', import.meta.url)), server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const failures = [];
try {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 393, height: 700 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/density.html`);
      await page.getByRole('textbox', { name: 'Retained setting' }).waitFor();
      if (await page.locator('.floe-settings-layout__mobile').count()) failures.push(`${engine.name()}: absent navigation occupies space`);
      if (!(await page.getByTestId('reading').count())) failures.push(`${engine.name()}: chart metadata is missing`);
      if (await page.getByTestId('untitled-chart').locator('.chart-monitoring-header').count()) failures.push(`${engine.name()}: empty chart header occupies space`);
      await page.getByRole('textbox').evaluate(element => { window.retainedSetting = element; });
      await page.getByRole('button', { name: 'Toggle navigation' }).click();
      await page.getByRole('combobox').waitFor({ state: 'attached' });
      await page.getByRole('button', { name: 'Toggle navigation' }).click();
      assert.equal(await page.getByRole('textbox').evaluate(element => window.retainedSetting === element), true);
      if (await page.getByTestId('reading').count()) {
        await page.getByRole('button', { name: 'Update reading' }).click();
        assert.equal(await page.getByTestId('reading').textContent(), '25.0% · 8 cores');
        for (const width of [320, 360, 393, 430, 767, 768, 1280]) {
          await page.setViewportSize({ width, height: 700 });
          const geometry = await page.getByTestId('chart').evaluate(element => {
            const header = element.querySelector('.chart-monitoring-header').getBoundingClientRect();
            const meta = element.querySelector('[data-testid="reading"]').getBoundingClientRect();
            return { left: meta.left, right: meta.right, top: meta.top, bottom: meta.bottom, headerTop: header.top, headerBottom: header.bottom, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
          });
          assert.ok(!geometry.overflow && geometry.left >= 0 && geometry.right <= width, `${engine.name()}: metadata overflow at ${width}`);
          assert.ok(geometry.top >= geometry.headerTop && geometry.bottom <= geometry.headerBottom, 'metadata stays in the header');
        }
      }
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  }
  assert.deepEqual(failures, []);
  console.log('Compact surfaces passed in Chromium and WebKit: optional navigation, retained input, chart metadata, seven widths.');
} finally { await server.close(); }
