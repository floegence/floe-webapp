/* global window, document */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium, webkit } from 'playwright';
const root = fileURLToPath(new URL('../packages/core/', import.meta.url));
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: solid } = await import('vite-plugin-solid');
const { default: tailwind } = await import(
  pathToFileURL(require.resolve('@tailwindcss/vite')).href
);
const server = await createServer({
  configFile: false,
  root,
  plugins: [solid(), tailwind()],
  resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0 },
});
await server.listen();
const output = fileURLToPath(new URL('../.cache/workbench-header/', import.meta.url));
mkdirSync(output, { recursive: true });
const results = [];
try {
  for (const [engine, browserType] of [
    ['chromium', chromium],
    ['webkit', webkit],
  ]) {
    const browser = await browserType.launch({ headless: true });
    try {
      for (const theme of ['mica', 'vibrancy'])
        for (const mode of ['light', 'dark'])
          for (const projected of [false, true]) {
            const page = await browser.newPage({ viewport: { width: 1000, height: 650 } });
            const errors = [];
            page.on('pageerror', (e) => errors.push(e.message));
            await page.goto(
              `http://127.0.0.1:${server.httpServer.address().port}/test/browser/workbench-header.html?theme=${theme}&projected=${Number(projected)}`
            );
            await page.evaluate((mode) => document.documentElement.classList.add(mode), mode);
            const header = page.locator('.workbench-widget__header');
            const actions = header.locator('[data-floe-workbench-header-actions]');
            await actions.locator('button').first().waitFor();
            console.log({ engine, theme, mode, projected });
            await page.waitForTimeout(220);
            const originalHeight = (await header.boundingBox()).height;
            await page.evaluate(() => window.headerFixture.setActions(false));
            assert.equal(
              (await header.boundingBox()).height,
              originalHeight,
              'Actions do not increase header height'
            );
            await page.evaluate(() => window.headerFixture.setActions(true));
            for (const width of [640, 480, 479, 320, 220]) {
              await page.evaluate((width) => window.headerFixture.setWidth(width), width);
              await page.waitForFunction(
                (width) =>
                  document.querySelector('.workbench-widget__header-actions button').textContent ===
                  (width < 480 ? '…' : '1'),
                width
              );
              const bounds = await header.evaluate((el) => {
                const title = el
                  .querySelector('.workbench-widget__title-area')
                  .getBoundingClientRect();
                const actions = el
                  .querySelector('[data-floe-workbench-header-actions]')
                  .getBoundingClientRect();
                const header = el.getBoundingClientRect();
                return {
                  titleRight: title.right,
                  actionsLeft: actions.left,
                  actionsRight: actions.right,
                  right: header.right,
                  height: header.height,
                };
              });
              assert.ok(
                bounds.titleRight <= bounds.actionsLeft + 1,
                'Title does not overlap actions'
              );
              assert.ok(bounds.actionsRight <= bounds.right, 'Actions remain inside header');
              assert.equal(bounds.height, originalHeight);
              const rect = await page.locator('.workbench-widget').boundingBox();
              await actions.locator('button').first().click();
              await actions.locator('button').first().dispatchEvent('dblclick');
              assert.deepEqual(await page.locator('.workbench-widget').boundingBox(), rect);
              const button = actions.locator('button').first();
              await button.focus();
              const before = await page.evaluate(() => window.headerFixture.clicks());
              await page.keyboard.press('Enter');
              assert.equal(await page.evaluate(() => window.headerFixture.clicks()), before + 1);
              if (width === 640 || width === 220)
                await page.screenshot({
                  path: `${output}/${engine}-${theme}-${mode}-${projected}-${width}.png`,
                });
              results.push({ engine, theme, mode, projected, width, height: bounds.height });
            }
            assert.equal(await page.evaluate(() => window.headerFixture.dragStarts()), 0);
            assert.equal(await page.evaluate(() => window.headerFixture.mounts()), 1);
            assert.deepEqual(errors, []);
            await page.close();
          }
    } finally {
      await browser.close();
    }
  }
  writeFileSync(`${output}/report.json`, JSON.stringify(results, null, 2));
  console.log(`Verified ${results.length} Workbench header layouts and native button interactions`);
} finally {
  await server.close();
}
