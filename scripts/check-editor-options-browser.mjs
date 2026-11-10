/* global document */
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
const server = await createServer({ configFile: false, root: root + 'packages/core', plugins: [{ name: 'editor-options-fixture', transform(code, id) { if (process.argv.includes('--dist') && id.includes('/test/browser/')) return code.replaceAll('../../src/styles/globals.css', '../../dist/styles.css').replaceAll('../../src/', '../../dist/'); } }, solid(), tailwind()],
  resolve: { dedupe: ['solid-js'] }, optimizeDeps: { entries: ['test/browser/editor-options.html'], include: ['solid-js', 'solid-js/web', 'solid-js/store'] },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } } });
const output = root + '.cache/editor-options'; await mkdir(output, { recursive: true });
await server.listen(); await server.watcher.close();
const browser = await chromium.launch(); const results = [];
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 760 } });
    await page.goto(server.resolvedUrls.local[0] + 'test/browser/editor-options.html');
    await page.waitForFunction(() => !document.querySelector('#permission').disabled);
    const editor = await page.locator('.monaco-editor').elementHandle();
    const type = async text => { await page.locator('.monaco-editor .view-line').first().click(); await page.keyboard.press('End'); await page.keyboard.insertText(text); };
    await type(' editable');
    await page.waitForFunction(() => document.querySelector('#value').textContent === 'initial editable');
    await page.locator('#permission').click(); await type(' forbidden');
    assert.equal(await page.locator('#value').textContent(), 'initial editable', 'A live read-only transition must block native input');
    assert.equal((await page.locator('.monaco-editor .view-lines').innerText()).replaceAll('\u00a0', ' '), 'initial editable');
    await page.locator('#permission').click(); await type(' resumed');
    await page.waitForFunction(() => document.querySelector('#value').textContent === 'initial editable resumed');
    assert.ok(await editor.evaluate(element => element.isConnected), 'Option changes must retain the editor and its model');
    await page.screenshot({ path: output + `/options-${width}.png` });
    results.push({ width, value: await page.locator('#value').textContent(), retained: true, readOnlyTransition: true });
    await page.close();
  }
  await writeFile(output + '/results.json', JSON.stringify(results, null, 2)); console.log(results);
} finally { await browser.close(); await server.close(); }
