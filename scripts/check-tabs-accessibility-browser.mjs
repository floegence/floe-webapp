/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { URL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import solid from 'vite-plugin-solid';

const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(require.resolve('vite'));
const { default: tailwind } = await import(require.resolve('@tailwindcss/vite'));
const server = await createServer({ configFile: false, root: fileURLToPath(new URL('../packages/core/', import.meta.url)),
  optimizeDeps: { entries: ['test/browser/tabs-relations.html'] }, plugins: [solid(), tailwind()],
  resolve: { dedupe: ['solid-js'] }, server: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  for (const width of [390, 1200]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto(`${server.resolvedUrls.local[0]}test/browser/tabs-relations.html`);
    const first = page.locator('[data-group="first"]');
    await first.getByRole('tab', { name: 'one', exact: true }).waitFor();
    const relations = await page.getByRole('tab').evaluateAll(tabs => tabs.map(tab => {
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      return { valid: panel?.getAttribute('aria-labelledby') === tab.id, id: tab.id };
    }));
    assert(relations.every(item => item.valid));
    assert.equal(new Set(relations.map(item => item.id)).size, 6);
    const presentation = () => first.evaluate(root => [root, ...root.querySelectorAll('*')].map(node => {
      const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, font: style.font, color: style.color, padding: style.padding, border: style.border, background: style.backgroundColor };
    }));
    const before = await presentation();
    const pixels = createHash('sha256').update(await first.screenshot({ animations: 'disabled' })).digest('hex');
    const saved = await first.getByRole('tab').evaluateAll(tabs => tabs.map(tab => {
      const attributes = [tab.id, tab.getAttribute('aria-controls')];
      tab.removeAttribute('id'); tab.removeAttribute('aria-controls'); return attributes;
    }));
    assert.deepEqual(await presentation(), before);
    assert.equal(createHash('sha256').update(await first.screenshot({ animations: 'disabled' })).digest('hex'), pixels);
    await first.getByRole('tab').evaluateAll((tabs, records) => tabs.forEach((tab, index) => { tab.id = records[index][0]; tab.setAttribute('aria-controls', records[index][1]); }), saved);
    const one = first.getByRole('tab', { name: 'one', exact: true });
    const three = first.getByRole('tab', { name: 'three', exact: true });
    await one.focus(); await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.activeElement?.id === 'first-three-tab');
    assert.equal(await three.getAttribute('aria-selected'), 'true');
    await page.locator('#first-three-panel').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#first-one-panel').isVisible(), false);
    assert.equal(await page.locator('#second-one-tab').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.activeElement?.id === 'first-one-tab');
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.activeElement?.id === 'first-three-tab');
    await one.click();
    assert.equal(await one.getAttribute('aria-selected'), 'true');
    await page.locator('#first-one-panel').waitFor({ state: 'visible' });
    assert.equal(await first.getByRole('tab', { name: 'two' }).getAttribute('aria-disabled'), 'true');
    await page.close();
  }
  console.log('Tabs relationships, keyboard, focus, pointer and unchanged pixels/styles passed.');
} finally { await browser?.close(); await server.close(); }
