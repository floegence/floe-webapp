/* global window, document, innerHeight, scrollY, getComputedStyle, requestAnimationFrame, createImageBitmap, Blob, atob, AudioContext */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { chromium, webkit, firefox } from 'playwright';
import solid from 'vite-plugin-solid';

const requireCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(requireCore.resolve('vite'));
const documentHTML = id => `<style>html,body{margin:0;background:#0a1018;color:#eee}main{height:2400px;padding:24px}</style><main><h1>${id}</h1><input aria-label="Draft"><audio muted></audio><a href="./next.html">Next</a></main><script>window.boots=(window.boots||0)+1</script>`;
const fixture = `import { For, createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { RetainedPanel } from '/packages/core/src/components/ui/RetainedPanel';
import { SandboxedHtmlFrame } from '/packages/core/src/components/html-preview/SandboxedHtmlFrame';
const [active,setActive]=createSignal('a'),[source,setSource]=createSignal(${JSON.stringify(documentHTML('a'))});
const [ids,setIds]=createSignal(['a','b']);const events=[];let opened=0;
const dispose=render(()=><main><nav><For each={ids()}>{id=><button onClick={()=>setActive(id)}>{id}</button>}</For></nav>
<div id="viewport" style="position:relative;width:100%;height:600px;background:#0a1018;--background:#0a1018">
<For each={ids()}>{id=><RetainedPanel active={active()===id} data-document={id}>
<SandboxedHtmlFrame title={id} html={id==='a'?source():${JSON.stringify(documentHTML('b'))}} active={active()===id}
renderPending={()=><span role="status">Preparing</span>} onPresentationStateChange={state=>events.push({id,state})} onOpenLink={()=>{opened++}} />
</RetainedPanel>}</For></div></main>,document.getElementById('root'));
window.preview={select:setActive,replace:setSource,remove:id=>setIds(ids=>ids.filter(value=>value!==id)),events,opened:()=>opened,dispose};`;
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true },
  resolve: { alias: ['solid-js', 'solid-js/web', 'solid-js/store', 'solid-js/html', 'solid-js/h'].map(name => ({ find: new RegExp('^' + name + '$'), replacement: requireCore.resolve(name + (name === 'solid-js' ? '/dist/solid.js' : '/dist/' + name.split('/')[1] + '.js')) })) },
  plugins: [solid({ hot: false }), { name: 'preview-continuity-fixture', resolveId: id => id === '/fixture.tsx' ? id : undefined,
    load: id => id === '/fixture.tsx' ? fixture : undefined,
    configureServer(instance) { instance.middlewares.use((request, response, next) => {
      if (request.url !== '/') return next(); response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><style>body{margin:0}#viewport>div>span{display:flex;height:100%;flex-direction:column;position:relative}</style><div id="root"></div><script type="module" src="/fixture.tsx"></script>');
    }); },
  }], server: { host: '127.0.0.1', port: 0, hmr: false } });
