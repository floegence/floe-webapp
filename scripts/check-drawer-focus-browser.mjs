/* global document, window, requestAnimationFrame, getComputedStyle */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium, webkit } from 'playwright';

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
try {
  for (const [name, engine] of Object.entries({ chromium, webkit })) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const projected of [false, true]) {
        for (const height of [480, 740]) {
          const page = await browser.newPage({
            viewport: { width: 393, height },
            hasTouch: true,
            isMobile: true,
          });
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await page.goto(
            `http://127.0.0.1:${server.httpServer.address().port}/test/browser/drawer-focus.html${projected ? '?projected' : ''}`
          );
          await page.locator('[data-page-header]').waitFor();
          for (const trigger of ['[data-header-trigger]', '[data-tab-trigger]']) {
            // Sample every painted frame: final geometry misses focus-induced scrolling
            // that reverses itself as the drawer's transform finishes.
            await page.evaluate(() => {
              window.drawerFocusFrames = [];
              window.recordDrawerFocus = true;
              const sample = () => {
                const panel = document.querySelector('[data-floe-dialog-panel]');
                window.drawerFocusFrames.push({
                  headerTop: document.querySelector('[data-page-header]').getBoundingClientRect()
                    .top,
                  pageScroll: document.querySelector('[data-page-clip]').scrollTop,
                  bodyScroll: document.scrollingElement.scrollTop,
                  panelTop: panel?.getBoundingClientRect().top,
                  opacity: panel ? Number(getComputedStyle(panel).opacity) : null,
                });
                if (window.recordDrawerFocus) requestAnimationFrame(sample);
              };
              sample();
            });
            await page.locator(trigger).tap();
            const drawer = page.getByRole('dialog', { name: 'Conversations', exact: true });
            const close = drawer.getByRole('button', { name: 'Close conversations', exact: true });
            await close.waitFor();
            await page.waitForFunction(
              () => document.activeElement?.textContent === 'Close conversations'
            );
            await page.waitForFunction(() => {
              const panel = document.querySelector('[data-floe-dialog-panel]');
              return (
                panel &&
                getComputedStyle(panel).opacity === '1' &&
                panel.getAnimations().every((animation) => animation.playState === 'finished')
              );
            });
            const frames = await page.evaluate(() => {
              window.recordDrawerFocus = false;
              return window.drawerFocusFrames;
            });
            const label = `${name}/${height}/${projected ? 'projected' : 'page'}/${trigger}`;
            assert.ok(
              frames.some((frame) => frame.opacity !== null && frame.opacity < 1),
              `${label}: sampled drawer entry`
            );
            assert.ok(
              frames.every(
                (frame) =>
                  Math.abs(frame.headerTop - frames[0].headerTop) < 1 &&
                  frame.pageScroll === 0 &&
                  frame.bodyScroll === 0
              ),
              `${label}: drawer focus moved the page: ${JSON.stringify(frames)}`
            );
            // Keyboard navigation must still reveal targets in the drawer's own list.
            await close.press('Shift+Tab');
            await page.waitForFunction(
              () => document.activeElement?.textContent === 'Conversation 40'
            );
            assert.ok(await page.locator('[data-list-scroll]').evaluate((el) => el.scrollTop > 0));
            await drawer.press('Escape');
            await drawer.waitFor({ state: 'detached' });
            await page.waitForFunction(
              (selector) => document.activeElement === document.querySelector(selector),
              trigger
            );
            assert.equal(await page.locator('[data-page-clip]').evaluate((el) => el.scrollTop), 0);
          }
          assert.deepEqual(errors, []);
          await page.close();
        }
      }
      console.log(
        `${name}: animated drawer focus, local scrolling, restored focus, and projected boundaries passed`
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
