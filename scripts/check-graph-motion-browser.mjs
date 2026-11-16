/* global window, document, requestAnimationFrame, performance, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import solid from 'vite-plugin-solid';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const root = resolve('packages/core');
const fixture = await mkdtemp(resolve(root, '.graph-motion-'));
let server, browser;
try {
  await writeFile(
    resolve(fixture, 'index.html'),
    '<div id="root"></div><script type="module" src="./main.tsx"></script>'
  );
  await writeFile(
    resolve(fixture, 'main.tsx'),
    `
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { GraphCanvas } from '../dist/graph.js';
import '../dist/graph.css';
const scene = expanded => ({nodes:[
 {id:'group',label:'Group',kind:expanded?'group':'node',x:20,y:20,width:expanded?480:220,height:expanded?300:130},
 {id:'peer',label:'Peer',x:expanded?580:320,y:40,width:160,height:100},
 ...(expanded?[{id:'child',label:'Child',parentId:'group',x:60,y:100,width:180,height:120}]:[])],
 edges:[{id:'edge',label:'Call',source:'group',target:'peer',sections:[[{x:expanded?500:240,y:70},{x:expanded?580:320,y:70}]]}],
 bounds:{x:20,y:20,width:expanded?720:460,height:expanded?300:130}});
const card = node=>node.id==='group'?<div style="height:100%;background:#ddd;border:1px solid #aaa"><button onClick={()=>window.change(node.width<300)}>Toggle group</button></div>:<div style="height:100%;background:#eee;border:1px solid #999"><span>{node.label}</span><input aria-label={node.label+' notes'} /></div>;
function App(){
 const [layout,setLayout]=createSignal(scene(false));
 let original=JSON.stringify(layout());
 window.change=expanded=>{setLayout(scene(expanded));original=JSON.stringify(layout());};
 window.sceneIntact=()=>original===JSON.stringify(layout());
 return <div style="width:1000px;height:650px"><GraphCanvas animateLayout layout={layout()} viewport={{x:0,y:0,scale:1}} onViewportChange={()=>{}} ariaLabel="Motion graph" onHover={value=>{window.lastHover=value;}}
 renderNode={card} renderGroup={card}/></div>;
}
render(()=><App/>,document.getElementById('root'));
`
  );
  server = await createServer({
    configFile: false,
    root,
    plugins: [solid()],
    optimizeDeps: {
      noDiscovery: true,
      include: ['solid-js', 'solid-js/web', 'solid-js/store', 'clsx', 'tailwind-merge'],
    },
    server: { host: '127.0.0.1', port: 0 },
  });
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}${fixture.split('/').at(-1)}/`);
  await page.mouse.move(100, 210);
  const frames = await page.evaluate(async () => {
    const group = document.querySelector('[data-graph-object="group"]');
    const peer = document.querySelector('[data-graph-object="peer"]');
    const input = peer.querySelector('input');
    input.value = 'Retained draft';
    const toggle = group.querySelector('button');
    toggle.focus();
    window.change(true);
    const samples = [];
    const start = performance.now();
    while (performance.now() - start < 420) {
      await new Promise(requestAnimationFrame);
      const edge = document.querySelector('.floe-graph__edge');
      const box = group.getBoundingClientRect();
      const point = edge.getPointAtLength(0).matrixTransform(edge.getScreenCTM());
      const child = document.querySelector('[data-graph-object="child"]');
      const bounds = child?.getBoundingClientRect();
      const clipped =
        !bounds || bounds.bottom <= box.bottom || getComputedStyle(child).clipPath !== 'none';
      samples.push({ width: box.width, attachment: Math.abs(point.x - box.right), clipped });
    }
    return {
      samples,
      sameGroup: group === document.querySelector('[data-graph-object="group"]'),
      sameInput: input === document.querySelector('[aria-label="Peer notes"]'),
      focused: document.activeElement === toggle,
      value: input.value,
      hover: window.lastHover,
    };
  });
  assert.ok(
    frames.samples.some((frame) => frame.width > 225 && frame.width < 475),
    'expansion includes intermediate group geometry'
  );
  assert.ok(
    frames.samples.every((frame) => frame.attachment < 1),
    'edge remains attached throughout the transition'
  );
  assert.ok(
    frames.sameGroup && frames.sameInput && frames.focused,
    'motion retains DOM owners, draft and keyboard focus'
  );
  assert.ok(
    frames.samples.every((frame) => frame.clipped),
    'entering children stay clipped to their growing parent'
  );
  assert.equal(frames.value, 'Retained draft');
  assert.notEqual(
    frames.hover?.id,
    'child',
    'layout travel does not retarget a stationary pointer'
  );
  await page.mouse.move(110, 210);
  await page.waitForFunction(() => window.lastHover?.id === 'child');
  await page.evaluate(() => window.change(false));
  await page.waitForTimeout(70);
  const reversal = await page.evaluate(() => {
    const before = document
      .querySelector('[data-graph-object="group"]')
      .getBoundingClientRect().width;
    window.change(true);
    return {
      before,
      after: document.querySelector('[data-graph-object="group"]').getBoundingClientRect().width,
    };
  });
  assert.ok(
    Math.abs(reversal.before - reversal.after) < 1,
    'interruption starts at the painted position'
  );
  await page.waitForFunction(
    () =>
      document.querySelector('[data-graph-object="group"]').getBoundingClientRect().width === 480
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => window.change(false));
  assert.equal(
    await page
      .locator('[data-graph-object="group"]')
      .evaluate((e) => e.getBoundingClientRect().width),
    220
  );
  assert.equal(await page.locator('[data-graph-object="child"]').count(), 0);
  assert.ok(
    await page.evaluate(() => window.sceneIntact()),
    'animation never mutates the supplied layout'
  );
  assert.deepEqual(errors, []);
  console.log(
    'Graph layout motion: intermediate geometry, attached routes, retained owners/focus, interrupted reversal and reduced motion passed.'
  );
} finally {
  await browser?.close();
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
