/* global document */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openSurfaceBrowser, artifactRoot } from './surface-browser-utils.mjs';
const runtime = await openSurfaceBrowser();
const output = resolve(artifactRoot, 'window-tabs'); mkdirSync(output, { recursive: true });
const results = [];
try {
  for (const entry of ['styles', 'tailwind']) for (const mode of ['light', 'dark']) for (const width of [390, 1440]) {
    const page = await runtime.browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(runtime.baseURL + '/current-' + entry + '/dist/?panel=windows&tabs=1&headerActions=1&surface=soft-neumorphic&mode=' + mode + '&theme=' + (mode === 'light' ? 'porcelain-light' : 'classic-dark'));
    const root = page.locator('[data-floe-geometry-surface="floating-window"]').first();
    await root.waitFor();
    await page.waitForFunction(() => document.querySelector('[data-floating-presence]')?.getAttribute('data-floating-presence') === 'open');
    const tabs = root.getByRole('tab');
    assert.equal(await tabs.count(), 9);
    const header = root.locator('[data-floe-floating-window-titlebar]');
    assert.ok(Math.abs((await header.boundingBox()).height - 32) < .1);
    const initial = await root.boundingBox();
    const editor = root.locator('textarea').first();
    if (await editor.count()) await editor.fill('Preserved draft');
    await tabs.first().focus(); await page.keyboard.press('End');
    await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.includes('Document 8'));
    assert.ok(await tabs.last().evaluate(element => element === document.activeElement));
    const tabRect = await tabs.last().boundingBox();
    const rail = await root.getByRole('tablist').boundingBox();
    assert.ok(tabRect.x >= rail.x - 1 && tabRect.x + tabRect.width <= rail.x + rail.width + 1, JSON.stringify({ entry, mode, width, tabRect, rail }));
    await tabs.last().dispatchEvent('dblclick');
    assert.deepEqual(await root.boundingBox(), initial);
    const actions = await root.locator('[data-floe-floating-window-header-actions]').boundingBox();
    assert.ok(rail.x + rail.width <= actions.x + 1);
    const rect = await tabs.last().boundingBox();
    await page.mouse.move(rect.x + 10, rect.y + 10); await page.mouse.down(); await page.mouse.move(rect.x + 30, rect.y + 15); await page.mouse.up();
    assert.deepEqual(await root.boundingBox(), initial);
    await tabs.last().focus(); await page.keyboard.press('Delete');
    await page.waitForFunction(() => document.querySelectorAll('[role="tab"]').length === 8);
    if (await editor.count()) assert.equal(await editor.inputValue(), 'Preserved draft');
    await root.screenshot({ path: resolve(output, entry + '-' + mode + '-' + width + '.png') });
    assert.deepEqual(errors, []); results.push({ entry, mode, width, passed: true }); await page.close();
  }
} finally { await runtime.close(); writeFileSync(resolve(output, 'report.json'), JSON.stringify(results, null, 2)); }
console.log(results.length + ' window tab browser scenarios passed');
