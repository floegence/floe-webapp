/* global window, document */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { URL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import solid from 'vite-plugin-solid';
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(require.resolve('vite'));
const { default: tailwind } = await import(require.resolve('@tailwindcss/vite'));
const server = await createServer({ configFile: false, root: fileURLToPath(new URL('../packages/core/', import.meta.url)), optimizeDeps: { entries: ['test/browser/split-workspace.html'] }, plugins: [solid(), tailwind()], resolve: { dedupe: ['solid-js'] }, server: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  await server.listen(); browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0] + 'test/browser/split-workspace.html');
  await page.getByRole('textbox', { name: 'a', exact: true }).fill('retained draft');
  await page.evaluate(() => { window.savedInput = document.querySelector('textarea'); });
  for (const preset of ['single','columns','rows','three-columns','main-left','grid']) {
    await page.evaluate(value => window.workspace.preset(value), preset);
    assert.equal(await page.evaluate(() => document.querySelector('textarea') === window.savedInput), true);
    assert.equal(await page.getByRole('textbox', { name: 'a', exact: true }).inputValue(), 'retained draft');
  }
  const separator = page.getByRole('separator').first();
  await separator.focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await separator.getAttribute('aria-valuenow'), '55');
  await page.keyboard.press('Enter'); assert.equal(await separator.getAttribute('aria-valuenow'), '50');
  const box = await separator.boundingBox();
  const before = await page.evaluate(() => window.workspace.state().commits);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + box.height / 2, { steps: 8 });
  assert.equal(await page.evaluate(() => window.workspace.state().commits), before);
  await page.mouse.up(); assert.equal(await page.evaluate(() => window.workspace.state().commits), before + 1);
  assert.equal(await page.locator('html').getAttribute('data-floe-hot-interaction'), null);
  for (const edge of ['left', 'right', 'top', 'bottom', 'center']) {
    await page.evaluate(() => window.workspace.preset('columns'));
    const target = page.locator('[data-floe-split-pane="b"]');
    const bounds = await target.boundingBox();
    const positions = { left: { x: 4, y: bounds.height / 2 }, right: { x: bounds.width - 4, y: bounds.height / 2 }, top: { x: bounds.width / 2, y: 4 }, bottom: { x: bounds.width / 2, y: bounds.height - 4 }, center: { x: bounds.width / 2, y: bounds.height / 2 } };
    await page.locator('[data-floe-split-header="a"]').dragTo(target, { targetPosition: positions[edge] });
    const state = await page.evaluate(() => window.workspace.state());
    assert.equal(state.layout.axis, edge === 'top' || edge === 'bottom' ? 'y' : 'x');
    assert.deepEqual(state.ids, ['right', 'bottom', 'center'].includes(edge) ? ['b', 'a'] : ['a', 'b']);
    assert.equal(state.active, 'a');
  }
  await page.evaluate(() => window.workspace.maximize('b'));
  assert.equal(await page.locator('[data-floe-split-pane]:visible').count(), 1);
  await page.evaluate(() => window.workspace.maximize(null));
  assert.equal(await page.locator('[data-floe-split-pane]:visible').count(), 2);
  const savedLayout = await page.evaluate(() => JSON.stringify(window.workspace.state().layout));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.workspace.compact(true));
  assert.equal(await page.locator('[data-floe-split-pane]:visible').count(), 1);
  await page.evaluate(() => window.workspace.compact(false));
  assert.equal(await page.evaluate(() => JSON.stringify(window.workspace.state().layout)), savedLayout);
  assert.deepEqual(await page.evaluate(() => ({ mounts: window.workspace.state().mounts, cleanups: window.workspace.state().cleanups })), { mounts: 4, cleanups: 0 });
  assert.deepEqual(errors, []);
  console.log('Split workspace: presets, retained drafts, keyboard/pointer resizing, single commit, docking, maximize and mobile continuity passed.');
} finally { await browser?.close(); await server.close(); }
