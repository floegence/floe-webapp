/* global document, window, getComputedStyle */
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
  optimizeDeps: { entries: ['test/browser/adaptive-layout.html'] }, resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0 } });
await server.listen();
try {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const touch of [false, true]) {
        for (const host of ['browser', 'desktop']) {
          const page = await browser.newPage({ viewport: { width: 1024, height: 720 }, hasTouch: touch, isMobile: touch });
          const errors = []; page.on('pageerror', error => errors.push(error.message));
          await page.goto(`${server.resolvedUrls.local[0]}test/browser/adaptive-layout.html?host=${host}&standalone`);
          for (const width of [1024, 768, 767, 390, 800]) {
            await page.setViewportSize({ width, height: 720 });
            const expected = host === 'browser' && touch && width < 768 ? 'mobile' : 'desktop';
            await page.waitForFunction(expected => document.querySelector('output')?.dataset.interactionMode === expected, expected);
          }
          assert.deepEqual(errors, []);
          await page.close();
        }
      }
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${server.resolvedUrls.local[0]}test/browser/adaptive-layout.html?host=browser`);
      const editor = page.getByRole('textbox', { name: 'Retained draft' });
      const search = page.getByRole('textbox', { name: 'Directory search' });
      await editor.fill('Keep 中文'); await search.fill('src');
      await page.evaluate(() => { window.editor = document.querySelector('textarea'); window.search = document.querySelector('input'); });
      for (const width of [640, 800, 640, 1024, 1280]) {
        await page.setViewportSize({ width, height: 800 });
        const overlay = width < 800;
        await page.waitForFunction(mode => document.querySelector('[data-floe-shell-sidebar-presentation]')?.dataset.floeShellSidebarPresentation === mode, overlay ? 'overlay' : 'inline');
        assert.equal(await page.locator('[data-floe-shell-slot="mobile-tab-bar"]').count(), 0);
        assert.equal(await page.locator('output').getAttribute('data-sidebar-collapsed'), 'false');
        if (overlay) {
          assert.equal(await search.isVisible(), false);
          await page.getByRole('button', { name: 'Files', exact: true }).click();
          const panel = page.getByRole('dialog'); await panel.waitFor();
          await page.waitForFunction(() => document.querySelector('[data-floe-dialog-panel]')?.dataset.floatingPresence === 'open');
          await panel.evaluate(async element => { await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))); });
          const boundary = await page.locator('[data-floe-shell-slot="main-layout"]').boundingBox();
          const rect = await panel.boundingBox();
          assert.ok(Math.abs(rect.x - boundary.x) < 1, `desktop drawer opens from the left edge: ${JSON.stringify({rect, boundary, styles: await panel.evaluate(el => ({ side: el.dataset.floeDrawerSide, transform: getComputedStyle(el).transform, parent: getComputedStyle(el.parentElement).justifyContent, grandparent: getComputedStyle(el.parentElement.parentElement).padding }))})}`);
          assert.ok(rect.width <= boundary.width - 48, 'drawer leaves a visible dismissal strip');
          assert.equal(await search.inputValue(), 'src');
          await panel.press('Escape'); await panel.waitFor({ state: 'detached' });
          await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Files', undefined, { timeout: 3000 });
        } else assert.equal(await search.inputValue(), 'src');
        assert.equal(await editor.evaluate(element => element === window.editor && element.value === 'Keep 中文'), true);
        if (!overlay) assert.equal(await search.evaluate(element => element === window.search), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      }
      assert.deepEqual(errors, []); await page.close();
      console.log(`${engine.name()}: configured mode, standalone resize, left sidebar, retained state and focus passed`);
    } finally { await browser.close(); }
  }
} finally { await server.close(); }
