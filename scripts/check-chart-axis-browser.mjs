/* global document, window */
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import solid from 'vite-plugin-solid';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '../packages/core');
const fixture = await mkdtemp(resolve(root, '.chart-axis-'));
let server;
let browser;
try {
  await writeFile(resolve(fixture, 'index.html'), '<main></main><script type="module" src="./main.tsx"></script>');
  await writeFile(resolve(fixture, 'main.tsx'), `
    import { createSignal } from 'solid-js';
    import { render } from 'solid-js/web';
    import { LineChart } from '../src/components/ui/Charts';
    const [suffix, setSuffix] = createSignal('');
    window.setSuffix = setSuffix;
    render(() => <LineChart series={[{name:'one', data:[100, 220]}]} labels={['a', 'b']}
      formatYTick={value => value + suffix()} />, document.querySelector('main'));
  `);
  server = await createServer({ root, configFile: false, plugins: [solid()],
    server: { host: '127.0.0.1', port: 0, watch: null }, optimizeDeps: { entries: [resolve(fixture, 'index.html')] } });
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 380, height: 420 } });
  await page.goto(`${server.resolvedUrls.local[0]}${fixture.split('/').at(-1)}/`);
  await page.addStyleTag({content: '.chart-svg { width:100% } .chart-axis-label { font:14px monospace }'});
  const plot = page.locator('.chart-hover-area');
  const left = async () => Number(await plot.getAttribute('x'));
  assert.equal(await left(), 45);
  await page.evaluate(() => window.setSuffix('.25 kilobytes/s'));
  await page.waitForFunction(() => Number(document.querySelector('.chart-hover-area').getAttribute('x')) > 45);
  const expanded = await left();
  const labels = page.locator('.chart-axis-labels').first();
  assert.ok(await labels.evaluate(group => group.getBBox().x >= 0));
  await page.evaluate(() => window.setSuffix(''));
  await page.waitForFunction(() => document.querySelector('.chart-axis-label').textContent === '0');
  assert.equal(await left(), expanded);
} finally {
  await browser?.close();
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
