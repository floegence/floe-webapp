/* global document, getComputedStyle, requestAnimationFrame, localStorage, innerWidth */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium, webkit } from 'playwright';

const repo = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../apps/demo/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = process.env.FLOE_DEMO_URL
  ? null
  : await createServer({
      root: `${repo}apps/demo`,
      configFile: `${repo}apps/demo/vite.config.ts`,
      server: { host: '127.0.0.1', port: 0 },
    });
await server?.listen();
const origin = process.env.FLOE_DEMO_URL ?? `http://127.0.0.1:${server.httpServer.address().port}`;
const output = `${repo}.cache/workbench-parity`;
mkdirSync(output, { recursive: true });
const results = [];
const nextFrame = (page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
const board = (page, id) =>
  page.locator(`[data-wb-object-id="${id}"]:not([data-wb-plane="overlay"])`).first();
const shape = (locator) =>
  locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return [rect.x, rect.y, rect.width, rect.height];
  });
const material = (locator) =>
  locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.backgroundColor, style.borderTopColor, style.backgroundImage, style.borderRadius];
  });

try {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${origin}/?view=workbench&sample=composition&theme=paper&surface=standard`);
      await page.waitForSelector('.workbench-sticky');
      assert.equal(
        await page
          .getByRole('tab', { name: 'Workbench', exact: true })
          .getAttribute('aria-selected'),
        'true'
      );
      assert.equal(await page.locator('.workbench-sticky').count(), 6);
      assert.equal(await page.locator('.workbench-surface').count(), 1);
      assert.equal(
        await page.locator('.workbench-sticky__title').first().textContent(),
        'Give the work room to breathe.'
      );

      const themeSelect = page.getByRole('combobox', { name: 'Application theme' });
      const themes = await themeSelect
        .locator('option')
        .evaluateAll((options) => options.map((option) => option.value));
      for (const theme of themes) {
        await themeSelect.selectOption(theme);
        assert.equal(await page.locator('html').getAttribute('data-floe-shell-theme'), theme);
        assert.equal(await page.locator('.workbench-sticky').count(), 6);
      }
      const standalone = await context.newPage();
      for (const theme of ['paper', 'slate']) {
        await themeSelect.selectOption(theme);
        await standalone.goto(
          `${origin}/workbench-composition.html?sample=composition&lang=en-US&theme=${theme}`
        );
        await standalone.waitForSelector('.workbench-sticky');
        assert.deepEqual(
          await material(board(page, 'reference').locator('.workbench-sticky__surface')),
          await material(board(standalone, 'reference').locator('.workbench-sticky__surface')),
          `${engine.name()}: the full example uses the same ${theme} material as the standalone example`
        );
        await nextFrame(page);
        await page.screenshot({ path: `${output}/full-example-${engine.name()}-${theme}.png` });
      }
      await standalone.close();
      await themeSelect.selectOption('paper');

      const note = board(page, 'idea');
      const geometry = await shape(note);
      const title = note.locator('.workbench-sticky__title');
      await title.click();
      await title.fill('A saved idea');
      await page.keyboard.press('Escape');
      assert.deepEqual(await shape(note), geometry, 'Editing does not move or zoom the canvas');
      await page.getByRole('tab', { name: 'Regions', exact: true }).click();
      await board(page, 'blank-region').waitFor();
      await page.getByRole('tab', { name: 'Composition', exact: true }).click();
      await board(page, 'product').waitFor();
      assert.equal(
        await title.textContent(),
        'A saved idea',
        'Rapid sample switches preserve edits'
      );
      assert.deepEqual(await shape(note), geometry, 'Returning preserves the viewport');

      await page.getByRole('tab', { name: 'Regions', exact: true }).click();
      await board(page, 'blank-region').waitFor();
      assert.equal(await page.locator('.workbench-background-region').count(), 3);
      const detail = board(page, 'outline-detail').locator('[data-wb-part="content"]');
      assert.ok(
        await detail.evaluate((element) => element.scrollHeight <= element.clientHeight + 1),
        'English region detail is not clipped'
      );
      const label = board(page, 'field-region').locator('[contenteditable]');
      await label.click();
      await label.fill('');
      await page.keyboard.press('Escape');
      assert.equal(await label.textContent(), '', 'Region names can be removed');
      await board(page, 'blank-region').click({ position: { x: 100, y: 100 } });
      await page.locator('.workbench-treatment-trigger').click();
      assert.equal(await page.locator('.workbench-composition-toolbar').count(), 1);
      assert.ok(
        !/\p{Script=Han}/u.test(await page.locator('.workbench-composition-toolbar').innerText()),
        'Example tools use English'
      );
      await page.screenshot({ path: `${output}/full-example-${engine.name()}-region-tools.png` });

      await page.getByRole('tab', { name: 'Workspace', exact: true }).click();
      await page.waitForSelector('.workbench-widget');
      assert.equal(
        await page.locator('.workbench-widget').count(),
        4,
        'Original workspace stays available'
      );
      await page.getByRole('tab', { name: 'Deck', exact: true }).click();
      await page.getByRole('tab', { name: 'Activity', exact: true }).click();
      await page.getByRole('tab', { name: 'Workbench', exact: true }).click();
      await page.getByRole('tab', { name: 'Composition', exact: true }).click();
      await board(page, 'product').waitFor();
      assert.equal(
        await title.textContent(),
        'A saved idea',
        'Display-mode switches preserve edits'
      );
      await page.waitForFunction(() =>
        Object.keys(localStorage).some(
          (key) =>
            key.includes('demo.workbench.composition.v1') &&
            localStorage.getItem(key)?.includes('A saved idea')
        )
      );
      await page.reload();
      await title.waitFor();
      assert.equal(await title.textContent(), 'A saved idea', 'Reload preserves edits');
      assert.deepEqual(await shape(note), geometry, 'Reload preserves the viewport');
      await page.getByRole('tab', { name: 'Regions', exact: true }).click();
      await board(page, 'blank-region').waitFor();
      assert.equal(await label.textContent(), '', 'Reload preserves an empty region name');
      await page.setViewportSize({ width: 620, height: 820 });
      await nextFrame(page);
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        'Narrow shell does not overflow'
      );
      const link = await page.getByRole('link', { name: 'A/B comparison' }).getAttribute('href');
      assert.ok(link.includes('lang=en-US') && link.includes('sample=regions'));
      assert.deepEqual(errors, [], 'Full application has no uncaught browser errors');
      results.push({
        browser: engine.name(),
        themes: themes.length,
        editing: 'passed',
        persistence: 'passed',
        navigation: 'passed',
        parity: 'passed',
      });
      await context.close();
    } finally {
      await browser.close();
    }
  }
  writeFileSync(`${output}/full-example-results.json`, `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify(results, null, 2));
} finally {
  await server?.close();
}
