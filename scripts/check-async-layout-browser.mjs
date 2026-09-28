/* global window, document, Event, getComputedStyle */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from 'playwright';
import solid from 'vite-plugin-solid';

const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(require.resolve('vite'));
const { default: tailwind } = await import(require.resolve('@tailwindcss/vite'));
const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../packages/core/', import.meta.url)),
  optimizeDeps: { entries: ['test/browser/async-layout.html'] },
  plugins: [solid(), tailwind(), { name: 'delayed-media-fixture', configureServer(instance) {
    instance.middlewares.use((req, res, next) => {
      if (req.url !== '/test-image.svg') return next();
      res.setHeader('Content-Type', 'image/svg+xml');
      res.end('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="800"><rect width="200" height="800" fill="green"/></svg>');
    });
  } }],
  resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0 },
});
let browser;
const geometry = page => page.locator('[data-case], [data-label-alignment], [data-media], [data-media-neighbor]').evaluateAll(nodes => nodes.map(node => {
  const { x, y, width, height } = node.getBoundingClientRect();
  return { id: node.getAttribute('data-case') ?? node.tagName, x, y, width, height };
}));
async function assertLabelAlignment(page) {
  const labels = await page.locator('[data-label-alignment]').evaluateAll(buttons => buttons.map(button => {
    const visible = button.querySelector('span[style*="inline-grid"] > span:last-child');
    const range = document.createRange(); range.selectNodeContents(visible);
    const text = range.getBoundingClientRect(), bounds = button.getBoundingClientRect();
    const icon = button.firstElementChild.getBoundingClientRect();
    return {
      id: button.getAttribute('data-label-alignment'),
      text: visible.textContent,
      whiteSpace: getComputedStyle(button).whiteSpace,
      lines: new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => rect.top)).size,
      offset: Math.abs(text.y + text.height / 2 - icon.y - icon.height / 2),
      contained: text.top >= bounds.top && text.bottom <= bounds.bottom && text.left >= bounds.left && text.right <= bounds.right,
    };
  }));
  for (const label of labels) {
    assert.equal(label.whiteSpace, 'nowrap', `Buttons inherit the single-line contract: ${JSON.stringify(label)}`);
    assert.equal(label.lines, 1, `Button labels must never wrap: ${JSON.stringify(label)}`);
    assert.ok(label.offset <= 2, `Visible label and icon must align: ${JSON.stringify(label)}`);
    assert.ok(label.contained, `Visible label must fit: ${JSON.stringify(label)}`);
  }
}
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const failures = [];
  for (const width of [1000, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${server.resolvedUrls.local[0]}test/browser/async-layout.html`);
    await page.waitForFunction(() => typeof window.resolveMedia === 'function');
    const idle = await geometry(page);
    await assertLabelAlignment(page);
    await page.getByRole('button', { name: 'Toggle pending' }).click();
    const pending = await geometry(page);
    await assertLabelAlignment(page);
    assert.equal(await page.locator('[data-case="plain"]').getAttribute('aria-busy'), 'true');
    assert.equal(await page.locator('[data-case="plain"]').isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Kopiert', exact: true }).count(), 1, 'Reserved labels must not enter the accessible name');
    assert.ok(await page.locator('[data-case="feedback"]').evaluate(node => node.scrollHeight > node.clientHeight), 'Long errors remain scrollable');
    if (JSON.stringify(idle) !== JSON.stringify(pending)) failures.push({ width, state: 'pending', idle, actual: pending });
    await page.getByRole('button', { name: 'Toggle pending' }).click();
    assert.deepEqual(await geometry(page), idle, 'Completion restores idle geometry');
    await page.evaluate(() => window.resolveMedia());
    await page.waitForFunction(() => document.querySelector('.chat-media-image')?.naturalWidth > 0);
    const ready = await geometry(page);
    if (JSON.stringify(idle) !== JSON.stringify(ready)) failures.push({ width, state: 'media ready', idle, actual: ready });
    await page.locator('.chat-media-image').evaluate(node => node.dispatchEvent(new Event('error')));
    await page.getByRole('button', { name: 'Retry', exact: true }).waitFor();
    assert.deepEqual(await geometry(page), ready, 'Media errors preserve the viewport');
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    assert.deepEqual(await geometry(page), ready, 'Media retry preserves the viewport');
    assert.deepEqual(errors, []);
    await page.close();
  }
  assert.deepEqual(failures, [], 'Pending controls and resolved media must preserve their own and neighboring geometry');
  console.log('PASS: asynchronous controls and media preserve geometry at desktop and narrow widths');
} finally { await browser?.close(); await server.close(); }
