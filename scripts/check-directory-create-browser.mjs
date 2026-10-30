/* global document */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium } from 'playwright';
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: solid } = await import('vite-plugin-solid');
const { default: tailwind } = await import(pathToFileURL(require.resolve('@tailwindcss/vite')).href);
const server = await createServer({ configFile: false, optimizeDeps: { entries: ['test/browser/directory-create.html'] }, root: fileURLToPath(new URL('../packages/core', import.meta.url)), plugins: [solid(), tailwind()], resolve: { dedupe: ['solid-js'] }, server: { host: '127.0.0.1', port: 0 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:' + server.httpServer.address().port + '/test/browser/directory-create.html');
  for (const theme of ['light', 'dark']) for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    await page.getByRole('button', { name: 'Choose directory', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Working directory' });
    const newFolder = dialog.getByRole('button', { name: 'New folder', exact: true });
    await newFolder.click();
    const name = dialog.getByRole('textbox', { name: 'Folder name', exact: true });
    assert.equal(await name.evaluate(el => document.activeElement === el), true, 'new folder must focus the name');
    await name.fill('draft'); await page.keyboard.press('Escape');
    assert.equal(await dialog.count(), 1); assert.equal(await name.count(), 0);
    assert.equal(await newFolder.evaluate(el => document.activeElement === el), true);
    await newFolder.click(); assert.equal(await name.inputValue(), '');
    const create = dialog.getByRole('button', { name: 'Create', exact: true });
    for (const invalid of ['.', '..', 'nested/folder']) {
      await name.fill(invalid); assert.equal(await create.isDisabled(), true);
    }
    await name.fill('denied'); await page.keyboard.press('Enter');
    await dialog.getByRole('alert').waitFor();
    assert.equal(await name.inputValue(), 'denied');
    assert.match(await dialog.getByRole('alert').innerText(), /Write permission denied/);
    const folder = 'project-' + theme + '-' + width;
    await name.fill(folder);
    const before = await create.boundingBox();
    const count = Number(await page.locator('[data-calls]').textContent());
    await page.keyboard.press('Enter');
    assert.equal(await create.getAttribute('aria-busy'), 'true');
    const during = await create.boundingBox();
    assert.ok(Math.abs(before.x - during.x) < 1 && Math.abs(before.width - during.width) < 1);
    await page.keyboard.press('Enter');
    await dialog.locator('[data-picker-row-path="/home/alice/' + folder + '"]').waitFor();
    assert.equal(Number(await page.locator('[data-calls]').textContent()), count + 1);
    assert.equal(await page.locator('[data-selected]').textContent(), '');
    assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await newFolder.click(); await name.fill(folder); await create.click();
    await dialog.getByRole('alert').waitFor(); assert.match(await dialog.getByRole('alert').innerText(), /already exists/);
    await name.press('Escape');
    await newFolder.click(); await name.fill('stale-' + folder); await create.click();
    await dialog.getByRole('textbox', { name: 'Directory path' }).fill('/');
    await dialog.getByRole('button', { name: 'Go', exact: true }).click();
    await page.waitForTimeout(400);
    assert.equal(await dialog.getByRole('textbox', { name: 'Directory path' }).inputValue(), '/');
    assert.equal(await name.count(), 0);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await dialog.waitFor({ state: 'detached' });
  }
  await page.getByRole('button', { name: 'Choose directory', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Working directory' });
  await dialog.getByRole('button', { name: 'New folder', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Folder name' }).fill('denied');
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).last().click();
  await dialog.waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Choose directory', exact: true }).click();
  await page.waitForTimeout(400);
  assert.equal(await dialog.getByRole('alert').count(), 0);
  await dialog.locator('[data-picker-row-path="/home/alice/project-dark-390"]').click();
  await dialog.getByRole('button', { name: 'Choose', exact: true }).click();
  assert.equal(await page.locator('[data-selected]').textContent(), '/home/alice/project-dark-390');
  assert.deepEqual(errors, []); console.log('Directory creation passed: keyboard, validation, failures, stale effects, themes and responsive geometry.');
} finally { await browser?.close(); await server.close(); }
