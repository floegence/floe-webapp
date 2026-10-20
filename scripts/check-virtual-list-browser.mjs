/* global window */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const requireCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { build, preview } = await import(requireCore.resolve('vite'));
const temporary = await realpath(await mkdtemp(path.join(tmpdir(), 'floe-virtual-list-')));
const entry = path.resolve('packages/core/dist/chat.js');
const solid = path.dirname(requireCore.resolve('solid-js/package.json'));
let server;
let browser;
try {
  await writeFile(path.join(temporary, 'index.html'), '<!doctype html><main></main><script type="module" src="/fixture.js"></script>');
  await writeFile(path.join(temporary, 'fixture.js'), `
import { createRoot, createSignal } from ${JSON.stringify(path.join(solid, 'dist/solid.js'))};
import { useVirtualList } from ${JSON.stringify(entry)};
window.pendingFrames=new Set();
const request=window.requestAnimationFrame.bind(window), cancel=window.cancelAnimationFrame.bind(window);
window.requestAnimationFrame=(fn)=>{const id=request((time)=>{window.pendingFrames.delete(id);fn(time);});window.pendingFrames.add(id);return id;};
window.cancelAnimationFrame=(id)=>{window.pendingFrames.delete(id);cancel(id);};
window.mount=()=>createRoot(dispose=>{
 const [keys,setKeys]=createSignal(['a','b','c']);
 const view=useVirtualList({count:()=>keys().length,itemKeys:keys,getItemKey:i=>keys()[i],getItemHeight:()=>80,config:{enabled:true,defaultItemHeight:80,overscan:0}});
 const container=document.createElement('div');container.style.cssText='height:100px;overflow:auto';
 const content=document.createElement('div');content.style.height='1000px';container.append(content);document.querySelector('main').append(container);
 view.containerRef(container);view.scrollRef(container);
 return {view,setKeys,container,dispose:()=>{dispose();container.remove();}};
});
window.current=window.mount();window.ready=true;`);
  await build({ configFile: false, root: temporary, base: './', logLevel: 'error', resolve: { alias: [{ find: /^solid-js$/, replacement: path.join(solid, 'dist/solid.js') }] }, build: { outDir: path.join(temporary, 'dist') } });
  server = await preview({ configFile: false, root: temporary, logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } });
  browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => window.ready && window.current.view.totalHeight() === 240);
  await page.evaluate(() => window.current.view.setItemHeightByKey('b', 140));
  await page.waitForFunction(() => window.current.view.totalHeight() === 300);
  assert.equal(await page.evaluate(() => window.current.view.virtualItems().find((item) => item.key === 'b').size), 140);
  const result = await page.evaluate(() => {
    const { view, setKeys, container } = window.current;
    container.scrollTop = 100;
    const anchor = view.captureAnchor();
    setKeys(['previous', 'a', 'b', 'c']);
    const prepended = { offset: view.anchorOffset(anchor), scroll: container.scrollTop, height: view.totalHeight() };
    setKeys(['b', 'c', 'next']);
    const evicted = { offset: view.anchorOffset(anchor), scroll: container.scrollTop, height: view.totalHeight() };
    setKeys(['c', 'next', 'replacement']);
    return { prepended, evicted, missing: view.anchorOffset(anchor), keys: view.virtualItems().map((item) => item.key) };
  });
  assert.deepEqual(result.prepended, { offset: 180, scroll: 100, height: 380 });
  assert.deepEqual(result.evicted, { offset: 20, scroll: 100, height: 300 });
  assert.equal(result.missing, undefined);
  assert.ok(result.keys.includes('c'));
  await page.evaluate(() => {
    window.current.dispose();
    for (let i = 0; i < 50; i++) {
      const current = window.mount();
      current.view.setItemHeight(0, 99);
      current.dispose();
    }
  });
  await page.waitForFunction(() => window.pendingFrames.size === 0);
  assert.equal(await page.locator('main > div').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: public built hook, reactive measurements, prepend/eviction/same-count keys, stable anchors, host scroll ownership and 50 disposal cycles');
} finally {
  await browser?.close();
  await new Promise((resolve) => server ? server.httpServer.close(resolve) : resolve());
  await rm(temporary, { recursive: true, force: true });
}
