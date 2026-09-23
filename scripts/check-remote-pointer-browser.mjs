/* global window, document, PointerEvent, requestAnimationFrame */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium, firefox, webkit} from 'playwright';
import ts from 'typescript';

const sourceMode = process.argv.includes('--source');
const script = sourceMode ? ts.transpileModule(readFileSync('packages/core/src/remote-pointer.ts','utf8'), {
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022},
}).outputText : readFileSync('packages/core/dist/remote-pointer.js','utf8');
const css = readFileSync(`packages/core/${sourceMode ? 'src/styles' : 'dist'}/remote-pointer.css`,'utf8');
const server = createServer((req,res) => {
  if (req.url === '/pointer.js') { res.setHeader('content-type','text/javascript'); res.end(script); return; }
  res.setHeader('content-type','text/html');
  if (req.url === '/receiver') {
    res.end('<style>body{margin:0}#scroll{height:180px;width:300px;overflow:auto}#content{height:3000px;width:3000px;background:linear-gradient(white,black)}</style><div id="scroll"><div id="content"></div></div>'); return;
  }
  res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body{margin:0}#surface{height:400px;width:100%}canvas{display:block;height:400px;width:100%}iframe{height:180px;width:300px}#local{height:60px;overflow:auto}</style>
    <div id="surface"><canvas data-floe-remote-pointer></canvas></div><div id="local"><div style="height:400px">Local controls</div></div><iframe src="/receiver"></iframe>
    <script type="module">
    import {createRemotePointer} from '/pointer.js';
    const surface=document.querySelector('#surface'), canvas=document.querySelector('canvas');
    window.events=[]; window.activations=[]; window.wheels=[]; window.target={};
    canvas.addEventListener('wheel',e=>window.wheels.push(e.deltaY));
    window.pointer=createRemotePointer({surface,resolveTarget:e=>e.target===canvas?window.target:null,isTargetValid:t=>t===window.target,
      sendPointer:(command,target)=>{events.push(command);if(command.kind==='scroll'){const el=document.querySelector('iframe').contentDocument.querySelector('#scroll');el.scrollTop+=command.dy;el.scrollLeft+=command.dx;}},
      release:()=>{},onActivate:p=>activations.push(p)});
    </script>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const engines = process.argv.includes('--all') ? {chromium,firefox,webkit} : {chromium};
try {
  for (const [name,engine] of Object.entries(engines)) {
    const browser = await engine.launch();
    try {
      for (const dpr of [1,1.25,1.5,2,3]) {
        const context = await browser.newContext({viewport:{width:390,height:740},deviceScaleFactor:dpr,hasTouch:true,...(name==='chromium'?{isMobile:true}:{})});
        const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/`);
        await page.waitForFunction(()=>window.pointer && document.querySelector('iframe').contentDocument.querySelector('#scroll'));
        const result=await page.evaluate(async()=>{
          const surface=document.querySelector('#surface'), canvas=document.querySelector('canvas');
          const capture=surface.setPointerCapture;
          // Synthetic events have no active native pointer. Native capture is
          // exercised by the subsequent browser mouse and CDP touch sequences.
          surface.setPointerCapture=()=>{};
          const event=(type,x,y)=>canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:41,clientX:x,clientY:y}));
          event('pointerdown',100,300); event('pointermove',90,280); event('pointermove',80,250); event('pointerup',80,240);
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          const scroll=document.querySelector('iframe').contentDocument.querySelector('#scroll');
          const output={events:window.events.splice(0),activations:window.activations.splice(0),top:scroll.scrollTop,left:scroll.scrollLeft};
          scroll.scrollTop=0;scroll.scrollLeft=0;
          surface.setPointerCapture=capture;
          return output;
        });
        assert.deepEqual(result.events.map(e=>e.kind),['scroll']);
        assert.equal(result.events[0].dy,60);assert.equal(result.events[0].dx,20);
        assert.equal(result.top,60);assert.equal(result.left,20);assert.deepEqual(result.activations,[]);
        await page.mouse.move(100,200); await page.mouse.wheel(0,120);
        await page.waitForFunction(()=>window.events.some(e=>e.kind==='scroll'));
        const wheel = await page.evaluate(()=>({delta:window.wheels.at(-1),events:window.events.filter(e=>e.kind==='scroll'),top:document.querySelector('iframe').contentDocument.querySelector('#scroll').scrollTop}));
        assert.ok(wheel.top>0 && Math.abs(wheel.top-wheel.delta)<1,JSON.stringify(wheel));
        assert.equal(wheel.events.reduce((sum,e)=>sum+e.dy,0),wheel.delta);
        await page.evaluate(()=>{window.events=[]});
        await page.mouse.dblclick(100,200);
        assert.deepEqual(await page.evaluate(()=>window.events.filter(e=>e.kind==='down').map(e=>e.clicks)),[1,2]);
        if (name==='chromium' && dpr===2) {
          await page.evaluate(()=>{window.events=[];window.activations=[]});
          const cdp=await context.newCDPSession(page);
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:100,y:300,id:1}]});
          for(const y of [280,260,240,220]) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y,id:1}]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          await page.waitForFunction(()=>window.events.some(e=>e.kind==='scroll'));
          const native=await page.evaluate(()=>({events:window.events,activations:window.activations}));
          assert.ok(native.events.every(e=>e.kind==='scroll'));assert.equal(native.events.reduce((n,e)=>n+e.dy,0),80);
          assert.deepEqual(native.activations,[]);
          await page.evaluate(()=>{window.events=[]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:200,id:1},{x:230,y:200,id:2}]});
          for (let i=1;i<=6;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:130-i*10,y:200,id:1},{x:230+i*10,y:200,id:2}]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          assert.deepEqual(await page.evaluate(()=>window.events),[]);
          assert.ok(await page.evaluate(()=>window.visualViewport.scale)>1,'Browser pinch zoom must remain available');
          await cdp.detach();
        }
        assert.deepEqual(errors,[]);
        console.log(`${name} ${browser.version()} DPR ${dpr}: remote scroll receipt, no click, mouse wheel and double click passed`);
        await context.close();
      }
    } finally { await browser.close(); }
  }
} finally {await new Promise(resolve=>server.close(resolve));}
