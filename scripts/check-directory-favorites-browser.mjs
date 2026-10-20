/* global document */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium } from 'playwright';
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: solid } = await import('vite-plugin-solid');
const { default: tailwind } = await import(pathToFileURL(require.resolve('@tailwindcss/vite')).href);
const server = await createServer({ configFile: false, optimizeDeps: { entries: ['test/browser/directory-favorites.html'] }, root: fileURLToPath(new URL('../packages/core', import.meta.url)), plugins: [solid(), tailwind()], resolve: { dedupe: ['solid-js'] }, server: { host: '127.0.0.1', port: 0 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:' + server.httpServer.address().port + '/test/browser/directory-favorites.html');
  for (const theme of ['light', 'dark']) for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 }); await page.evaluate(theme => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, theme);
    await page.getByRole('button', { name: 'Choose directory', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Working directory' });
    const recent = dialog.locator('[data-picker-suggested-path]'); await recent.first().waitFor(); assert.equal(await recent.count(), 10);
    const scroll = dialog.locator('[data-picker-suggestions]'); assert.equal(await scroll.evaluate(el => el.scrollHeight > el.clientHeight), true);
    await recent.first().focus(); await page.keyboard.press('End'); assert.equal(await recent.last().evaluate(el => el === document.activeElement), true);
    assert.ok(await scroll.evaluate(el => el.scrollTop) > 0);
    assert.equal(await dialog.getByRole('button', { name: 'Choose', exact: true }).isDisabled(), true);
    await dialog.getByRole('tab', { name: 'Favorites' }).click();
    assert.equal(await dialog.getByRole('button', { name: 'Choose', exact: true }).isDisabled(), true);
    await dialog.getByRole('textbox', { name: 'Filter favorites by name or path' }).fill('beta');
    assert.equal(await dialog.locator('[data-picker-favorite-path]').count(), 1);
    await dialog.locator('[data-picker-favorite-path]').click();
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(el => el.textContent === 'Choose')?.disabled);
    const star = dialog.getByRole('button', { name: 'Unfavorite: /srv/beta', exact: true });
    const before = await star.boundingBox(); await star.click(); const during = await star.boundingBox();
    assert.ok(Math.abs(before.x - during.x) < 1 && Math.abs(before.width - during.width) < 1);
    await dialog.getByRole('button', { name: 'Favorite: /srv/beta', exact: true }).waitFor();
    await dialog.getByRole('button', { name: 'Favorite: /srv/beta', exact: true }).click();
    await dialog.getByRole('button', { name: 'Unfavorite: /srv/beta', exact: true }).waitFor();
    const folder = dialog.locator('[data-picker-row-path]').first(); await folder.focus(); await page.keyboard.press('Shift+F10');
    await page.getByRole('menuitem', { name: 'Favorite', exact: true }).waitFor(); await page.keyboard.press('Escape');
    assert.equal(await folder.evaluate(el => document.activeElement === el), true);
    assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click(); await dialog.waitFor({ state: 'detached' });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Open files', exact: true }).click();
  const files = page.getByRole('dialog', { name: 'Select File' });
  await files.getByRole('option').click(); await files.getByRole('tab', { name: 'Favorites' }).click();
  assert.equal(await files.getByRole('listbox').count(), 0); assert.equal(await files.getByRole('button', { name: 'Select', exact: true }).isDisabled(), true);
  await files.getByRole('tab', { name: 'Home', exact: true }).click(); assert.equal(await files.getByRole('option').getAttribute('aria-selected'), 'true');
  await files.getByRole('button', { name: 'Cancel', exact: true }).click(); await files.waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Save file', exact: true }).click(); const save = page.getByRole('dialog', { name: 'Save File' });
  await save.getByRole('tab', { name: 'Favorites' }).click(); assert.equal(await save.getByRole('button', { name: 'Save', exact: true }).isDisabled(), true);
  assert.equal(await save.locator('input[placeholder="filename.ext"]').inputValue(), 'draft.txt');
  await save.getByRole('button', { name: 'Cancel', exact: true }).click(); await save.waitFor({ state: 'detached' });
  for (const scale of ['0.65', '1.3']) {
    await page.getByRole('combobox').selectOption(scale);
    const folder = page.locator('[data-picker-row-path]').first(); await folder.click({ button: 'right' });
    const menu = page.getByRole('menu'); await menu.waitFor(); const box = await menu.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 1280 && box.y >= 0 && box.y + box.height <= 900);
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors, []); console.log('Directory favorites browser interactions passed (themes, narrow layout, touch, projected scales, keyboard, file selection).');
} finally { await browser?.close(); await server.close(); }
