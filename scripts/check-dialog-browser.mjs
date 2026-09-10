/* global document, getComputedStyle */
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
  resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0 },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/test/browser/dialog.html`);
  await page.getByRole('button', { name: 'Manage plugins', exact: true }).click();
  const drawer = page.locator('[data-floe-dialog-presentation="bottom-drawer"]');
  await drawer.locator('[data-floating-presence="open"]').first().waitFor();
  assert.equal(await drawer.evaluate((el) => el.closest('[inert]')), null);
  await page.getByRole('textbox', { name: 'Search plugins' }).fill('weather');
  await page.getByRole('button', { name: 'Source filter', exact: true }).click();
  assert.equal(await drawer.getByRole('menu').count(), 1);
  await drawer.getByRole('menuitem', { name: 'Official sources', exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector('[data-filter]')?.textContent === 'official'
  );
  await page.getByRole('button', { name: 'Source filter', exact: true }).click();
  await page.getByRole('menuitem', { name: 'All sources', exact: true }).focus();
  await page.keyboard.press('Escape');
  await page.getByRole('menu').waitFor({ state: 'detached' });
  assert.equal(await drawer.getAttribute('data-floating-presence'), 'open');

  const review = page.getByRole('button', { name: 'Review install', exact: true });
  await review.click();
  const confirm = page.getByRole('dialog', { name: 'Confirm installation', exact: true });
  await confirm.getByRole('textbox').fill('reviewed');
  await confirm.getByRole('button', { name: 'Cancel installation' }).focus();
  await page.keyboard.press('Tab');
  assert.equal(await confirm.evaluate((el) => el.contains(document.activeElement)), true);
  await page.keyboard.press('Escape');
  await confirm.waitFor({ state: 'detached' });
  await page.waitForFunction(() => document.activeElement?.textContent === 'Review install');
  assert.equal(await drawer.getAttribute('data-floating-presence'), 'open');

  await page.getByRole('button', { name: 'Source filter', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Review package', exact: true }).click();
  await confirm.getByRole('textbox').fill('opened from menu');
  await page.keyboard.press('Escape');
  await confirm.waitFor({ state: 'detached' });
  await page.waitForFunction(() => document.activeElement?.textContent === 'Source filter', null, {
    timeout: 1500,
  });
  assert.equal(await drawer.getAttribute('data-floating-presence'), 'open');

  await drawer.locator('[data-scroll]').hover();
  await page.mouse.wheel(0, 500);
  await page.waitForFunction(() => document.querySelector('[data-scroll]').scrollTop > 0);
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollTop), 0);
  await page.mouse.click(10, 10);
  assert.equal(await drawer.count(), 1, 'exit stays mounted');
  assert.equal(await page.locator('[data-background]').evaluate((el) => el.inert), true);
  await page.mouse.click(10, 10);
  await drawer.waitFor({ state: 'detached' });
  assert.equal(await page.locator('[data-count]').textContent(), '0');
  await page.getByRole('button', { name: 'Background action', exact: true }).click();
  assert.equal(await page.locator('[data-count]').textContent(), '1');

  await page.getByRole('button', { name: 'Local settings', exact: true }).click();
  const local = page.getByRole('dialog', { name: 'Local settings', exact: true });
  assert.equal(
    await local.evaluate((el) => el.closest('[data-floe-dialog-mode]').dataset.floeDialogMode),
    'surface'
  );
  await local.getByRole('button', { name: 'Local action', exact: true }).click();
  assert.equal(await page.locator('[data-count]').textContent(), '2');
  await page.keyboard.press('Escape');
  await local.waitFor({ state: 'detached' });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Manage plugins', exact: true }).click();
  assert.ok(
    await drawer
      .locator('[data-floe-dialog-panel]')
      .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration) <= 0.001)
  );
  await page.getByRole('button', { name: 'Close manager', exact: true }).click();
  await drawer.waitFor({ state: 'detached' });
  assert.deepEqual(errors, []);
  console.log(
    'Dialog browser contract passed: native input, nested menus/confirmation, exit isolation, projected placement, reduced motion.'
  );
} finally {
  await browser?.close();
  await server.close();
}
