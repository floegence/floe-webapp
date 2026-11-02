/* global window, document, getComputedStyle, performance, requestAnimationFrame, AbortController, PerformanceObserver, setTimeout */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';
import { chromium, webkit } from 'playwright';
const requireCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { build, preview } = await import(requireCore.resolve('vite'));
const temporary = await realpath(await mkdtemp(path.join(tmpdir(), 'floe-diagrams-')));
const entry = path.resolve('packages/core/dist/diagrams.js');
const fixtures = [
  ['flowchart', 'flowchart LR\n subgraph API\n A[服务] --> B[Long label with several words]\n end\n B --> C[Done]'],
  ['sequence', 'sequenceDiagram\n participant A as Client\n participant B as Server\n A->>B: 请求\n B-->>A: Response'],
  ['class', 'classDiagram\n Animal <|-- Duck\n Animal : +int age\n Duck : +swim()'],
  ['state', 'stateDiagram-v2\n [*] --> Ready\n Ready --> Running\n Running --> [*]'],
  ['er', 'erDiagram\n CUSTOMER ||--o{ ORDER : places\n CUSTOMER {\n string name\n }'],
  ['gantt', 'gantt\n dateFormat YYYY-MM-DD\n section Delivery\n Build :a, 2026-11-01, 2d\n Test :after a, 1d'],
  ['pie', 'pie title Traffic\n "Read" : 60\n "Write" : 40'],
  ['mindmap', 'mindmap\n root((Project))\n  Design\n  Build'],
  ['gitGraph', 'gitGraph\n commit\n branch develop\n checkout develop\n commit'],
  ['journey', 'journey\n title Review\n section Read\n Open file: 5: User'],
  ['timeline', 'timeline\n title Delivery\n Monday : Design\n Tuesday : Build'],
  ['quadrant', 'quadrantChart\n title Portfolio\n x-axis Low --> High\n y-axis Low --> High\n A: [0.3, 0.6]'],
  ['requirement', 'requirementDiagram\n requirement test_req {\n id: 1\n text: verified\n risk: low\n verifymethod: test\n }'],
  ['block', 'block-beta\n columns 2\n A B'],
  ['xy', 'xychart-beta\n x-axis [Jan, Feb, Mar]\n y-axis "Sales" 0 --> 100\n bar [20, 40, 80]'],
];
const fixture = [
  'import { render } from '+JSON.stringify(requireCore.resolve('solid-js/web/dist/web.js'))+';',
  'import { createSignal, createComponent } from '+JSON.stringify(requireCore.resolve('solid-js/dist/solid.js'))+';',
  'import { Diagram, diagramLabelsEnUS, renderDiagram, sanitizeDiagramSvg } from '+JSON.stringify(entry)+';',
  'import '+JSON.stringify(path.resolve('packages/core/dist/diagrams.css'))+';',
  'window.renderDiagram=renderDiagram;window.sanitize=sanitizeDiagramSvg;window.copies=[];',
  "const [source,setSource]=createSignal('flowchart LR\\nA[Client] --> B[Server]');window.setSource=setSource;",
  "window.dispose=render(()=>createComponent(Diagram,{get source(){return source()},labels:diagramLabelsEnUS,onCopy:async text=>{window.copies.push(text)}}),document.querySelector('main'));",
  'window.ready=true;',
].join('\n');
let server; let browser;
try {
  await writeFile(path.join(temporary, 'index.html'), '<!doctype html><html><head><style>:root{--background:#fff;--foreground:#222;--muted-foreground:#666;--card:#f4f4f4;--muted:#eee;--border:#aaa;--primary:#3456aa;--accent:#ddd;--ring:#3456aa}body{margin:16px}main{max-width:800px}</style></head><body><main></main><script type="module" src="/fixture.js"></script></body></html>');
  await writeFile(path.join(temporary, 'fixture.js'), fixture);
  await build({ configFile: false, root: temporary, base: './', logLevel: 'error', resolve: { alias: { 'pele/lazy': requireCore.resolve('pele/lazy'), katex: requireCore.resolve('katex') } }, build: { outDir: path.join(temporary, 'dist') } });
  server = await preview({ configFile: false, root: temporary, logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } });
  for (const engine of [chromium, webkit]) {
    browser = await engine.launch({ headless: true });
    for (const width of [1000, 360]) {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*flowchart*.js', async route => { await new Promise(resolve => setTimeout(resolve, 100)); await route.continue(); });
      await page.goto(server.resolvedUrls.local[0]);
      await page.waitForSelector('.floe-diagram-viewport');
      const geometry = () => page.locator('main > .floe-diagram').evaluate(node => ({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height}));
      const loadingGeometry = await geometry();
      await page.waitForSelector('.floe-diagram-svg svg');
      assert.deepEqual(await geometry(), loadingGeometry, 'loading must preserve diagram geometry');
      const results = await page.evaluate(async inputs => {
        const out=[];
        for(const [type,source] of inputs) {const before=performance.now();try { const result=await window.renderDiagram(source,{maxWidth:500});out.push({type,width:result.width,height:result.height,ms:performance.now()-before}); } catch(error){out.push({type,error:error.message});}}
        return out;
      }, fixtures);
      assert.equal(results.filter(result=>result.error).length,0,JSON.stringify(results));
      const theme = await page.evaluate(async () => {
        const svg=document.querySelector('.floe-diagram-svg svg');const before=svg.outerHTML;
        document.documentElement.style.setProperty('--background','#181818');
        document.documentElement.style.setProperty('--foreground','#eee');
        document.documentElement.style.setProperty('--card','#333');
        await new Promise(resolve=>requestAnimationFrame(resolve));
        return {retained:svg===document.querySelector('.floe-diagram-svg svg'),html:before===svg.outerHTML,color:getComputedStyle(svg).color};
      });
      assert.deepEqual(theme,{retained:true,html:true,color:'rgb(238, 238, 238)'});
      const readyGeometry = await geometry();
      await page.getByRole('button',{name:'Copy source',exact:true}).click();
      assert.deepEqual(await geometry(),readyGeometry,'copy feedback preserves toolbar geometry');
      assert.deepEqual(await page.evaluate(()=>window.copies),['flowchart LR\nA[Client] --> B[Server]']);
      await page.getByRole('button',{name:'Source',exact:true}).click();
      assert.match(await page.locator('.floe-diagram-source').textContent(),/Client/);
      assert.deepEqual(await geometry(),readyGeometry,'source toggle preserves control and content geometry');
      await page.getByRole('button',{name:'Preview',exact:true}).click();
      await page.getByRole('button',{name:'Expand diagram',exact:true}).click();
      await page.waitForSelector('[role="dialog"] svg.pele');
      assert.equal(await page.locator('svg.pele').count(),2);
      const beforeZoom = await page.locator('[role=dialog] svg.pele').evaluate(el => el.getBoundingClientRect().width);
      await page.getByRole('button',{name:'Zoom in',exact:true}).click();
      const afterZoom = await page.locator('[role=dialog] svg.pele').evaluate(el => el.getBoundingClientRect().width);
      assert.ok(afterZoom > beforeZoom, 'zoom must enlarge the actual SVG');
      await page.keyboard.press('Escape');
      await page.waitForSelector('[role="dialog"]',{state:'detached'});
      const security = await page.evaluate(async () => {
        const svg=window.sanitize('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><image href="https://example.com/track"/><text onclick="x()" style="fill:url(https://example.com/a)">Safe</text></svg>');
        const formula=await window.renderDiagram('flowchart LR\n A["$$x^2 + y^2$$"] --> B[Done]');
        const canceled=new AbortController();canceled.abort();let abort='';try{await window.renderDiagram('graph TD\nA-->B',{signal:canceled.signal})}catch(e){abort=e.name}
        return {svg,formula:formula.svg,abort};
      });
      assert.doesNotMatch(security.svg,/<script|<image|onclick|https:\/\/example/);
      assert.match(security.formula,/<math/);
      assert.equal(security.abort,'AbortError');
      await page.evaluate(()=>window.setSource('flowchart LR\n A[invalid'));
      await page.waitForSelector('.floe-diagram-error');
      assert.equal(await page.locator('.floe-diagram-svg svg').count(),0);
      await page.evaluate(()=>window.setSource('flowchart LR\n A[Recovered] --> B[Done]'));
      await page.waitForSelector('.floe-diagram-svg svg');
      assert.match(await page.locator('.floe-diagram-svg').textContent(),/Recovered/);
      assert.deepEqual(errors,[]);
      await page.screenshot({ path: path.join(tmpdir(), 'floe-pele-' + engine.name() + '-' + width + '.png') });
      if (engine === chromium && width === 1000) {
        const cost = await page.evaluate(async () => {
          const longTasks=[];const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({entryTypes:['longtask']});
          const source='flowchart LR\n'+Array.from({length:200},(_,i)=>'N'+i+'[Service '+i+'] --> N'+(i+1)).join('\n');
          const start=performance.now();await window.renderDiagram(source,{maxWidth:800});const elapsed=performance.now()-start;
          await new Promise(resolve=>setTimeout(resolve,100));observer.disconnect();return {elapsed,longTasks};
        });
        assert.ok(cost.longTasks.every(ms=>ms<100), JSON.stringify(cost));console.log('200-edge cost',cost);
      }
      console.log(engine.name(),width,JSON.stringify(results));
      await page.close();
    }
    await browser.close();browser=undefined;
  }
  console.log('PASS: diagram entry, 15 families, CJK, formulas, source/copy, theme identity, expand/zoom/Escape, sanitization, cancellation and error recovery');
} finally {
  await browser?.close();
  await new Promise(resolve=>server?server.httpServer.close(resolve):resolve());
  await rm(temporary,{recursive:true,force:true});
}
