import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { createReloadPlaceholderScript } from '../packages/core/dist/reload-placeholder.js';

const script = createReloadPlaceholderScript({ storageKey: 'layout', scopeStorageKey: 'identity' });
let hold;
let pending;
const server = createServer(async (request, response) => {
  if (request.url === '/app.js') {
    if (pending) await pending;
    response.setHeader('content-type', 'text/javascript');
    response.end(`globalThis.document.querySelector('#root').innerHTML = '<header>Product shell</header><main data-floe-reload-scroll="content"><article><h1>Private workspace</h1><p>/private/path?token=secret</p><input value="secret" /><img src="/private-icon" /></article><div style="height:1600px"></div><section data-floe-reload-omit data-floe-reload-scroll="omitted" style="position:absolute;left:700px;top:100px;width:200px;height:180px;overflow:auto"><article style="width:120px;height:100px"><span>Omitted content</span><svg width="20" height="20"></svg><input value="unavailable" /></article><div style="height:600px"></div></section></main>';
      globalThis.window.__floeReloadPlaceholder.finish(); globalThis.window.__floeReloadPlaceholder.arm(globalThis.document.body, 'header,main,article,section');`);
    return;
  }
  if (request.url === '/private-icon') { response.writeHead(404); response.end(); return; }
  response.setHeader('content-type', 'text/html');
  response.end(`<!doctype html><html><head><script>${script}</script><style>
    html,body{margin:0;background:rgb(247,246,241);color:rgb(30,40,52)} header{height:48px;background:#eeebe7}main{padding:24px;height:600px;overflow:auto}article{width:420px;height:240px;padding:16px;border:1px solid #aaa;border-radius:12px;background:white} img{width:32px;height:32px} input{height:24px}
  </style></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('main').evaluate(element => { element.scrollTop = 20; });
  await page.locator('section').evaluate(element => { element.scrollTop = 30; });
  const bounds = await page.locator('main > article').boundingBox();
  pending = new Promise(resolve => { hold = resolve; });
  await page.reload({ waitUntil: 'commit' });
  await page.locator('[data-floe-reload-placeholder]').waitFor();
  const restored = await page.evaluate(() => ({ record: JSON.parse(globalThis.sessionStorage.getItem('layout')), html: globalThis.document.body.innerHTML, active: globalThis.window.__floeReloadPlaceholder.active(), modules: globalThis.document.querySelector('#root').childElementCount }));
  assert.equal(restored.active, true);
  assert.ok(restored.record.boxes.every(box => box[0] < 700), 'Omitted subtrees contribute no surfaces, text, images, or controls');
  assert.equal(restored.modules, 0, 'Anonymous layout must render before the app module');
  assert.equal(restored.record.boxes.filter(box => box[0] === bounds.x && box[1] === bounds.y && box[2] === bounds.width && box[3] === bounds.height).length, 1, 'Exactly one prior card boundary survives reload');
  assert.ok(!/Private workspace|private\/path|private-icon|token|secret/.test(JSON.stringify(restored.record)), 'Never persist content, URLs, input values or icons');
  assert.ok(!restored.html.includes('Private workspace'));
  hold(); pending = undefined;
  await page.locator('main > article').waitFor();
  await page.locator('[data-floe-reload-placeholder]').waitFor({ state: 'detached' });
  assert.equal(await page.locator('main').evaluate(element => element.scrollTop), 20, 'Restore scroll before removing the placeholder');
  assert.equal(await page.locator('section').evaluate(element => element.scrollTop), 30, 'Omitting shapes must preserve explicit scroll restoration');
  await page.evaluate(() => { globalThis.window.__floeReloadPlaceholder.clear(); globalThis.sessionStorage.setItem('layout', '{bad'); });
  pending = new Promise(resolve => { hold = resolve; });
  await page.reload({ waitUntil: 'commit' });
  await page.waitForFunction(() => !!globalThis.window.__floeReloadPlaceholder);
  assert.equal(await page.locator('[data-floe-reload-placeholder]').count(), 0);
  hold(); pending = undefined;
  await page.locator('main > article').waitFor();
  await page.evaluate(() => { globalThis.window.dispatchEvent(new globalThis.Event('pagehide')); globalThis.sessionStorage.setItem('identity', 'different'); });
  // Disable capture so navigation cannot replace the deliberately mismatched fixture.
  await page.evaluate(() => { const value = globalThis.sessionStorage.getItem('layout'); globalThis.window.__floeReloadPlaceholder.clear(); globalThis.sessionStorage.setItem('layout', value); });
  pending = new Promise(resolve => { hold = resolve; });
  await page.reload({ waitUntil: 'commit' });
  await page.waitForFunction(() => !!globalThis.window.__floeReloadPlaceholder);
  assert.equal(await page.locator('[data-floe-reload-placeholder]').count(), 0, 'A different scope cannot restore geometry');
  hold(); pending = undefined;
  console.log('PASS: hard reload paints matching anonymous geometry before modules; corrupt records and scope changes are isolated.');
} finally {
  hold?.();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
