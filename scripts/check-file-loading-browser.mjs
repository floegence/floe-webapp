/* global window, requestAnimationFrame */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium } from 'playwright';
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: solid } = await import('vite-plugin-solid');
const { default: tailwind } = await import(
  pathToFileURL(require.resolve('@tailwindcss/vite')).href
);
const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../packages/core/', import.meta.url)),
  plugins: [solid(), tailwind()],
  optimizeDeps: { entries: ['test/browser/file-loading.html'] },
  resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0 },
});
await server.listen();
const browser = await chromium.launch();
const paint = (page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
try {
  for (const mode of ['list', 'grid'])
    for (const width of [390, 700, 1200]) {
      const page = await browser.newPage({ viewport: { width, height: 700 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(
        `http://127.0.0.1:${server.httpServer.address().port}/test/browser/file-loading.html?mode=${mode}`
      );
      await page.waitForFunction(() => !!window.fileLoading);
      await paint(page);
      const placeholder = page.locator('[data-file-browser-placeholder]').first();
      assert.ok(
        await placeholder.count(),
        `${mode}/${width} must render structural placeholders, not an empty result`
      );
      assert.equal(await page.getByText('This folder is empty').count(), 0);
      assert.equal(await page.locator('[data-file-browser-item-id]').count(), 0);
      assert.equal(await page.getByText('0 items', { exact: true }).count(), 0);
      const geometry = (element) => ({
        box: element.getBoundingClientRect().toJSON(),
        cells: [...element.children]
          .slice(0, element.hasAttribute('data-file-list-row') ? 3 : 2)
          .map((child) => child.getBoundingClientRect().toJSON()),
      });
      const before = await placeholder.evaluate(geometry);
      const status = await page.locator('[data-file-browser-status-bar]').boundingBox();
      await page.evaluate(() => window.fileLoading.complete());
      await paint(page);
      assert.deepEqual(
        await page.locator('[data-file-browser-item-id]').first().evaluate(geometry),
        before,
        `${mode}/${width}: item and cell geometry must match`
      );
      assert.deepEqual(
        await page.locator('[data-file-browser-status-bar]').boundingBox(),
        status,
        'Status height must not appear only after loading'
      );
      assert.equal(await page.locator('[data-file-browser-placeholder]').count(), 0);
      assert.equal(await page.getByText('12 items', { exact: true }).count(), 1);
      await page.reload();
      await page.waitForFunction(() => !!window.fileLoading);
      await page.evaluate(() => window.fileLoading.complete(true));
      await page.getByText('This folder is empty').waitFor();
      assert.equal(await page.locator('[data-file-browser-placeholder]').count(), 0);
      console.log(`PASS ${mode}/${width}: first-data geometry and successful empty result`);
      assert.deepEqual(errors, []);
      await page.close();
    }
} finally {
  await browser.close();
  await server.close();
}
