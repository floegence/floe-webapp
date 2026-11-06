/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import solid from 'vite-plugin-solid';
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(require.resolve('vite'));
const { default: tailwind } = await import(require.resolve('@tailwindcss/vite'));
const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({ configFile: false, root: root + 'packages/core', plugins: [{ name: 'packed-preview-fixture', transform(code, id) { if (process.argv.includes('--dist') && id.includes('/test/browser/')) return code.replaceAll('../../src/styles/globals.css', '../../dist/styles.css').replaceAll('../../src/', '../../dist/'); } }, solid(), tailwind()],
  resolve: { dedupe: ['solid-js'] },
  optimizeDeps: { entries: ['test/browser/editor-preview.html'], include: ['solid-js', 'solid-js/web', 'solid-js/store'] },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } },
});
const output = root + '.cache/editor-preview';
await mkdir(output, { recursive: true });
await server.listen();
await server.watcher.close();
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto(server.resolvedUrls.local[0] + 'test/browser/editor-preview.html');
    await page.locator('.find-widget.visible').waitFor();
    await page.screenshot({path: output + '/initial.png'});
    await page.locator('.find-widget textarea[aria-label=Find]').fill('License');
    await page.waitForTimeout(250);
    for (const label of ['Find in Selection', 'Close']) {
      const target = page.locator('.find-widget [aria-label^="' + label + '"]');
      await target.hover({ force: true });
      const samples = [];
      for (let index = 0; index < 12; index++) {
        await page.waitForTimeout(100);
        samples.push(await target.evaluate(element => {
          const rect = element.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          const tip = [...document.querySelectorAll('.monaco-hover')].find(el => el.getBoundingClientRect().width > 0);
          return { hit: !!hit && element.contains(hit), tooltip: tip?.textContent ?? '', width: tip?.getBoundingClientRect().width, rect: tip?.getBoundingClientRect().toJSON(), trigger: rect.toJSON(), hitTag: hit?.outerHTML.slice(0,300), parent: tip?.closest('.context-view')?.outerHTML.slice(0,500) };
        }));
      }
      results.push({ width, label, samples });
      await page.screenshot({ path: output + '/' + width + '-' + label.replaceAll(' ', '-') + '.png' });
      await page.mouse.move(0, 0);
    }
    const input = page.locator('.find-widget textarea[aria-label=Find]');
    await input.fill('License');
    const before = await page.locator('.editor-fixture').boundingBox();
    await page.locator('#switch').click();
    const isolation = await page.locator('#editor-panel').evaluate(panel => {
      const leak = panel.querySelector('#explicit-visible');
      return { opacity: getComputedStyle(panel).opacity, widgetVisibility: getComputedStyle(leak).visibility, width: panel.getBoundingClientRect().width };
    });
    results.push({ width, isolation });
    await page.screenshot({ path: output + '/' + width + '-inactive.png' });
    await page.locator('#switch').click();
    assert.deepEqual(await page.locator('.editor-fixture').boundingBox(), before);
    assert.equal(await input.inputValue(), 'License');
    await page.close();
  }
  await writeFile(output + '/results.json', JSON.stringify(results, null, 2));
  console.log(results.map(({ width, label, isolation, samples }) => ({ width, label, isolation, stable: samples?.slice(5).every(sample => sample.hit && sample.tooltip) })));
  assert.ok(results.filter(result => result.samples).every(result => result.samples.slice(5).every(sample => sample.hit && sample.tooltip && sample.rect.top >= sample.trigger.bottom - 1)), 'Find tooltips must stay visible without covering their trigger');
  assert.ok(results.filter(result => result.isolation).every(result => result.isolation.opacity === '0'), 'Inactive retained panels must suppress explicitly visible descendants');
} finally { await browser.close(); await server.close(); }
