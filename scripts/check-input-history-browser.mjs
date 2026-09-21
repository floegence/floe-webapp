/* global document, window, KeyboardEvent, CompositionEvent */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const requireCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(requireCore.resolve('vite'));
const fixture = `
import { createInputHistoryController } from '/packages/core/dist/chat.js';
const editor = document.querySelector('textarea');
let value = '', revision = 0;
const entries = [{id:'first',text:'First line\\n第二行 🙂'}, {id:'latest',text:'Latest input'}];
const controller = createInputHistoryController({
  read: () => ({scope:'thread',value,revision,entries,enabled:true}),
  write: text => {value=text;revision++;editor.value=text;controller.synchronize();},
  onChange: (state, reason) => document.querySelector('output').textContent = JSON.stringify({state,reason}),
});
editor.addEventListener('keydown', event => controller.handleKeyDown(event, editor));
editor.addEventListener('input', () => {controller.reset();value=editor.value;revision++;});
for (const type of ['paste','pointerdown','compositionstart','blur']) editor.addEventListener(type, controller.reset);
window.historyFixture = {controller,entries};
`;
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  plugins: [{
    name: 'input-history-fixture',
    resolveId(id) { if (id === '/fixture.js') return id; },
    load(id) { if (id === '/fixture.js') return fixture; },
    configureServer(instance) {
      instance.middlewares.use((req, res, next) => {
        if (req.url !== '/') return next();
        res.setHeader('Content-Type', 'text/html');
        res.end('<html><body><textarea aria-label="Message" rows="6"></textarea><button>Outside</button><output aria-live="polite"></output><script type="module" src="/fixture.js"></script></body></html>');
      });
    },
  }],
  server: { host: '127.0.0.1', port: 0, hmr: false },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]);
  const editor = page.getByRole('textbox', { name: 'Message' });
  await editor.focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await editor.inputValue(), '');
  await page.keyboard.press('ArrowUp');
  assert.equal(await editor.inputValue(), 'Latest input');
  assert.equal(await editor.evaluate(node => node.selectionStart), 12);
  await page.keyboard.press('ArrowUp');
  assert.equal(await editor.inputValue(), 'First line\n第二行 🙂');
  await page.keyboard.press('ArrowUp');
  assert.equal(await editor.inputValue(), 'First line\n第二行 🙂');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  assert.equal(await editor.inputValue(), '');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Escape');
  assert.equal(await editor.inputValue(), '');

  await page.keyboard.press('ArrowUp');
  await page.keyboard.type(' edited');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Escape');
  assert.equal(await editor.inputValue(), 'Latest input edited');
  await editor.fill('');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown');
  assert.equal(await editor.inputValue(), 'First line\n第二行 🙂');
  await editor.fill('');
  await page.keyboard.press('Shift+ArrowUp');
  assert.equal(await editor.inputValue(), '');
  await editor.evaluate(node => {
    node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', isComposing: true, bubbles: true }));
    node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  });
  assert.equal(await editor.inputValue(), '');
  await page.keyboard.press('ArrowUp');
  await page.getByRole('button', { name: 'Outside' }).focus();
  await editor.focus();
  await page.keyboard.press('Escape');
  assert.equal(await editor.inputValue(), 'Latest input');
  await editor.fill('');
  await page.evaluate(() => window.historyFixture.entries.push({ id: 'long', text: 'line\n'.repeat(1000) }));
  await page.keyboard.press('ArrowUp');
  assert.equal(await editor.inputValue(), 'line\n'.repeat(1000));
  assert.equal(await editor.evaluate(node => node.selectionStart === node.value.length && document.activeElement === node), true);
  await page.keyboard.press('Escape');
  assert.equal(await editor.inputValue(), '');
  assert.deepEqual(errors, []);
  console.log('PASS: real textarea history, multiline caret, editing, modifiers, IME, blur and long input');
} finally {
  await browser?.close();
  await server.close();
}
