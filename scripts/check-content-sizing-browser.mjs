/* global window, document */
import assert from 'node:assert/strict';
import { URL } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const requireCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(requireCore.resolve('vite'));

const html = `<!doctype html><html><body>
<div style="transform:scale(1.75);transform-origin:top left">
  <div id="viewport" style="box-sizing:border-box;width:424px;height:324px;padding:12px;border:2px solid;overflow:auto">
    <div id="content" style="height:800px"></div>
  </div>
</div>
<script type="module">
import { createRoot } from 'solid-js';
import { useResizeObserver } from '/packages/core/src/hooks/useResizeObserver.ts';
import { calculateFitScale } from '/packages/core/src/utils/fitScale.ts';
createRoot(() => {
  const size = useResizeObserver(() => document.querySelector('#viewport'));
  window.readSize = size;
  window.fit = () => calculateFitScale({content:{width:100,height:50},viewport:size(),mode:'contain'});
});
</script></body></html>`;
const server = await createServer({ configFile: false,
  resolve: { alias: [{ find: /^solid-js$/, replacement: requireCore.resolve('solid-js/dist/solid.js') }] },
  optimizeDeps: { noDiscovery: true },
  server: { host: '127.0.0.1', port: 0 }, plugins: [{
  name: 'content-sizing-fixture',
  configureServer(instance) { instance.middlewares.use('/sizing.html', async (_request, response) => {
    response.setHeader('Content-Type', 'text/html'); response.end(await instance.transformIndexHtml('/sizing.html', html));
  }); },
}] });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] });
  for (const deviceScaleFactor of [1, 2]) {
    const context = await browser.newContext({ deviceScaleFactor });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(`${server.resolvedUrls.local[0]}sizing.html`);
    await page.waitForFunction(() => window.readSize?.()?.width > 0);
    const verify = async () => {
      await page.waitForFunction(() => {
        const el = document.querySelector('#viewport');
        return window.readSize().width === Math.max(0, el.clientWidth - 24)
          && window.readSize().height === Math.max(0, el.clientHeight - 24);
      });
    };
    await verify();
    assert.ok(await page.evaluate(() => window.fit() > 1));
    await page.locator('#viewport').evaluate(el => { el.style.width = '260px'; });
    await verify();
    await page.locator('#viewport').evaluate(el => { el.style.display = 'none'; });
    await verify();
    assert.equal(await page.evaluate(() => window.fit()), null);
    await page.locator('#viewport').evaluate(el => { el.style.display = 'block'; });
    await verify();
    await page.locator('#content').evaluate(el => { el.style.height = '20px'; });
    await verify();
    await context.close();
  }
  console.log('Content sizing verified with transforms, scrollbars, resize, visibility and DPR 1/2');
} finally {
  await browser?.close();
  await server.close();
}
