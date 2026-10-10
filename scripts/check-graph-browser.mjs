/* global window, document, getComputedStyle */
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
 const [minimapStyle,setMinimapStyle]=createSignal();
 window.colorMinimap=enabled=>setMinimapStyle(enabled ? () => node=>({fill:node.kind==='group'?'var(--overview-group)':node.id==='b'?'var(--overview-resource)':'var(--overview-node)',stroke:'var(--overview-outline)'}) : undefined);
 const [menu,setMenu]=createSignal(null); let engine;
 const record=e=>{window.lastGraphEvent=e.object;setMenu(e)};
 onMount(async()=>{engine=createGraphLayoutEngine(); setLayout(await engine.layout({nodes,edges})); window.graphReady=true; window.moveGraph=async()=>{setLayout(await engine.layout({nodes,edges},{positions:[{nodeId:'g',x:60,y:220},{nodeId:'b',x:650,y:80},{nodeId:'c',x:950,y:80}]}));};
 window.preferGraph=async()=>{const result=await engine.layout({nodes,edges},{positionMode:'preferred',positions:[{nodeId:'a',x:0,y:0},{nodeId:'b',x:0,y:40},{nodeId:'c',x:0,y:90}]});setLayout(result);return result;};});
 onCleanup(()=>engine?.dispose());
 window.graphViewport=()=>viewport();
 window.restoreGraphViewport=value=>setViewport(value);
 window.zoomGraph=()=>setViewport({...viewport(),x:0,y:0,scale:2});
 window.verifyEngine=async()=>{
   let rejected=false;
   try { await engine.layout({nodes:[{id:'bad',label:'Bad',width:0,height:10}],edges:[]}); }
   catch(error) { rejected=error.message.includes('Invalid dimensions'); }
   const results=await Promise.all([engine.layout({nodes,edges}),engine.layout({nodes,edges})]);
   const disposable=createGraphLayoutEngine();
   const pending=disposable.layout({nodes,edges}); disposable.dispose();
   let disposed=false; try { await pending; } catch(error) { disposed=error.message.includes('disposed'); }
   return {rejected,disposed,equal:JSON.stringify(results[0])===JSON.stringify(results[1])};
 };
 window.packGraph=async()=>{
   const packedNodes=[];
   for(let group=0;group<5;group++){
     packedNodes.push({id:'packed-group-'+group,label:'Group '+group,kind:'group',width:320,height:100});
     for(let node=0;node<3;node++) packedNodes.push({id:'packed-node-'+group+'-'+node,label:'Node',parentId:'packed-group-'+group,width:280,height:300});
   }
   const result=await engine.layout({nodes:packedNodes,edges:[{id:'packed-edge',label:'Relationship',source:'packed-group-0',target:'packed-group-1'}]},{aspectRatio:1.6,spacing:32});
   setLayout(result);return result;
 };
 window.routeBorders=async()=>{
   const nodes=[
     {id:'top',label:'Top',width:100,height:80},
     {id:'bottom',label:'Bottom',width:100,height:80},
     {id:'left',label:'Left',width:100,height:200},
     {id:'right',label:'Right',width:100,height:80},
   ];
   return engine.layout({nodes,edges:[
     {id:'vertical',label:'Vertical',source:'top',target:'bottom'},
     {id:'out',label:'Out',source:'left',target:'right'},
     {id:'back',label:'Back',source:'right',target:'left'},
   ]},{positions:[{nodeId:'top',x:0,y:0},{nodeId:'bottom',x:0,y:180},
     {nodeId:'left',x:400,y:0},{nodeId:'right',x:580,y:130}]});
 };
 window.layerGraph=async direction=>{
   const nodes=[
     {id:'entry',label:'Entry',width:120,height:90},
     {id:'control-a',label:'Control A',width:140,height:110},
     {id:'control-b',label:'Control B',width:100,height:130},
     {id:'worker',label:'Worker',width:160,height:100},
   ];
   const result=await engine.layout({nodes,edges:[
     {id:'entry-control',label:'',source:'entry',target:'control-a'},
     {id:'control-worker',label:'',source:'control-a',target:'worker'},
   ]},{direction,layers:[['entry'],['control-a','control-b'],['worker']],spacing:24});
   setLayout(result);return result;
 };
 window.routeContained=async()=>engine.layout({nodes:[
   {id:'group',label:'Group',kind:'group',width:632,height:308},
   {id:'member',label:'Member',parentId:'group',width:280,height:180},
   {id:'peer',label:'Peer',parentId:'group',width:280,height:180},
 ],edges:[{id:'out',label:'',source:'member',target:'group'},
   {id:'back',label:'',source:'group',target:'member'}]},
 {groupPadding:{top:108,right:20,bottom:20,left:20},positions:[
   {nodeId:'group',x:0,y:0},{nodeId:'member',x:20,y:108},{nodeId:'peer',x:332,y:108}]});
 return <div style={{width:'1200px',height:'700px'}}><Show when={layout()}>{value=><GraphCanvas layout={value()} viewport={viewport()}
   onViewportChange={setViewport} ariaLabel="Graph acceptance" onActivate={record} onContextMenu={record} minimap={{ariaLabel:'Graph overview',nodeStyle:minimapStyle()}}
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
  assert.deepEqual(await page.evaluate(() => window.verifyEngine()), {
    rejected: true,
    disposed: true,
    equal: true,
  });
  const node = page.locator('[data-graph-object="a"]');
  await node.click({ position: { x: 30, y: 25 } });
  assert.deepEqual(await page.evaluate(() => window.lastGraphEvent), { kind: 'node', id: 'a' });
  await page.getByRole('button', { name: 'Close details' }).click();
  const overview = page.getByRole('region', { name: 'Graph overview', exact: true });
  for (const palette of [
    { group: '#e2d7bf', node: '#f4f4f4', resource: '#b3cbb3', outline: '#59616b' },
    { group: '#393329', node: '#515151', resource: '#284336', outline: '#8495ad' },
  ]) {
    await overview.evaluate((element, colors) => {
      for (const [key, value] of Object.entries(colors))
        element.style.setProperty('--overview-' + key, value);
      window.colorMinimap(true);
    }, palette);
    const paths = overview.locator('.floe-graph__minimap-nodes');
    await page.waitForFunction(
      () => document.querySelectorAll('.floe-graph__minimap-nodes').length === 2
    );
    const fills = await paths.evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).fill)
    );
    assert.equal(new Set(fills).size, 2, 'node categories keep distinct host-provided colors');
    assert.equal(await paths.first().evaluate((element) => getComputedStyle(element).opacity), '1');
    assert.equal(
      await paths
        .first()
        .evaluate((element) => (element.getAttribute('d').match(/M/g) ?? []).length),
      2,
      'same-color nodes share one path'
    );
    assert.equal(
      await overview.locator('path').count(),
      4,
      'path count follows styles, not node count'
    );
    const groupFill = await overview
      .locator('.floe-graph__minimap-groups')
      .evaluate((element) => getComputedStyle(element).fill);
    assert.notEqual(groupFill, fills[0], 'groups retain their own fill');
  }
  await page.emulateMedia({ forcedColors: 'active' });
  assert.equal(
    await overview
      .locator('.floe-graph__minimap-nodes')
      .first()
      .evaluate((element) => getComputedStyle(element).fill),
    'rgb(0, 0, 0)',
    'system colors override host-provided colors'
  );
  assert.equal(
    await overview
      .locator('.floe-graph__minimap-groups')
      .evaluate((element) => getComputedStyle(element).fill),
    'rgb(255, 255, 255)'
  );
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => window.colorMinimap(false));
  await page.waitForFunction(
    () => document.querySelectorAll('.floe-graph__minimap-nodes').length === 1
  );
  assert.equal(
    await overview
      .locator('.floe-graph__minimap-nodes')
      .evaluate((element) => getComputedStyle(element).opacity),
    '0.65',
    'omitted styles retain the original default'
  );
  const beforeOverview = await page.evaluate(() => window.graphViewport());
  await overview.focus();
  await page.keyboard.press('ArrowRight');
  assert.equal((await page.evaluate(() => window.graphViewport())).x, beforeOverview.x - 240);
  await page.keyboard.press('Home');
  await page.evaluate(() => window.zoomGraph());
  const overviewBox = await overview.boundingBox();
  const viewportBeforeClick = await page.evaluate(() => window.graphViewport());
  await overview.click({ position: { x: overviewBox.width * 0.8, y: overviewBox.height * 0.5 } });
  const viewportAfterClick = await page.evaluate(() => window.graphViewport());
  assert.notEqual(
    viewportAfterClick.x,
    viewportBeforeClick.x,
    'overview click navigates the main canvas'
  );
  const viewportBox = await page.locator('.floe-graph__minimap-viewport').boundingBox();
  await page.mouse.move(
    Math.min(
      overviewBox.x + overviewBox.width - 2,
      Math.max(overviewBox.x + 2, viewportBox.x + viewportBox.width / 2)
    ),
    Math.min(
      overviewBox.y + overviewBox.height - 2,
      Math.max(overviewBox.y + 2, viewportBox.y + viewportBox.height / 2)
    )
  );
  await page.mouse.down();
  await page.mouse.move(
    overviewBox.x + overviewBox.width * 0.6,
    overviewBox.y + overviewBox.height * 0.6,
    { steps: 6 }
  );
  await page.mouse.up();
  assert.notDeepEqual(
    await page.evaluate(() => window.graphViewport()),
    viewportAfterClick,
    'overview viewport supports pointer capture drag'
  );
  await page.evaluate((value) => window.restoreGraphViewport(value), beforeOverview);
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
  const preferred = await page.evaluate(() => window.preferGraph());
  assert.equal(preferred.nodes.length, 4);
  assert.equal(preferred.edges.length, 2);
  for (const node of preferred.nodes) {
    for (const other of preferred.nodes.filter(
      (n) => n.id !== node.id && n.parentId === node.parentId
    ))
      assert.ok(
        node.x + node.width <= other.x ||
          other.x + other.width <= node.x ||
          node.y + node.height <= other.y ||
          other.y + other.height <= node.y
      );
  }
  assert.deepEqual(errors, []);
  const packed = await page.evaluate(() => window.packGraph());
  assert.equal(packed.nodes.length, 20);
  assert.ok(packed.bounds.width / packed.bounds.height > 0.8);
  assert.ok(packed.bounds.width / packed.bounds.height < 3);
  assert.ok(packed.nodes.find((node) => node.id === 'packed-group-0').width > 550);
  assert.ok(packed.edges.every((edge) => edge.sections.length > 0));
  assert.deepEqual(errors, []);
  const borderRoutes = await page.evaluate(() => window.routeBorders());
  const [vertical, out, back] = borderRoutes.edges.map((edge) => edge.sections[0]);
  assert.equal(vertical[0].y, 80);
  assert.equal(vertical.at(-1).y, 180);
  assert.equal(out[0].x, 500);
  assert.equal(out.at(-1).x, 580);
  assert.ok(Math.abs(out[0].y - back.at(-1).y) >= 6, 'reciprocal routes have separate anchors');
  for (const path of [vertical, out, back])
    for (let i = 1; i < path.length; i++)
      assert.ok(path[i].x === path[i - 1].x || path[i].y === path[i - 1].y);
  for (const direction of ['RIGHT', 'DOWN', 'LEFT', 'UP']) {
    const result = await page.evaluate((value) => window.layerGraph(value), direction);
    const get = (id) => result.nodes.find((node) => node.id === id);
    const horizontal = direction === 'RIGHT' || direction === 'LEFT';
    const sign = direction === 'RIGHT' || direction === 'DOWN' ? 1 : -1;
    const axis = (node) => (horizontal ? node.x + node.width / 2 : node.y + node.height / 2);
    assert.ok(sign * (axis(get('control-a')) - axis(get('entry'))) > 0);
    assert.ok(sign * (axis(get('worker')) - axis(get('control-a'))) > 0);
    assert.equal(axis(get('control-a')), axis(get('control-b')));
    assert.equal(await page.locator('[data-graph-object="entry"]').count(), 1);
  }
  const contained = await page.evaluate(() => window.routeContained());
  const member = contained.nodes.find((node) => node.id === 'member');
  for (const edge of contained.edges)
    for (const path of edge.sections)
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1],
          b = path[i];
        assert.ok(
          Math.max(a.x, b.x) <= member.x ||
            Math.min(a.x, b.x) >= member.x + member.width ||
            Math.max(a.y, b.y) <= member.y ||
            Math.min(a.y, b.y) >= member.y + member.height,
          'contained endpoints never route through the member card'
        );
      }
  console.log(
    'Graph worker, compound packing, fixed/preferred positions, directional layers, interaction, menus, native input, routes, and forced colors passed.'
  );
} finally {
  await browser?.close();
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
