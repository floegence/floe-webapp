/* global document, getComputedStyle, window, performance, requestAnimationFrame */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium, webkit } from 'playwright';

const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: solid } = await import('vite-plugin-solid');
const { default: tailwind } = await import(
  pathToFileURL(require.resolve('@tailwindcss/vite')).href
);
const server = await createServer({
  configFile: false,
  optimizeDeps: { entries: ['test/browser/dialog.html'] },
  root: fileURLToPath(new URL('../packages/core/', import.meta.url)),
  plugins: [solid(), tailwind()],
  resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0 },
});
await server.listen();
let browser;
try {
  for (const engine of [chromium, webkit]) {
    browser = await engine.launch({ headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      `http://127.0.0.1:${server.httpServer.address().port}/test/browser/dialog.html`
    );
    await page.getByRole('button', { name: 'Manage plugins', exact: true }).click();
    const drawer = page.locator('[data-floe-dialog-presentation="bottom-drawer"]');
    await drawer.locator('[data-floating-presence="open"]').first().waitFor();
    assert.equal(
      await drawer
        .locator('[data-floe-dialog-body]')
        .evaluate((el) => getComputedStyle(el).scrollbarGutter),
      'auto',
      'custom non-scrolling bodies must not reserve an empty scrollbar gutter'
    );
    await drawer.getByRole('button', { name: 'Close manager', exact: true }).click();
    await drawer.waitFor({ state: 'detached' });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 500 : 900 });
      // Crossing the body's overflow threshold must not change its available
      // width. The panel still uses the existing height observer animation.
      await page.getByRole('button', { name: 'Open scrollbar settings', exact: true }).click();
      const scrollbarDialog = page.getByRole('dialog', { name: 'Scrollbar settings', exact: true });
      const scrollbarPanel = page.locator('[data-floe-dialog-panel]');
      const scrollbarBody = scrollbarDialog.locator('[data-floe-dialog-body]');
      await page.waitForTimeout(350);
      const compactScrollbarLayout = await scrollbarDialog.evaluate((panel) => {
        const body = panel.querySelector('[data-floe-dialog-body]');
        return {
          panelWidth: panel.getBoundingClientRect().width,
          bodyWidth: body.getBoundingClientRect().width,
          bodyClientWidth: body.clientWidth,
          bodyScrollHeight: body.scrollHeight,
          bodyClientHeight: body.clientHeight,
          gutter: getComputedStyle(body).scrollbarGutter,
          panelHeight: panel.getBoundingClientRect().height,
        };
      });
      assert.match(compactScrollbarLayout.gutter, /stable/);
      assert.ok(
        compactScrollbarLayout.bodyScrollHeight <= compactScrollbarLayout.bodyClientHeight,
        `dialog baseline should fit at ${width}px: ${JSON.stringify(compactScrollbarLayout)}`
      );
      await page.evaluate(() => {
        window.__scrollbarHeightSamples = [];
        window.__scrollbarWidthSamples = [];
        const panel = document.querySelector('[data-floe-dialog-panel]');
        const body = panel.querySelector('[data-floe-dialog-body]');
        const start = performance.now();
        const tick = () => {
          window.__scrollbarHeightSamples.push(panel.getBoundingClientRect().height);
          window.__scrollbarWidthSamples.push({
            panel: panel.getBoundingClientRect().width,
            body: body.clientWidth,
          });
          if (performance.now() - start < 450) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await scrollbarDialog
        .getByRole('button', { name: 'Show overflow content', exact: true })
        .click();
      await page.waitForTimeout(500);
      const overflowingScrollbarLayout = await scrollbarDialog.evaluate((panel) => {
        const body = panel.querySelector('[data-floe-dialog-body]');
        return {
          panelWidth: panel.getBoundingClientRect().width,
          bodyWidth: body.getBoundingClientRect().width,
          bodyClientWidth: body.clientWidth,
          bodyScrollHeight: body.scrollHeight,
          bodyClientHeight: body.clientHeight,
          panelHeight: panel.getBoundingClientRect().height,
          rows: body.querySelectorAll('[data-scrollbar-overflow-row]').length,
          bodyCanScroll: body.scrollHeight > body.clientHeight,
        };
      });
      const scrollbarHeightSamples = await page.evaluate(() => window.__scrollbarHeightSamples);
      const scrollbarWidthSamples = await page.evaluate(() => window.__scrollbarWidthSamples);
      assert.equal(overflowingScrollbarLayout.rows, 48);
      assert.equal(
        overflowingScrollbarLayout.bodyCanScroll,
        true,
        `dialog body should overflow at ${width}px: ${JSON.stringify({ compactScrollbarLayout, overflowingScrollbarLayout })}`
      );
      assert.ok(overflowingScrollbarLayout.panelHeight > compactScrollbarLayout.panelHeight + 8);
      assert.ok(
        scrollbarHeightSamples.some(
          (height) =>
            height > compactScrollbarLayout.panelHeight + 1 &&
            height < overflowingScrollbarLayout.panelHeight - 1
        ),
        `the panel retains its smooth height transition at ${width}px`
      );
      assert.equal(overflowingScrollbarLayout.panelWidth, compactScrollbarLayout.panelWidth);
      assert.equal(
        overflowingScrollbarLayout.bodyClientWidth,
        compactScrollbarLayout.bodyClientWidth
      );
      assert.ok(
        scrollbarWidthSamples.every(
          ({ panel, body }) =>
            panel === compactScrollbarLayout.panelWidth &&
            body === compactScrollbarLayout.bodyClientWidth
        ),
        `panel/body widths stay stable at ${width}px during the height transition, got ${JSON.stringify(scrollbarWidthSamples)}`
      );
      await scrollbarBody.evaluate((body) => {
        body.scrollTop = 240;
      });
      assert.ok(
        await scrollbarBody.evaluate((body) => body.scrollTop > 0),
        'overflow content remains scrollable'
      );
      await scrollbarBody.evaluate((body) => {
        body.scrollTop = 0;
      });
      assert.equal(await scrollbarPanel.evaluate((el) => el.style.height), '');
      const shrinkingSamples = await scrollbarDialog.evaluate(async (panel) => {
        const body = panel.querySelector('[data-floe-dialog-body]');
        const samples = [];
        body.querySelector('button').click();
        await new Promise((resolve) => {
          const start = performance.now();
          const tick = () => {
            samples.push({
              panel: panel.getBoundingClientRect().width,
              body: body.clientWidth,
              height: panel.getBoundingClientRect().height,
            });
            if (performance.now() - start < 400) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        });
        return samples;
      });
      assert.ok(
        shrinkingSamples.every(
          ({ panel, body }) =>
            panel === compactScrollbarLayout.panelWidth &&
            body === compactScrollbarLayout.bodyClientWidth
        )
      );
      assert.ok(
        shrinkingSamples.some(
          ({ height }) =>
            height > compactScrollbarLayout.panelHeight + 1 &&
            height < overflowingScrollbarLayout.panelHeight - 1
        )
      );
      assert.equal(await scrollbarPanel.evaluate((el) => el.style.height), '');
      await page.keyboard.press('Escape');
      await scrollbarDialog.waitFor({ state: 'detached' });
    }

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Open scrollbar settings', exact: true }).click();
    const reducedDialog = page.getByRole('dialog', { name: 'Scrollbar settings', exact: true });
    await reducedDialog.waitFor();
    await page.waitForTimeout(100);
    const reducedWidths = await reducedDialog.evaluate((panel) => ({
      panel: panel.clientWidth,
      body: panel.querySelector('[data-floe-dialog-body]').clientWidth,
    }));
    await reducedDialog.getByRole('button', { name: 'Show overflow content', exact: true }).click();
    await page.waitForTimeout(100);
    assert.deepEqual(
      await reducedDialog.evaluate((panel) => ({
        panel: panel.clientWidth,
        body: panel.querySelector('[data-floe-dialog-body]').clientWidth,
      })),
      reducedWidths
    );
    assert.equal(await reducedDialog.evaluate((panel) => panel.getAnimations().length), 0);
    await page.keyboard.press('Escape');
    await reducedDialog.waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
    console.log(
      `${engine.name()}: stable scrollbar widths, scroll access, smooth growth/shrink, reduced motion and custom scroll ownership passed`
    );
    await browser.close();
    browser = null;
  }
} finally {
  await browser?.close();
  await server.close();
}