const results = [];
try {
  await server.listen();
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit], ['firefox', firefox]]) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const width of [390, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
        page.setDefaultTimeout(10000);
        await page.goto(server.resolvedUrls.local[0]);
        await page.waitForFunction(() => document.querySelectorAll('[data-floe-html-state="ready"]').length === 2);
        const panels = page.locator('[data-floe-retained-panel]');
        const handles = await page.locator('#viewport iframe').elementHandles();
        const frames = await Promise.all(handles.map(handle => handle.contentFrame()));
        for (let index = 0; index < 2; index++) {
          await page.getByRole('button', { name: index ? 'b' : 'a', exact: true }).click();
          await frames[index].getByRole('textbox', { name: 'Draft' }).fill('Preserved ' + index);
          await page.getByRole('button', { name: index ? 'b' : 'a', exact: true }).focus();
          await page.waitForTimeout(150);
          await frames[index].evaluate(() => { document.activeElement.blur(); window.scrollTo({top:420,behavior:"instant"}); });
          await frames[index].waitForFunction(()=>window.scrollY===420).catch(async error=>{console.error({name,width,index,geometry:await frames[index].evaluate(()=>({height:innerHeight,scroll:scrollY,max:document.documentElement.scrollHeight,body:document.body.scrollHeight}))});throw error;});
        }
        const geometry = await panels.evaluateAll(elements => elements.map(element => ({ width: element.clientWidth, height: element.clientHeight })));
        assert.deepEqual(geometry, [{ width, height: 600 }, { width, height: 600 }]);
        const session = name === 'chromium' ? await page.context().newCDPSession(page) : undefined;
        const paints = [];
        if (session) {
          session.on('Page.screencastFrame', event => { paints.push(event.data); void session.send('Page.screencastFrameAck', { sessionId: event.sessionId }); });
          await session.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
        }
        for (let index = 0; index < 12; index++) {
          const current = index % 2;
          await page.getByRole('button', { name: current ? 'b' : 'a', exact: true }).click();
          assert.equal(await frames[current].evaluate(() => window.scrollY),420, JSON.stringify({name,width,index,geometry:await frames[current].evaluate(()=>({h:innerHeight,y:scrollY,active:document.activeElement.tagName}))}));
          assert.equal(await frames[current].getByRole('textbox', { name: 'Draft' }).inputValue(),'Preserved '+current);
          assert.equal(await frames[current].evaluate(() => window.boots),1);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        }
        if (session) {
          await session.send('Page.stopScreencast'); await session.detach();
          const box = await page.locator('#viewport').boundingBox();
          const samples = await page.evaluate(async ({ paints, box }) => {
            const canvas = document.createElement('canvas'); const context = canvas.getContext('2d'); const samples = [];
            for (const data of paints) {
              const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(data), c => c.charCodeAt(0))], { type: 'image/png' }));
              canvas.width = bitmap.width; canvas.height = bitmap.height; context.drawImage(bitmap,0,0); bitmap.close();
              for (const [x,y] of [[.5,.5],[.75,.75],[.25,.75]]) samples.push([...context.getImageData(Math.floor(box.x+box.width*x),Math.floor(box.y+box.height*y),1,1).data].slice(0,3));
            } return samples;
          }, { paints, box });
          assert.ok(paints.length >= 6, 'Capture several real compositor frames');
          assert.ok(samples.every(rgb => rgb.every(value => value < 50)), 'Dark pages never expose a light intermediate surface: ' + JSON.stringify(samples));
        }
        // A private host activation message pauses native media without restarting it.
        await frames[1].evaluate(async () => {
          const context = new AudioContext(); const oscillator = context.createOscillator();
          const stream = context.createMediaStreamDestination(); oscillator.connect(stream); oscillator.start();
          const audio = document.querySelector('audio'); audio.srcObject = stream.stream; await audio.play();
          window.mediaTest = { context, oscillator, audio };
        });
        await page.getByRole('button', { name: 'a', exact: true }).click();
        await frames[1].waitForFunction(()=>window.mediaTest.audio.paused);
        await page.getByRole('button', { name: 'b', exact: true }).click();
        assert.equal(await frames[1].evaluate(()=>window.mediaTest.audio.paused),true,'Reactivation does not autoplay');
        await frames[1].evaluate(async()=>{window.mediaTest.oscillator.stop();await window.mediaTest.context.close()});
        const inactive = page.locator('[data-document="a"]');
        assert.equal(await inactive.getAttribute('aria-hidden'),'true');
        assert.equal(await inactive.evaluate(element=>element.inert),true);
        assert.equal(await inactive.evaluate(element=>getComputedStyle(element).visibility),'hidden');
        await page.setViewportSize({ width: width + 40, height: 800 });
        await page.getByRole('button', { name: 'a', exact: true }).click();
        assert.equal(await frames[0].evaluate(()=>window.innerWidth),width+40);
        assert.equal(await frames[0].evaluate(()=>window.scrollY),420);
        await page.evaluate(() => { window.preview.replace('<h1>Obsolete</h1>'); window.preview.replace('<h1>Current</h1>'); });
        await frames[0].getByRole('heading',{name:'Current',exact:true}).waitFor();
        await page.waitForFunction(()=>document.querySelector('[data-document="a"] [data-floe-html-state]')?.dataset.floeHtmlState==='ready');
        await page.evaluate(() => window.preview.replace('<h1>Slow document</h1><script>const until=performance.now()+180;while(performance.now()<until){}</script>'));
        assert.equal(await page.locator('[data-document="a"] [data-floe-html-state]').getAttribute('data-floe-html-state'),'loading');
        assert.equal(await page.locator('[data-document="a"] iframe').evaluate(element=>element.inert),true);
        await page.waitForFunction(()=>document.querySelector('[data-document="a"] [data-floe-html-state]')?.dataset.floeHtmlState==='ready');
        const states = await page.evaluate(()=>window.preview.events.filter(event=>event.id==='a').map(event=>event.state));
        assert.equal(states[0],'loading'); assert.equal(states.at(-1),'ready');
        assert.equal(await frames[1].getByRole('textbox',{name:'Draft'}).inputValue(),'Preserved 1');
        await page.evaluate(()=>window.preview.remove('a'));
        assert.equal(await page.locator('[data-document="a"]').count(),0);
        await page.evaluate(()=>window.preview.dispose()); assert.equal(await page.locator('iframe').count(),0);
        results.push({engine:name,width,switches:12,sampledFrames:paints.length}); await page.close();
      }
    } finally { await browser.close(); }
  }
  console.log('PASS preview continuity',JSON.stringify(results));
} finally { await server.close(); }
