/* global document, requestAnimationFrame, localStorage, innerWidth */
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

try {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
      for (const theme of ['paper', 'slate']) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`${origin}/?view=workbench&theme=${theme}&surface=standard`);
        await board(page, 'overview-title').waitFor();
        assert.equal(await page.locator('html').getAttribute('data-floe-shell-theme'), theme);
        assert.equal(
          await page.locator('[data-workbench-mode]').getAttribute('data-workbench-mode'),
          'work'
        );
        assert.equal(await page.locator('.workbench-widget').count(), 3);
        assert.equal(await page.locator('.workbench-background-region').count(), 3);
        assert.equal(
          await page.locator('.workbench-demo-examples').count(),
          0,
          'No review toolbar'
        );
        assert.equal(
          await page.getByRole('link', { name: /A\/B/ }).count(),
          0,
          'No comparison entry'
        );
        assert.equal(
          await page.getByRole('combobox', { name: 'Application theme' }).count(),
          0,
          'Theme belongs to shell controls'
        );
        assert.equal(await page.locator('iframe[src*="workbench-reference"]').count(), 0);
        await page.screenshot({ path: `${output}/clean-demo-${engine.name()}-${theme}.png` });

        await page.getByRole('button', { name: 'Switch canvas mode' }).click();
        await page.getByRole('menuitemradio', { name: /Composition Mode/ }).click();
        assert.equal(
          await page
            .locator('.workbench-widget')
            .evaluateAll((nodes) => nodes.every((el) => !!el.closest('[inert]'))),
          true
        );
        assert.equal(
          await page
            .locator('.workbench-sticky__body')
            .evaluateAll((nodes) =>
              nodes.every((el) => !el.isContentEditable && !!el.closest('[inert]'))
            ),
          true
        );
        await page.getByRole('button', { name: 'Switch canvas mode' }).click();
        await page.getByRole('menuitemradio', { name: /Work Mode/ }).click();

        const note = board(page, 'overview-idea');
        const geometry = await shape(note);
        const title = note.locator('.workbench-sticky__title');
        await title.click();
        await title.fill('A saved idea');
        await page.keyboard.press('Escape');
        assert.deepEqual(await shape(note), geometry, 'Editing preserves the viewport');
        const body = note.locator('.workbench-sticky__body');
        await body.click();
        await body.evaluate((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          document.getSelection().removeAllRanges();
          document.getSelection().addRange(range);
        });
        await page.getByRole('button', { name: 'Insert emoji', exact: true }).click();
        await page.getByRole('menuitem', { name: 'Insert emoji ✅', exact: true }).click();
        await page.keyboard.press('Escape');
        const savedBody = await body.textContent();
        assert.ok(savedBody.endsWith('✅'));
        assert.equal(await title.textContent(), 'A saved idea');
        await page.getByRole('tab', { name: 'Deck', exact: true }).click();
        await page.getByRole('tab', { name: 'Activity', exact: true }).click();
        await page.getByRole('tab', { name: 'Workbench', exact: true }).click();
        assert.equal(await title.textContent(), 'A saved idea', 'Mode switches retain edits');
        await page.waitForFunction(() =>
          Object.keys(localStorage).some(
            (key) =>
              key.includes('demo.workbench.overview.v1') &&
              localStorage.getItem(key)?.includes('A saved idea')
          )
        );
        await page.reload();
        await title.waitFor();
        assert.equal(await title.textContent(), 'A saved idea', 'Reload retains edits');
        assert.equal(await body.textContent(), savedBody);
        assert.deepEqual(await shape(note), geometry, 'Reload retains the viewport');
        await page.setViewportSize({ width: 620, height: 820 });
        await nextFrame(page);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.deepEqual(errors, []);
        results.push({
          browser: engine.name(),
          theme,
          editing: 'passed',
          persistence: 'passed',
          reviewChrome: 'absent',
        });
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  writeFileSync(`${output}/full-example-results.json`, `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify(results, null, 2));
} finally {
  await server?.close();
}
