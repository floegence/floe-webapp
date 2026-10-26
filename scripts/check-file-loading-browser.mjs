/* global window, document, getComputedStyle, requestAnimationFrame */
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
  for (const touch of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 700 }, hasTouch: touch });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/test/browser/file-loading.html?mode=list`);
    await page.waitForFunction(() => !!window.fileLoading);
    await page.evaluate(() => window.fileLoading.complete(false, 1000));
    for (const rootSize of [16, 18, 20, 32]) {
      await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, rootSize);
      await paint(page);
      // Density is a design token, not a pixel snapshot: read the pitch the row
      // declares from a probe in the same body scope (the coarse-pointer block
      // overrides the token per input modality). Comparing against a literal
      // 1.75rem froze the previous design's row pitch into the gate, so a
      // deliberate density change failed as if rows had stopped honouring root
      // font scaling. The root-relative scaling and the touch floor stay real.
      const expected = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.cssText =
          'position:absolute;visibility:hidden;width:0;height:var(--floe-row-height)';
        document.body.appendChild(probe);
        const value = parseFloat(getComputedStyle(probe).height);
        probe.remove();
        return value;
      });
      assert.ok(expected > 0, `row height token resolves at root ${rootSize}px`);
      // The resolved pitch must stay proportional to the root size: a token that
      // stops tracking root font size would silently break enlarged-text layouts.
      assert.ok(
        Math.abs(expected / rootSize - (touch ? 2.75 : 1.875)) < 0.01,
        `row pitch tracks root font size at ${rootSize}px (measured ${expected}px)`
      );
      if (touch) assert.ok(expected >= 44, `touch rows keep a 44px target (measured ${expected}px)`);
      const first = page.locator('[data-file-browser-item-id]').first();
      assert.equal(
        await first.evaluate(node => node.getBoundingClientRect().height),
        expected,
        `row consumes --floe-row-height at root ${rootSize}px`
      );
      await first.evaluate(node => {
        let viewport = node.parentElement;
        while (getComputedStyle(viewport).overflowY !== 'auto') viewport = viewport.parentElement;
        viewport.scrollTop = viewport.scrollHeight;
      });
      await paint(page);
      await page.locator('[data-file-browser-item-id="999"]').waitFor();
      const tail = await page.locator('[data-file-browser-item-id="999"]').evaluate(node => {
        let viewport = node.parentElement;
        while (getComputedStyle(viewport).overflowY !== 'auto') viewport = viewport.parentElement;
        return { bottom: node.getBoundingClientRect().bottom, viewportBottom: viewport.getBoundingClientRect().bottom, height: viewport.scrollHeight };
      });
      assert.ok(Math.abs(tail.bottom - tail.viewportBottom) <= 1, 'The final virtual row reaches the viewport edge');
      assert.ok(Math.abs(tail.height - 1000 * expected) <= 1, 'Virtual offsets match fractional rendered row heights');
    }
    await page.close();
  }
  console.log('File list density passed: desktop, touch, enlarged text and final virtual row.');
} finally {
  await browser.close();
  await server.close();
}
