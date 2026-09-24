/* global document, window, Event, EventTarget */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import solid from 'vite-plugin-solid';
import { chromium, webkit } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(pathToFileURL(resolve(root, 'packages/core/package.json')));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: tailwind } = await import(pathToFileURL(require.resolve('@tailwindcss/vite')).href);
const server = await createServer({ configFile: false, root: resolve(root, 'packages/core'), plugins: [solid(), tailwind()],
  optimizeDeps: { entries: ['test/browser/mobile-navigation.html'] }, resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0 } });
await server.listen();
try {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const size of [{ width: 320, height: 700 }, { width: 393, height: 740 }, { width: 430, height: 740 }, { width: 767, height: 740 }, { width: 667, height: 390 }]) {
        const page = await browser.newPage({ viewport: size, isMobile: true, hasTouch: true });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(({ width, height }) => {
          const viewport = Object.assign(new EventTarget(), { width, height, offsetLeft: 0, offsetTop: 0, scale: 1 });
          Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
          window.setVisibleHeight = height => { viewport.height = height; viewport.dispatchEvent(new Event('resize')); };
        }, size);
        await page.goto(`${server.resolvedUrls.local[0]}test/browser/mobile-navigation.html`);
        const more = page.getByRole('button', { name: 'More', exact: true });
        await more.waitFor();
        assert.equal(await page.locator('[data-floe-shell-slot="top-bar"]').count(), 0);
        await page.getByRole('textbox', { name: 'Retained draft' }).fill('Keep 中文');
        await page.getByRole('textbox', { name: 'Retained draft' }).evaluate(el => { window.savedEditor = el; el.blur(); });
        const nav = page.locator('[data-floe-shell-slot="mobile-tab-bar"]');
        const panel = page.locator('[data-floe-mobile-navigation-panel]');
        for (let iteration = 0; iteration < 3; iteration++) {
          await more.tap();
          await panel.waitFor();
          await page.waitForFunction(() => document.querySelector('[data-floe-mobile-navigation-panel]')?.dataset.floatingPresence === 'open');
          await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState === 'finished'));
          const bounds = await panel.boundingBox(); const bar = await nav.boundingBox();
          assert.ok(bounds.y + bounds.height <= bar.y - 7, 'panel must end above navigation');
          assert.equal(await more.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), true);
          assert.equal(await page.locator('[data-floe-shell-slot="main-layout"]').evaluate(el => el.inert), true);
          assert.equal(await panel.getAttribute('aria-modal'), null);
          await page.getByRole('button', { name: 'Close', exact: true }).waitFor();
          await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Close');
          await more.tap();
          await panel.waitFor({ state: 'detached' });
        }
        await more.tap(); await panel.waitFor();
        await page.getByRole('textbox', { name: 'Search tools' }).fill('Query');
        await page.evaluate(() => window.setVisibleHeight(260));
        assert.equal(await nav.isVisible(), true);
        await page.waitForFunction(() => document.querySelector('[data-floe-shell-slot="mobile-tab-bar"]').getBoundingClientRect().bottom <= 261);
        await page.getByRole('textbox', { name: 'Search tools' }).evaluate(el => el.blur());
        await page.evaluate(height => window.setVisibleHeight(height), size.height);
        await page.getByRole('button', { name: 'Confirm action' }).click();
        const modal = page.getByRole('dialog', { name: 'Confirmation', exact: true });
        await modal.waitFor();
        await modal.getByRole('button', { name: 'Close' }).click();
        await page.locator('[data-floe-dialog-panel]').waitFor({ state: 'detached' });
        await panel.getByRole('button', { name: 'Last action' }).focus();
        await page.keyboard.press('Tab');
        assert.equal(await more.evaluate(el => document.activeElement === el), true, await page.evaluate(() => document.activeElement?.outerHTML));
        await page.keyboard.press('Tab');
        assert.equal(await panel.evaluate(el => el.contains(document.activeElement)), true);
        await panel.press('Escape'); await panel.waitFor({ state: 'detached' });
        assert.equal(await more.evaluate(el => document.activeElement === el), true);
        assert.equal(await page.getByRole('textbox', { name: 'Retained draft' }).evaluate(el => el === window.savedEditor && el.value === 'Keep 中文'), true);
        await more.tap(); await panel.waitFor();
        await page.getByRole('tab', { name: 'Page 9', exact: true }).tap();
        await panel.waitFor({ state: 'detached' });
        await more.tap(); await panel.waitFor();
        await page.setViewportSize({ width: 1024, height: 800 });
        await page.locator('[data-floe-shell-slot="top-bar"]').waitFor();
        assert.equal(await panel.count(), 0);
        assert.deepEqual(errors, []);
        await page.close();
      }
      console.log(`${engine.name()}: mobile navigation geometry, toggling, focus, modal, keyboard and responsive retention passed`);
    } finally { await browser.close(); }
  }
} finally { await server.close(); }
