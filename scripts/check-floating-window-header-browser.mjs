/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openSurfaceBrowser, artifactRoot } from './surface-browser-utils.mjs';

const output = resolve(artifactRoot, 'window-header');
mkdirSync(output, { recursive: true });
const runtime = await openSurfaceBrowser();
const demo = process.argv.find((arg) => arg.startsWith('--demo='))?.slice('--demo='.length);
const cases = [];
const report = { cases };
try {
  for (const entry of demo ? ['demo'] : ['styles', 'tailwind']) {
    for (const surface of ['standard', 'soft-neumorphic']) {
      for (const mode of ['light', 'dark']) {
        for (const width of [390, 1440]) {
          const name = `${entry}-${surface}-${mode}-${width}`;
          const page = await runtime.browser.newPage({ viewport: { width, height: 1000 } });
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          const base = demo ?? `${runtime.baseURL}/current-${entry}/dist/`;
          await page.goto(
            `${base}?view=showcase&panel=windows&surface=${surface}&mode=${mode}&theme=${mode === 'dark' ? 'classic-dark' : 'paper'}#ui-floating-window`
          );
          if (demo)
            await page.getByRole('button', { name: 'Open Floating Window', exact: true }).click();
          const geometry = page.locator('[data-floe-geometry-surface="floating-window"]').first();
          const panel = geometry.locator('[data-floe-floating-window-surface]');
          const titlebar = panel.locator('[data-floe-floating-window-titlebar]');
          await panel.waitFor();
          await page.waitForTimeout(250);
          const initial = await geometry.boundingBox();
          const dimensions = await titlebar.evaluate((element) => {
            const header = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              height: header.height,
              titleFont: getComputedStyle(element.querySelector('h2')).fontSize,
              buttons: [...element.querySelectorAll('button')].map((button) => {
                const rect = button.getBoundingClientRect();
                return {
                  width: rect.width,
                  height: rect.height,
                  topGap: rect.top - header.top,
                  bottomGap: header.bottom - rect.bottom,
                  rightGap: header.right - rect.right,
                  radius: getComputedStyle(button).borderRadius,
                };
              }),
              divider: parseFloat(style.borderBottomWidth),
            };
          });
          assert.equal(dimensions.height, 32, `${name}: header stays compact`);
          assert.equal(dimensions.titleFont, '12px', `${name}: title size is actually applied`);
          assert.deepEqual(
            dimensions.buttons.map((button) => button.width),
            [36, 40]
          );
          for (const button of dimensions.buttons) {
            assert.equal(button.topGap, 0);
            assert.equal(button.height, dimensions.height - dimensions.divider);
            assert.equal(button.bottomGap, dimensions.divider);
            assert.equal(button.radius, '0px');
          }
          assert.equal(dimensions.buttons[1].rightGap, 0);
          const maximize = panel.locator('[data-floe-floating-window-control="maximize"]');
          const close = panel.locator('[data-floe-floating-window-control="close"]');
          const controls = { maximize, close };
          // Edge points are outside the small centered glyph, inside the existing
          // four-pixel resize perimeter. A large painted button must be clickable.
          for (const button of Object.values(controls)) {
            const rect = await button.boundingBox();
            for (const point of [
              { x: rect.x + 6, y: rect.y + 6 },
              { x: rect.x + rect.width - 6, y: rect.y + rect.height - 3 },
            ]) {
              assert.ok(
                await button.evaluate(
                  (element, point) => element.contains(document.elementFromPoint(point.x, point.y)),
                  point
                )
              );
            }
          }
          const maxRect = await maximize.boundingBox();
          await page.mouse.move(maxRect.x + 6, maxRect.y + 6);
          await page.mouse.down();
          await page.mouse.move(maxRect.x + 8, maxRect.y + 7);
          assert.equal(await panel.getAttribute('data-floe-surface-interacting'), null);
          assert.deepEqual(await geometry.boundingBox(), initial);
          await page.mouse.up();
          await panel.getByRole('button', { name: 'Restore', exact: true }).waitFor();
          // Button focus is separate from dragging. Enter restores the same rect.
          await maximize.focus();
          await page.keyboard.press('Enter');
          assert.deepEqual(await geometry.boundingBox(), initial);
          // Isolate the bubbling dblclick event: a second control click must not
          // trigger an extra toggle through the titlebar's double-click handler.
          await maximize.dispatchEvent('dblclick');
          assert.deepEqual(await geometry.boundingBox(), initial);
          await geometry.focus();
          await page.keyboard.press('Tab');
          assert.ok(await maximize.evaluate((element) => element.matches(':focus-visible')));
          const focus = await maximize.evaluate((element) => {
            const style = getComputedStyle(element);
            return {
              outline: style.outlineStyle,
              width: style.outlineWidth,
              offset: style.outlineOffset,
            };
          });
          assert.deepEqual(focus, { outline: 'solid', width: '2px', offset: '-3px' });
          await page.keyboard.press('Tab');
          assert.ok(await close.evaluate((element) => element.matches(':focus-visible')));
          await panel.screenshot({ path: resolve(output, `${name}-keyboard.png`) });
          await close.evaluate((element) => element.blur());
          await close.hover();
          await page.waitForTimeout(180);
          await panel.screenshot({ path: resolve(output, `${name}-hover.png`) });
          await page.emulateMedia({ forcedColors: 'active' });
          await geometry.focus();
          await page.keyboard.press('Tab');
          assert.equal(await maximize.evaluate((el) => getComputedStyle(el).outlineStyle), 'solid');
          await page.emulateMedia({ forcedColors: 'none' });
          const closeRect = await close.boundingBox();
          await page.mouse.click(closeRect.x + 6, closeRect.y + closeRect.height - 3);
          await panel.waitFor({ state: 'detached' });
          if (!demo) {
            await page.goto(`${base}?view=showcase&panel=windows&surface=${surface}&mode=${mode}&headerActions=1`);
            await panel.waitFor();
            await page.waitForTimeout(250);
            const actions = titlebar.locator('[data-floe-floating-window-header-actions]');
            const copy = actions.getByRole('button', { name: 'Copy reference', exact: true });
            await titlebar.locator('h2').evaluate((element) => {
              element.textContent = 'A very long document filename that must preserve all header actions.md';
            });
            const actionRect = await actions.boundingBox();
            const titleRect = await titlebar.locator('h2').boundingBox();
            const controlRect = await maximize.boundingBox();
            assert.ok(titleRect.x + titleRect.width <= actionRect.x);
            assert.ok(actionRect.x + actionRect.width <= controlRect.x);
            assert.equal((await titlebar.boundingBox()).height, 32);
            assert.ok((await copy.boundingBox()).height <= 28, 'Host actions fit the existing titlebar');
            const beforeActions = await geometry.boundingBox();
            await copy.click();
            assert.equal(await copy.textContent(), '1');
            await copy.focus();
            await page.keyboard.press('Enter');
            assert.equal(await copy.textContent(), '2');
            await actions.dispatchEvent('dblclick');
            assert.deepEqual(await geometry.boundingBox(), beforeActions);
            await page.mouse.move(actionRect.x + actionRect.width - 8, actionRect.y + 10);
            await page.mouse.down();
            await page.mouse.move(actionRect.x + actionRect.width - 5, actionRect.y + 12);
            assert.equal(await panel.getAttribute('data-floe-surface-interacting'), null);
            await page.mouse.up();
            assert.deepEqual(await geometry.boundingBox(), beforeActions);
            await panel.screenshot({ path: resolve(output, `${name}-actions.png`) });
          }
          assert.deepEqual(errors, []);
          cases.push({ name, ...dimensions, initial, passed: true });
          await page.close();
        }
      }
    }
  }
} catch (error) {
  report.failure = error.stack;
  process.exitCode = 1;
} finally {
  await runtime.close();
  writeFileSync(
    resolve(output, demo ? 'demo-report.json' : 'report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log(
    report.failure ??
      `${cases.length} window header scenarios passed (${demo ? 'real Demo' : 'packed CSS entries'}).`
  );
}
