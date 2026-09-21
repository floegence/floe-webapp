/* global document, window, getComputedStyle, requestAnimationFrame, performance, PerformanceObserver, Event */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(new URL('../apps/demo/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = await createServer({
  root: fileURLToPath(new URL('../apps/demo/', import.meta.url)),
  configFile: fileURLToPath(new URL('../apps/demo/vite.config.ts', import.meta.url)),
  server: { host: '127.0.0.1', port: 0 },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.navigationSamples = [];
    window.navigationLongTasks = [];
    new PerformanceObserver((list) => {
      window.navigationLongTasks.push(...list.getEntries().map(({ startTime, duration }) => ({ startTime, duration })));
    }).observe({ type: 'longtask', buffered: true });
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button[aria-label]');
      const id = button?.getAttribute('aria-label')?.toLowerCase();
      if (!['files', 'canvas', 'reports'].includes(id)) return;
      const previous = document.querySelector('[data-floe-keep-alive-view]:not([aria-hidden])');
      const record = { id, previous: previous?.dataset.floeKeepAliveView, started: performance.now(), frames: [] };
      window.navigationSamples.push(record);
      const sample = () => {
        const target = document.querySelector(`[data-floe-keep-alive-view="${id}"]`);
        const displayed = target?.style.display === 'block';
        const canvas = target?.querySelector('canvas');
        const frame = {
          selected: button.getAttribute('aria-pressed') === 'true' || button.getAttribute('aria-selected') === 'true',
          displayed,
          canvasVisible: !canvas || getComputedStyle(canvas).visibility === 'visible',
          canvasPainted: !canvas || canvas.dataset.painted === 'true',
          elapsed: performance.now() - record.started,
        };
        record.frames.push(frame);
        if (record.frames.length < 5) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, true);
  });
  const url = `http://127.0.0.1:${server.httpServer.address().port}/navigation.html`;
  await page.goto(url);
  const grid = page.locator('[data-navigation-page="files"] .grid[style*="grid-template-columns"]');
  await grid.locator('[data-file-browser-item-id]').first().waitFor();
  const switchTo = async (name) => {
    await page.getByRole('button', { name, exact: true }).or(page.getByRole('tab', { name, exact: true })).click();
    await page.locator(`[data-floe-keep-alive-view="${name.toLowerCase()}"]:not([aria-hidden])`).waitFor();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  await grid.evaluate((el) => {
    window.savedGrid = el;
    const viewport = el.parentElement.parentElement;
    viewport.scrollTop = 2400;
    viewport.dispatchEvent(new Event('scroll'));
  });
  await page.waitForFunction(() => document.querySelector('[data-file-browser-item-id]')?.getAttribute('data-file-browser-item-id') !== 'file-0');
  const before = await grid.evaluate((el) => ({ columns: el.style.gridTemplateColumns, items: el.querySelectorAll('button').length, scroll: el.parentElement.parentElement.scrollTop, first: el.querySelector('button')?.dataset.fileBrowserItemId }));
  await switchTo('Canvas');
  assert.deepEqual(await grid.evaluate((el) => ({ columns: el.style.gridTemplateColumns, items: el.querySelectorAll('button').length })), { columns: before.columns, items: before.items }, 'hidden navigation must preserve the measured grid and rendered range');
  const draft = page.getByRole('textbox', { name: 'Draft', exact: true });
  await draft.fill('Retained draft');
  await page.locator('canvas').evaluate((el) => { window.savedCanvas = el; });
  await switchTo('Files');
  assert.deepEqual(await grid.evaluate((el) => ({ columns: el.style.gridTemplateColumns, items: el.querySelectorAll('button').length, scroll: el.parentElement.parentElement.scrollTop, first: el.querySelector('button')?.dataset.fileBrowserItemId })), before, 'returning to Files must retain the exact scroll position and virtual rows');
  assert.equal(await grid.evaluate((el) => el === window.savedGrid), true);
  await switchTo('Canvas');
  assert.equal(await draft.inputValue(), 'Retained draft');
  assert.equal(await page.locator('canvas').evaluate((el) => el === window.savedCanvas), true);
  assert.equal(await page.locator('canvas').evaluate((el) => el.getContext('2d').getImageData(1, 1, 1, 1).data[3]), 255, 'the presented canvas must contain opaque pixels');
  await switchTo('Files');

  // A cold module is deliberately held: navigation remains usable and late completion stays hidden.
  let releaseModule;
  const held = new Promise((resolve) => { releaseModule = resolve; });
  await page.route('**/ReportsPage.tsx*', async (route) => { await held; await route.continue(); });
  await switchTo('Reports');
  await page.getByRole('status').filter({ hasText: 'Opening reports' }).waitFor();
  await switchTo('Files');
  releaseModule();
  await page.locator('[data-navigation-page="reports"]').waitFor({ state: 'attached' });
  assert.equal(await page.locator('[data-floe-keep-alive-view="reports"]').getAttribute('aria-hidden'), 'true');
  assert.equal(await page.getByRole('button', { name: 'Files', exact: true }).getAttribute('aria-pressed'), 'true');
  await switchTo('Reports');
  await page.getByRole('textbox', { name: 'Review notes' }).fill('Keep these notes');
  await switchTo('Files');

  // Measure warmed navigation independently of Vite compilation and initial module work.
  const started = await page.evaluate(() => { window.navigationSamples = []; return performance.now(); });
  for (let index = 0; index < 20; index += 1) await switchTo(index % 2 ? 'Files' : 'Canvas');
  await page.waitForFunction(() => window.navigationSamples.at(-1)?.frames.length === 5);
  const evidence = await page.evaluate((started) => ({ samples: window.navigationSamples, longTasks: window.navigationLongTasks.filter((task) => task.startTime >= started) }), started);
  const intent = [];
  const content = [];
  for (const sample of evidence.samples) {
    assert.equal(sample.frames[0].selected, true, 'navigation intent must reach the first frame');
    assert.equal(sample.frames[0].displayed, false, 'the previous page must remain until the intent paint');
    assert.ok(sample.frames.every((frame) => !frame.displayed || (frame.canvasVisible && frame.canvasPainted)), 'no visible container may expose a hidden or unpainted canvas');
    intent.push(sample.frames[0].elapsed);
    content.push(sample.frames.find((frame) => frame.displayed).elapsed);
  }
  const p95 = (values) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];
  assert.ok(p95(intent) <= 16.7, `intent presentation p95 ${p95(intent)} ms exceeds 16.7 ms`);
  assert.ok(Math.max(...intent) <= 32, 'intent presentation maximum exceeds 32 ms');
  assert.ok(p95(content) <= 50, `warm presentation p95 ${p95(content)} ms exceeds 50 ms`);
  assert.ok(Math.max(...content) <= 100, 'warm presentation maximum exceeds 100 ms');
  const frameGaps = evidence.samples.flatMap(({ frames }) => frames.slice(1).map((frame, index) => frame.elapsed - frames[index].elapsed));
  assert.ok(Math.max(...frameGaps) < 50, 'warm navigation must not create a 50 ms frame gap');
  assert.deepEqual(evidence.longTasks, [], 'warm navigation must not create long renderer tasks');

  // A real resize while hidden must still update the returning layout.
  await switchTo('Canvas');
  await page.setViewportSize({ width: 900, height: 700 });
  await switchTo('Files');
  assert.notEqual(await grid.evaluate((el) => el.style.gridTemplateColumns), before.columns);
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  const list = page.locator('[data-navigation-page="files"] .overflow-auto').filter({ has: page.locator('[data-file-browser-item-id]') }).last();
  await list.evaluate((el) => { el.scrollTop = 1600; el.dispatchEvent(new Event('scroll')); });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const listBefore = await list.evaluate((el) => ({ scroll: el.scrollTop, items: el.querySelectorAll('[data-file-browser-item-id]').length }));
  await switchTo('Canvas');
  await switchTo('Files');
  assert.deepEqual(await list.evaluate((el) => ({ scroll: el.scrollTop, items: el.querySelectorAll('[data-file-browser-item-id]').length })), listBefore);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await switchTo('Reports');
  assert.equal(await page.getByRole('textbox', { name: 'Review notes' }).inputValue(), 'Keep these notes');
  await page.getByRole('button', { name: 'Files', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-floe-keep-alive-view="files"]:not([aria-hidden])').waitFor();
  assert.equal(await page.locator('[data-floe-keep-alive-view="reports"]').evaluate((el) => el.inert), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await switchTo('Canvas');
  assert.equal(await draft.inputValue(), 'Retained draft');
  assert.equal(await page.locator('canvas').evaluate((el) => el.getBoundingClientRect().width <= window.innerWidth), true);
  await switchTo('Files');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks: 'grid/list scroll, DOM identity, canvas pixels, cold loading, latest selection, resize, keyboard, reduced motion', warmSwitches: evidence.samples.length, intentP95Ms: p95(intent), contentP95Ms: p95(content), contentMaxMs: Math.max(...content), frameGapMaxMs: Math.max(...frameGaps), longTasks: evidence.longTasks.length }, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
