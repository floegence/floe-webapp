/* global window, document, getComputedStyle */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium } from 'playwright';
const require = createRequire(new URL('../apps/demo/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = await createServer({ root: fileURLToPath(new URL('../apps/demo/', import.meta.url)), configFile: fileURLToPath(new URL('../apps/demo/vite.config.ts', import.meta.url)), server: { host: '127.0.0.1', port: 0 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/settings.html`);
  await page.getByRole('heading', { name: 'General', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Security & permissions', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: 'Security & permissions', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Security & permissions' }).getAttribute('aria-current'), 'page');
  await page.getByRole('textbox', { name: 'Search settings' }).fill('no match');
  await page.getByText('No settings found').waitFor();
  await page.getByRole('textbox', { name: 'Search settings' }).fill('');
  const themes = await page.evaluate(() => window.settingsFixture.themes.map(({ name, mode }) => ({ name, mode })));
  for (const surface of ['standard', 'soft-neumorphic']) {
    await page.evaluate((value) => window.settingsFixture.theme.setSurfaceStyle(value), surface);
    for (const theme of themes) {
      await page.evaluate((value) => window.settingsFixture.theme.selectShellTheme(value.mode, value.name), theme);
      const input = page.getByRole('textbox', { name: 'Workspace directory', exact: true });
      await input.blur();
      const before = await input.boundingBox();
      await input.focus();
      assert.deepEqual(await input.boundingBox(), before, 'focus must not move or resize a field');
      assert.equal(await input.evaluate((element) => getComputedStyle(element).outlineStyle), 'none');
    }
  }
  for (const width of [1280, 900, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 720 });
    await page.waitForTimeout(50);
    const geometry = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll('.floe-setting-row__control')].map((element) => ({ left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right, scroll: element.scrollWidth, width: element.clientWidth })),
    }));
    assert.ok(geometry.scrollWidth <= width, `page overflow at ${width}`);
    assert.ok(geometry.controls.every((control) => control.left >= 0 && control.right <= width && control.scroll <= control.width + 1), `control overflow at ${width}`);
  }
  await page.getByRole('combobox', { name: 'Settings page' }).selectOption('general');
  await page.getByRole('heading', { name: 'General', exact: true }).waitFor();
  await page.emulateMedia({ forcedColors: 'active' });
  assert.equal(await page.locator('.floe-settings-list').evaluate((element) => getComputedStyle(element).borderTopStyle), 'solid');
  assert.deepEqual(errors, []);
  console.log(`Settings acceptance passed: ${themes.length} themes, two surfaces, five widths, keyboard and mobile navigation.`);
} finally { await browser?.close(); await server.close(); }
