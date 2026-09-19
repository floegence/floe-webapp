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
  await page.goto(
    `http://127.0.0.1:${server.httpServer.address().port}/test/browser/persistent-scrollbar.html`
  );
  const bar = page.getByRole('scrollbar', { name: 'Scroll content horizontally' });
  const viewport = page.locator('#viewport');
  const left = () => viewport.evaluate((el) => el.scrollLeft);
  await bar.waitFor({ timeout: 3000 });
  assert.equal(await bar.getAttribute('aria-controls'), 'viewport');
  assert.equal(await viewport.evaluate((el) => getComputedStyle(el).paddingLeft), '8px');
  assert.equal(await viewport.evaluate((el) => getComputedStyle(el).borderLeftWidth), '2px');
  await page.waitForFunction(() => {
    const viewport = document.querySelector('#viewport');
    return (
      Number(document.querySelector('[role=scrollbar]').getAttribute('aria-valuemax')) ===
      viewport.scrollWidth - viewport.clientWidth
    );
  });
  const metrics = await viewport.evaluate((el) => ({
    maximum: el.scrollWidth - el.clientWidth,
    width: el.clientWidth,
  }));
  const nativeEnd = await viewport.evaluate((el) => {
    el.scrollLeft = Number.MAX_SAFE_INTEGER;
    const end = el.scrollLeft;
    el.scrollLeft = 0;
    return end;
  });
  for (const scaled of [false, true]) {
    if (scaled) await page.getByRole('button', { name: 'Toggle scale' }).click();
    await bar.focus();
    await page.keyboard.press('End');
    assert.equal(await left(), nativeEnd);
    await page.keyboard.press('Home');
    assert.equal(await left(), 0);
    await page.keyboard.press('ArrowRight');
    assert.equal(await left(), 48);
    await page.keyboard.press('PageDown');
    assert.equal(await left(), 48 + metrics.width);
    await page.keyboard.press('Home');
    const thumb = bar.locator('[data-floe-horizontal-scrollbar-thumb]');
    const trackBox = await bar.boundingBox();
    const thumbBox = await thumb.boundingBox();
    const delta = (trackBox.width - thumbBox.width) / 2;
    await page.mouse.move(thumbBox.x + thumbBox.width / 2, thumbBox.y + thumbBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      thumbBox.x + thumbBox.width / 2 + delta,
      thumbBox.y + thumbBox.height / 2,
      { steps: 8 }
    );
    await page.mouse.up();
    assert.ok(Math.abs((await left()) - metrics.maximum / 2) < 8, 'thumb drag honors rendered canvas scale');
    await page.mouse.click(trackBox.x + trackBox.width - 2, trackBox.y + trackBox.height / 2);
    assert.ok((await left()) > metrics.maximum - 20, 'track click reaches the content end');
  }
  await viewport.evaluate((el) => {
    el.scrollLeft = 240;
    el.scrollTop = 400;
  });
  await page.waitForFunction(
    () => document.querySelector('[role="scrollbar"]').getAttribute('aria-valuenow') === '240'
  );
  assert.equal(await viewport.evaluate((el) => el.scrollTop), 400);
  await page.getByRole('button', { name: 'Toggle content width' }).click();
  await bar.waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Toggle content width' }).click();
  await bar.waitFor();
  await viewport.evaluate((el) => {
    el.style.width = '2000px';
  });
  await bar.waitFor({ state: 'detached' });
  await viewport.evaluate((el) => {
    el.style.width = '480px';
  });
  await bar.waitFor();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(
    await bar
      .locator('[data-floe-horizontal-scrollbar-thumb]')
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    '0s'
  );
  await page.emulateMedia({ forcedColors: 'active' });
  assert.notEqual(
    await bar.evaluate((el) => getComputedStyle(el).backgroundColor),
    'rgba(0, 0, 0, 0)'
  );
  assert.deepEqual(errors, []);
  console.log(
    'Persistent scrollbar passed: overflow lifecycle, native scroll sync, keyboard, track, scaled drag, reduced motion and forced colors.'
  );
} finally {
  await browser?.close();
  await server.close();
}
