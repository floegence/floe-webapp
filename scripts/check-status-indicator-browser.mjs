/* global document */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from 'playwright';
import solid from 'vite-plugin-solid';
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(require.resolve('vite'));
const { default: tailwind } = await import(require.resolve('@tailwindcss/vite'));
const server = await createServer({
  configFile: false,
  optimizeDeps: { entries: ['test/browser/status-indicator.html'] },
  root: fileURLToPath(new URL('../packages/core/', import.meta.url)),
  plugins: [solid(), tailwind()],
  resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0 },
});
let browser;
const geometry = (page) =>
  page
    .locator('[data-toolbar], [data-content], [data-floe-status-indicator]')
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x, y, width, height };
      })
    );
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  for (const width of [1280, 600, 390]) {
    for (const mode of ['', 'scaled', 'projected']) {
      const page = await browser.newPage({ viewport: { width, height: 720 }, hasTouch: true });
      await page.goto(
        `${server.resolvedUrls.local[0]}test/browser/status-indicator.html?mode=${mode}`
      );
      await page.getByRole('button', { name: 'Refresh', exact: true }).waitFor({ timeout: 10000 });
      const idle = await geometry(page);
      assert.equal(
        await page.getByRole('button', { name: 'Inventory feedback' }).count(),
        0,
        'Idle feedback has no accessible control'
      );
      await page.getByRole('button', { name: 'Refresh', exact: true }).click();
      assert.deepEqual(await geometry(page), idle, 'Errors never push retained content');
      assert.equal(
        await page.getByRole('dialog').count(),
        0,
        'Background feedback does not auto-open'
      );
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Refresh');
      const trigger = page.getByRole('button', { name: /Inventory feedback/ });
      await trigger.focus();
      await page.keyboard.press('Enter');
      const panel = page.getByRole('dialog', { name: 'Inventory feedback' });
      await panel.waitFor();
      assert.equal(await panel.getByText('Update available', { exact: true }).count(), 1);
      assert.ok(await panel.getByText(/Full diagnostic detail/).textContent());
      assert.ok(
        await page
          .locator('[data-floe-status-details]')
          .evaluate((node) => node.scrollHeight > node.clientHeight),
        'Long details scroll'
      );
      const rect = await panel.boundingBox();
      assert.ok(
        rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= 720,
        'Feedback fits the viewport'
      );
      if (mode) {
        const boundary = await page.locator('[data-boundary]').boundingBox();
        assert.ok(
          rect.x >= boundary.x - 1 &&
            rect.y >= boundary.y - 1 &&
            rect.x + rect.width <= boundary.x + boundary.width + 1 &&
            rect.y + rect.height <= boundary.y + boundary.height + 1,
          'Feedback remains inside its owning surface'
        );
      }
      if (width === 1280 && !mode)
        await page.screenshot({ path: '/tmp/redeven-feedback-upstream.png' });
      await page.keyboard.press('Escape');
      await panel.waitFor({ state: 'hidden' });
      assert.equal(await trigger.evaluate((node) => node === document.activeElement), true);
      if (width === 390) await trigger.tap();
      else await trigger.click();
      await panel.waitFor();
      await panel.getByRole('button', { name: 'Retry inventory' }).click();
      assert.equal(
        await panel.getByText('Update available', { exact: true }).count(),
        1,
        'Resolving one error retains independent feedback'
      );
      assert.equal(
        await panel.evaluate((node) => node.contains(document.activeElement)),
        true,
        'Removing a focused entry keeps keyboard access inside the remaining panel'
      );
      await panel.getByRole('button', { name: 'Resolve update' }).click();
      await panel.waitFor({ state: 'hidden' });
      assert.equal(
        await page.evaluate(() => document.activeElement.textContent),
        'Refresh',
        'Resolution returns focus to a stable control'
      );
      assert.deepEqual(await geometry(page), idle);
      await page.getByRole('button', { name: 'Refresh', exact: true }).click();
      await trigger.click();
      await page.getByRole('textbox', { name: 'Outside target' }).click();
      await panel.waitFor({ state: 'hidden' });
      assert.equal(
        await page
          .getByRole('textbox', { name: 'Outside target' })
          .evaluate((node) => node === document.activeElement),
        true,
        'Outside dismissal preserves the clicked target'
      );
      await trigger.click();
      await panel.getByRole('button', { name: 'Close feedback' }).click();
      assert.equal(await trigger.count(), 1, 'Closing is not error dismissal');
      await page.close();
    }
  }
  console.log('PASS: compact feedback preserves density, geometry, recovery and keyboard access');
} finally {
  await browser?.close();
  await server.close();
}
