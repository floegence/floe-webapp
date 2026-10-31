/* global document, performance, getComputedStyle, window, Storage */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { URL } from 'node:url';
import { mkdirSync } from 'node:fs';
const origin = process.env.FLOE_DEMO_URL ?? 'http://127.0.0.1:61340/';
const route = (query) => new URL(query, origin).href;
mkdirSync('.cache/design-review/acceptance', { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.FLOE_TEST_CHROMIUM_EXECUTABLE ??
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
await context.addInitScript(() => {
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    if (window.blockExampleStorage && key.endsWith('demo.scenarios.files.saved.v1'))
      throw new Error('Acceptance: unavailable storage');
    return original.call(this, key, value);
  };
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(route('?view=showcase&section=home&mode=dark'));
  await page.getByRole('heading', { name: 'Floe Webapp', exact: true }).waitFor();
  await page.waitForTimeout(700);
  assert.equal(
    await page.evaluate(() =>
      performance.getEntriesByType('resource').some((x) => /shiki|wasm-CG/.test(x.name))
    ),
    false,
    'home does not start Shiki'
  );
  await page.getByRole('link', { name: /Keep your editing flow/ }).click();
  const editor = page.getByRole('textbox', { name: 'Edit release.md', exact: true });
  await editor.fill('# Retained through navigation');
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Run check', exact: true }).click();
  await page.getByText('Home', { exact: true }).first().click();
  await page.getByRole('link', { name: /Follow work to completion/ }).click();
  await page.getByRole('button', { name: 'View report', exact: true }).waitFor();
  await page.locator('#scenario-tab-files').click();
  assert.equal(await editor.inputValue(), '# Retained through navigation');
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page.waitForURL(/scenario=overview/);
  await page.goBack();
  await editor.waitFor();
  assert.equal(await editor.inputValue(), '# Retained through navigation');
  const themeBefore = await page.locator('html').getAttribute('class');
  await page.getByRole('button', { name: 'Reset example files', exact: true }).click();
  await page.getByRole('button', { name: 'Keep files', exact: true }).click();
  assert.equal(await editor.inputValue(), '# Retained through navigation');
  await page.getByRole('button', { name: 'Reset example files', exact: true }).click();
  await page.getByRole('button', { name: 'Reset files', exact: true }).click();
  assert.match(await editor.inputValue(), /# October release/);
  assert.equal(await page.locator('html').getAttribute('class'), themeBefore);
  await editor.fill('# Storage failure keeps this draft');
  await page.evaluate(() => {
    window.blockExampleStorage = true;
  });
  await page.getByRole('button', { name: 'Save file', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Browser storage is unavailable' }).waitFor();
  assert.equal(await editor.inputValue(), '# Storage failure keeps this draft');
  await page.evaluate(() => {
    window.blockExampleStorage = false;
  });
  await page.getByRole('button', { name: 'Save file', exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector('[data-scenario="files"]').textContent.includes('Saved locally')
  );
  await page.reload();
  await editor.waitFor();
  assert.equal(await editor.inputValue(), '# Storage failure keeps this draft');
  await page
    .getByRole('tablist', { name: 'Display mode', exact: true })
    .getByRole('tab', { name: 'Workbench', exact: true })
    .click();
  await page.waitForURL(/view=workbench/);
  await page
    .getByRole('tablist', { name: 'Display mode', exact: true })
    .getByRole('tab', { name: 'Activity', exact: true })
    .click();
  await editor.waitFor();
  assert.equal(await editor.inputValue(), '# Storage failure keeps this draft');
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  await page.waitForURL(
    (url) => url.searchParams.get('view') === 'activity' && url.searchParams.get('tab') === 'files'
  );
  await page.reload();
  await page.waitForURL(
    (url) => url.searchParams.get('view') === 'activity' && url.searchParams.get('tab') === 'files'
  );
  assert.equal(await page.locator('#scenario-tab-files').count(), 0);
  await page.goto(route('?view=showcase&section=scenarios&scenario=files'));
  await editor.waitFor();

  await page.getByRole('tab', { name: 'Overview', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await editor.waitFor();
  await page.goto(route('?view=showcase&section=home&mode=dark'));
  await page.getByRole('heading', { name: 'Floe Webapp', exact: true }).waitFor();
  await page.screenshot({ path: '.cache/design-review/acceptance/home-final-dark.png' });
  const fill = await page
    .getByRole('img', { name: 'Floe', exact: true })
    .locator('path')
    .first()
    .evaluate((el) => getComputedStyle(el).fill);
  assert.notEqual(fill, 'rgb(0, 0, 0)');
  assert.deepEqual(errors, []);
  console.log(
    'PASS: lazy home, retained task/editor, history and mode routes, scoped reset, actual storage failure/recovery, keyboard tabs, reduced motion and dark logo'
  );
} finally {
  await browser.close();
}
