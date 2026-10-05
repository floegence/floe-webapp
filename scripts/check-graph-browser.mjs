/* global window, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, URL } from 'node:url';
import solid from 'vite-plugin-solid';
import { chromium } from 'playwright';

const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const root = resolve(import.meta.dirname, '..', 'packages/core');
const fixture = await mkdtemp(resolve(root, '.graph-test-'));
let server, browser;
try {
  await writeFile(
    resolve(fixture, 'index.html'),
    '<div id="root"></div><script type="module" src="./main.tsx"></script>'
  );
  await writeFile(
    resolve(fixture, 'main.tsx'),
    `
import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { GraphCanvas, createGraphLayoutEngine } from '../dist/graph.js';
import { SurfaceFloatingLayer } from '../dist/ui.js';
import '../dist/styles.css';
import '../dist/graph.css';
const nodes=[{id:'g',label:'Application group',kind:'group',width:240,height:80},
 {id:'a',label:'Orders node',parentId:'g',width:220,height:140},
 {id:'b',label:'Database',width:200,height:110}, {id:'c',label:'Independent',width:200,height:110}];
const edges=[{id:'ab',label:'2',source:'a',target:'b'},
 {id:'bc',label:'Database copies independent',source:'b',target:'c'}];
function App(){
 const [layout,setLayout]=createSignal(); const [viewport,setViewport]=createSignal({x:50,y:50,scale:1});
 const [menu,setMenu]=createSignal(null); let engine;
 const record=e=>{window.lastGraphEvent=e.object;setMenu(e)};
 onMount(async()=>{engine=createGraphLayoutEngine(); setLayout(await engine.layout({nodes,edges})); window.graphReady=true; window.moveGraph=async()=>{setLayout(await engine.layout({nodes,edges},{positions:[{nodeId:'g',x:60,y:220},{nodeId:'b',x:650,y:80},{nodeId:'c',x:950,y:80}]}));};});
 onCleanup(()=>engine?.dispose());
 window.graphViewport=()=>viewport();
 return <div style={{width:'1200px',height:'700px'}}><Show when={layout()}>{value=><GraphCanvas layout={value()} viewport={viewport()}
   onViewportChange={setViewport} ariaLabel="Graph acceptance" onActivate={record} onContextMenu={record}
   renderGroup={n=><div style={{height:'100%',border:'2px dashed #747b85',background:'#eceff1',padding:'12px'}}>{n.label}</div>}
   renderNode={(n,context)=><div style={{height:'100%',border:'1px solid #59616b',background:'#fff',padding:'12px'}}>
     <span>{n.label}</span><button onClick={context.openMenu} aria-label={'Actions for '+n.label}>...</button>
     <input aria-label={'Notes for '+n.label}/></div>}
   overlay={<Show when={menu()}>{e=><SurfaceFloatingLayer owner={e().owner} position={e().position} estimatedSize={{width:200,height:80}}>
     <div role="dialog" style={{background:'white',border:'1px solid #777',padding:'12px'}}><p>Selectable graph details</p><button onClick={()=>setMenu(null)}>Close details</button></div>
   </SurfaceFloatingLayer>}</Show>}/>}</Show></div>;
}
render(()=><App/>,document.getElementById('root'));
`
  );
  server = await createServer({
    configFile: false,
    root,
    plugins: [solid()],
    optimizeDeps: { entries: [resolve(fixture, 'index.html')] },
    server: { host: '127.0.0.1', port: 0 },
  });
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}${fixture.split('/').at(-1)}/`);
  await page
    .waitForFunction(() => window.graphReady)
    .catch((error) => {
      throw new Error(`${error.message}\nPage errors: ${errors.join('\n')}`);
    });
  const node = page.locator('[data-graph-object="a"]');
  await node.click({ position: { x: 30, y: 25 } });
  assert.deepEqual(await page.evaluate(() => window.lastGraphEvent), { kind: 'node', id: 'a' });
  await page.getByRole('button', { name: 'Close details' }).click();
  assert.equal(await page.locator('.floe-graph__edge-label[data-count="true"]').textContent(), '2');
  await page.evaluate(() => window.moveGraph());
  assert.equal(
    await page.locator('[data-graph-object="g"]').evaluate((node) => node.style.left),
    '60px'
  );
  const before = await page.evaluate(() => window.graphViewport());
  await node.hover();
  await page.mouse.wheel(0, -180);
  await page.waitForFunction((scale) => window.graphViewport().scale > scale, before.scale);
  const box = await node.boundingBox();
  await page.mouse.move(box.x + 30, box.y + box.height - 24);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + box.height + 16, { steps: 8 });
  await page.mouse.up();
  assert.equal(await page.evaluate(() => window.getSelection()?.toString()), '');
  assert.equal(await page.getByRole('dialog').count(), 0, 'pan must not activate a card');
  await page.getByRole('textbox', { name: 'Notes for Orders node' }).fill('Native input');
  await node.focus();
  await page.keyboard.press('Shift+F10');
  assert.deepEqual(await page.evaluate(() => window.lastGraphEvent), { kind: 'node', id: 'a' });
  await page.getByRole('button', { name: 'Close details' }).click();
  await page.getByRole('button', { name: 'Actions for Orders node' }).click();
  assert.equal(await page.getByRole('dialog').count(), 1);
  await page.getByRole('button', { name: 'Close details' }).click();
  await page.locator('[data-graph-object="g"]').hover({ position: { x: 12, y: 12 } });
  assert.equal(
    await page.locator('[data-graph-object="bc"]').count(),
    0,
    'group hover isolates routes'
  );
  await page.mouse.move(1150, 650);
  assert.equal(
    await page.locator('[data-graph-object="bc"]').count(),
    1,
    'routes return after leaving group'
  );
  await page.emulateMedia({ forcedColors: 'active' });
  assert.equal(
    await page
      .locator('.floe-graph__edge')
      .first()
      .evaluate((el) => getComputedStyle(el).opacity),
    '1'
  );
  assert.deepEqual(errors, []);
  console.log('Graph worker, interaction, menus, native input, routes, and forced colors passed.');
} finally {
  await browser?.close();
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
