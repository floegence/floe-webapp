/* global document, CSS */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import solid from 'vite-plugin-solid';
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(require.resolve('vite'));
const { default: tailwind } = await import(require.resolve('@tailwindcss/vite'));
const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({ configFile: false, root: root + 'packages/core', plugins: [{ name: 'packed-preview-fixture', transform(code, id) { if (process.argv.includes('--dist') && id.includes('/test/browser/')) return code.replaceAll('../../src/styles/globals.css', '../../dist/styles.css').replaceAll('../../src/', '../../dist/'); } }, solid(), tailwind()],
  resolve: { dedupe: ['solid-js'] }, server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } },
});
await server.listen(); await server.watcher.close();
try {
  for (const [engine, launcher] of Object.entries(process.argv.includes('--all') ? { chromium, firefox, webkit } : { chromium })) {
    const browser = await launcher.launch();
    try { for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      await page.goto(server.resolvedUrls.local[0] + 'test/browser/text-search.html');
      const original = await page.locator('#first').evaluate(element => element.innerHTML);
      await page.locator('#find').click();
      const input = page.getByRole('searchbox');
      assert.ok(await input.evaluate(element => element === document.activeElement));
      await input.fill('HELLO WORLD');
      await page.getByRole('status').filter({ hasText: '1 of 3' }).waitFor();
      assert.equal(await page.evaluate(() => [...CSS.highlights.values()].reduce((count, highlight) => count + highlight.size, 0)), 4);
      await input.press('Enter'); assert.equal(await page.getByRole('status').textContent(), '2 of 3');
      await input.press('Enter'); assert.equal(await page.getByRole('status').textContent(), '3 of 3');
      assert.ok(await page.locator('#last').evaluate(element => element.parentElement.scrollTop > 0));
      await page.locator('#switch').click(); assert.equal(await page.evaluate(() => CSS.highlights.size), 0);
      await page.locator('#switch').click(); assert.equal(await page.getByRole('status').textContent(), '3 of 3');
      await input.press('Enter'); assert.equal(await page.getByRole('status').textContent(), '1 of 3');
      await input.press('Shift+Enter'); assert.equal(await page.getByRole('status').textContent(), '3 of 3');
      for (const query of ['[a.b]', '中文', 'café']) { await input.fill(query); await page.getByRole('status').filter({ hasText: '1 of 1' }).waitFor(); }
      await input.fill('absent'); await page.getByRole('status').filter({ hasText: 'No matches' }).waitFor();
      assert.ok(await page.getByRole('button', { name: 'Next match' }).isDisabled());
      assert.equal(await page.locator('#first').evaluate(element => element.innerHTML), original);
      await input.press('Escape'); assert.equal(await page.getByRole('search').count(), 0);
      assert.ok(await page.locator('#find').evaluate(element => element === document.activeElement));
      await page.locator('#find').press('ControlOrMeta+f'); await input.waitFor();
      await page.locator('#replace').click(); assert.equal(await page.getByRole('search').count(), 0);
      await page.locator('#find').click(); assert.equal(await input.inputValue(), '');
      const bounds = await page.getByRole('search').boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
      console.log({ engine, width, passed: true }); await page.close();
    } } finally { await browser.close(); }
  }
} finally { await server.close(); }
