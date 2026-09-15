/* global document, getComputedStyle, window, requestAnimationFrame, Event */
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
const url = `http://127.0.0.1:${server.httpServer.address().port}/test/browser/file-menu.html`;
try {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const scenario of [
        { width: 1100, height: 720, mode: '', touch: false },
        { width: 1100, height: 720, mode: 'projected', touch: false },
        { width: 1100, height: 720, mode: 'scaled', touch: false },
        { width: 320, height: 640, mode: '', touch: true },
        { width: 375, height: 667, mode: 'short', touch: true },
        { width: 390, height: 844, mode: '', touch: true },
        { width: 667, height: 320, mode: '', touch: true },
      ]) {
        const page = await browser.newPage({
          viewport: scenario,
          hasTouch: scenario.touch,
          isMobile: scenario.touch,
        });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`${url}?mode=${scenario.mode}`);
        const trigger = page.locator('[data-trigger]');
        await trigger.click({ button: 'right' });
        const menu = page.getByRole('menu').first();
        await menu.waitFor();
        await page.waitForFunction(
          () => document.querySelector('[role="menu"]')?.getAttribute('aria-hidden') !== 'true'
        );
        const bounds = await page.locator('[data-files]').boundingBox();
        const box = await menu.boundingBox();
        const debugStyle = await menu.evaluate((el) => ({
          style: el.style.cssText,
          width: el.offsetWidth,
          height: el.offsetHeight,
          transform: getComputedStyle(el).transform,
        }));
        assert.ok(
          box.x >= bounds.x + 7 && box.y >= bounds.y + 7,
          `${engine.name()} ${JSON.stringify(scenario)}: top/left boundary`
        );
        assert.ok(
          box.x + box.width <= bounds.x + bounds.width - 7 &&
            box.y + box.height <= bounds.y + bounds.height - 7,
          `${engine.name()} ${JSON.stringify(scenario)}: bottom/right boundary ${JSON.stringify({ box, bounds, debugStyle })}`
        );
        if (scenario.touch) {
          assert.ok(
            await menu
              .getByRole('menuitem')
              .first()
              .evaluate((el) => el.getBoundingClientRect().height >= 44)
          );
        }
        await page.keyboard.press('End');
        const last = page.getByRole('menuitem', { name: 'Delete', exact: true });
        assert.equal(
          await last.evaluate((el) => document.activeElement === el),
          true,
          'End focuses the last action'
        );
        assert.equal(
          await last.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
          }),
          true
        );
        await last.click();
        await page.waitForFunction(
          () => document.querySelector('[data-action]').textContent === 'delete'
        );
        await trigger.click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'New', exact: true }).click();
        await page.getByRole('menuitem', { name: 'New file', exact: true }).waitFor();
        if (scenario.touch || scenario.width < 400) {
          assert.equal(await page.getByRole('menu').count(), 1);
          await page.getByRole('menuitem', { name: 'Back', exact: false }).click();
          await page.getByRole('menuitem', { name: 'New', exact: true }).waitFor();
        } else {
          await page.keyboard.press('Escape');
          assert.equal(await page.getByRole('menu').count(), 1);
        }
        await page.keyboard.press('Escape');
        await menu.waitFor({ state: 'detached' });
        assert.equal(await trigger.evaluate((el) => el === document.activeElement), true);
        if (scenario.touch) {
          await trigger.dispatchEvent('pointerdown', {
            pointerId: 10,
            pointerType: 'touch',
            isPrimary: true,
            clientX: bounds.x + bounds.width - 20,
            clientY: bounds.y + bounds.height - 20,
          });
          await menu.waitFor();
          await trigger.dispatchEvent('pointerup', {
            pointerId: 10,
            pointerType: 'touch',
            isPrimary: true,
          });
          await trigger.dispatchEvent('click');
          assert.notEqual(await page.locator('[data-action]').textContent(), 'open-file');
          await menu.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
          await page.evaluate(
            () =>
              new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
          );
          assert.equal(await menu.count(), 1, 'local touch scrolling retains the menu');
          await page.keyboard.press('Escape');
        }
        await trigger.click({ button: 'right' });
        await menu.waitFor();
        await page.evaluate(() => window.visualViewport.dispatchEvent(new Event('resize')));
        await menu.waitFor({ state: 'detached' });
        await trigger.click({ button: 'right' });
        await menu.waitFor();
        await page.locator('[data-files]').evaluate((el) => {
          el.hidden = true;
        });
        await menu.waitFor({ state: 'detached' });
        assert.deepEqual(errors, []);
        await page.close();
        console.log(
          `${engine.name()}: ${scenario.width}x${scenario.height} ${scenario.mode || 'activity'} passed`
        );
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
