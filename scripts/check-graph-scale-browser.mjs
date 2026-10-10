/* global window */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, URL } from 'node:url';
import solid from 'vite-plugin-solid';
import { chromium } from 'playwright';

const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const root = resolve(import.meta.dirname, '..', 'packages/core');
const fixture = await mkdtemp(resolve(root, '.graph-scale-'));
const output = resolve(process.argv[2] ?? '/tmp/floe-graph-scale');
const counts = (process.argv[3] ?? '100,500,1000').split(',').map(Number);
const report = { status: 'running', browser: 'Chromium', cases: [], errors: [] };
let server, browser;
try {
  await mkdir(output, { recursive: true });
  await writeFile(
    resolve(fixture, 'index.html'),
    '<div id="root"></div><script type="module" src="./main.tsx"></script>'
  );
  await writeFile(
    resolve(fixture, 'main.tsx'),
    `
import { createSignal, Show, For, onCleanup } from 'solid-js';
import { render } from 'solid-js/web';
import { GraphCanvas, createGraphLayoutEngine, fitGraphViewport } from '../dist/graph.js';
import '../dist/styles.css';
import '../dist/graph.css';
function App() {
  const engine = createGraphLayoutEngine();
  const [layout,setLayout] = createSignal();
  const [viewport,setViewport] = createSignal({x:20,y:20,scale:1});
  const tasks=[]; const frames=[];
  let previous=performance.now(), running=true;
  const frame=now=>{if(running){frames.push(now-previous);previous=now;requestAnimationFrame(frame)}};
  requestAnimationFrame(frame);
  const observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(task=>task.duration)));
  observer.observe({type:'longtask',buffered:false});
  onCleanup(()=>{running=false;observer.disconnect();engine.dispose()});
  const stats=(values)=>{const sorted=[...values].sort((a,b)=>a-b);return {max:Math.max(0,...sorted),p95:sorted[Math.floor(sorted.length*.95)]??0,count:sorted.length}};
  window.scaleReady=true;
  window.viewport=()=>viewport();
  window.scaleSnapshot=()=>({frames:stats(frames),longtasks:stats(tasks),renderedNodes:document.querySelectorAll('.floe-graph__node').length,renderedEdges:document.querySelectorAll('.floe-graph__edge').length});
  window.resetScaleMetrics=()=>{tasks.length=0;frames.length=0;previous=performance.now()};
  window.loadScale=async (count,grouped=false)=>{
    window.resetScaleMetrics();
    const nodes=Array.from({length:count},(_,i)=>({id:'n'+i,label:'Service host '+i,width:240,height:220}));
    const edges=nodes.slice(1).map((n,i)=>({id:'e'+i,label:'Calls',source:'n'+Math.floor(i/2),target:n.id}));
    if(grouped) {
      for(let i=0;i<count;i++) nodes[i].parentId='g'+Math.floor(i/10);
      for(let i=0;i<Math.ceil(count/10);i++) nodes.push({id:'g'+i,label:'Group '+i,kind:'group',width:320,height:100});
    }
    const started=performance.now();
    const value=await engine.layout({nodes,edges},{direction:'RIGHT',aspectRatio:1.6,spacing:32});
    const computed=performance.now();
    setLayout(value);
    setViewport(fitGraphViewport(value.bounds,{width:1200,height:720},24));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return {count,grouped,edges:edges.length,layoutMs:computed-started,paintMs:performance.now()-computed,layoutNodes:value.nodes.length,layoutEdges:value.edges.length,...window.scaleSnapshot()};
  };
  window.zoomScale=()=>{const node=layout().nodes[0];setViewport({x:600-node.x-node.width/2,y:360-node.y-node.height/2,scale:1})};
  return <div style={{width:'1200px',height:'720px'}}><Show when={layout()}>{value=><GraphCanvas layout={value()} viewport={viewport()} onViewportChange={setViewport} ariaLabel="Scale acceptance"
    minimap={{ariaLabel:'Scale overview'}}
    renderGroup={node=><section style={{height:'100%',border:'1px dashed var(--muted-foreground)',background:'color-mix(in srgb, var(--primary) 8%, transparent)'}}>{node.label}</section>}
    renderNode={node=><section style={{height:'100%',background:'var(--card)',border:'1px solid var(--border)',padding:'12px'}}><strong>{node.label}</strong><For each={[1,2,3,4]}>{id=><p>Hosted service {id}<small> · Running</small></p>}</For></section>}/>}</Show></div>;
}
render(()=><App/>,document.getElementById('root'));`
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
  page.on('pageerror', (error) => report.errors.push(error.message));
  page.setDefaultTimeout(300000);
  await page.goto(`${server.resolvedUrls.local[0]}${fixture.split('/').at(-1)}/`);
  await page.waitForFunction(() => window.scaleReady);
  for (const grouped of [false, true])
    for (const count of counts) {
      console.log(
        `Measuring ${count} actual nodes / ${count - 1} connections / grouped=${grouped}`
      );
      const result = await page.evaluate(({ count, grouped }) => window.loadScale(count, grouped), {
        count,
        grouped,
      });
      assert.equal(result.layoutNodes, count + (grouped ? Math.ceil(count / 10) : 0));
      assert.equal(result.layoutEdges, count - 1);
      await page.evaluate(() => window.zoomScale());
      await page.waitForTimeout(100);
      await page.evaluate(() => window.resetScaleMetrics());
      await page.mouse.move(800, 640);
      await page.mouse.down();
      for (let step = 1; step <= 40; step++) {
        await page.mouse.move(800 - step * 12, 640 - step * 2);
        await page.waitForTimeout(16);
      }
      await page.mouse.up();
      const interaction = await page.evaluate(() => window.scaleSnapshot());
      report.cases.push({ ...result, interaction });
      console.log(JSON.stringify(report.cases.at(-1)));
      assert.ok(interaction.renderedNodes < count, 'Panning renders visible nodes only');
      assert.ok(interaction.renderedEdges < count - 1, 'Panning renders visible routes only');
      assert.ok(
        result.layoutMs < 8000,
        'A thousand-node layout must complete within the qualification budget'
      );
      assert.ok(result.longtasks.max < 100, 'Layout must not block the renderer');
      assert.ok(interaction.frames.p95 < 32, 'Pan frames must remain responsive');
      await page.screenshot({
        path: resolve(output, `graph-${grouped ? 'grouped-' : ''}${count}.png`),
      });
      await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
    }
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = String(error);
  throw error;
} finally {
  await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser?.close();
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
