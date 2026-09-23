/* global window, document, Event, EventTarget, Element */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, URL } from 'node:url';
import solid from 'vite-plugin-solid';
import { chromium, webkit } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const fixture = await mkdtemp(resolve(root, 'packages/core/.overlay-viewport-test-'));
let server;
try {
  await writeFile(resolve(fixture, 'index.html'), '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><div id="root"></div><script type="module" src="./main.tsx"></script>');
  await writeFile(resolve(fixture, 'main.tsx'), `
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { FloeProvider } from '../dist/app.js';
import { Dialog, FloatingWindow } from '../dist/ui.js';
import { observeViewport } from '../dist/viewport.js';
import '../dist/styles.css';
document.body.style.margin='0';
const style=document.createElement('style');style.textContent='.oversize {height:calc(100dvh - 8px);width:calc(100vw - 8px);max-height:none;max-width:none}';document.head.append(style);
observeViewport(window, snapshot => window.viewportSnapshot=snapshot);
function App() {
 const [kind,setKind]=createSignal(new URLSearchParams(location.search).get('kind') || 'dialog');
 const content=() => <><textarea aria-label="Draft" style={{'font-size':'16px',height:'60px'}} /><div style={{height:'1800px'}}>Long reading content</div><p data-last>Last line</p></>;
 return <FloeProvider>
  <div data-floe-dialog-surface-host={kind()==='projected'?'true':undefined}
    style={kind()==='projected'?{position:'relative',width:'1200px',height:'1400px',transform:'translate(-30px, -20px) scale(0.75)','transform-origin':'top left'}:undefined}>
  <Dialog open={kind()!=='window' && kind()!=='closed'} onOpenChange={()=>setKind('closed')} title="Preview" presentation={kind()==='drawer'?'bottom-drawer':kind()==='side'?'side-drawer':'dialog'} class="oversize" footer={<button>Save</button>}>{content()}</Dialog></div>
  <FloatingWindow open={kind()==='window'} onOpenChange={()=>setKind('closed')} title="Floating preview" defaultSize={{width:900,height:900}} footer={<button>Save</button>}>{content()}</FloatingWindow>
 </FloeProvider>;
}
render(()=><App/>,document.getElementById('root'));
`);
  server = await createServer({configFile:false,root:resolve(root,'packages/core'),plugins:[solid()],optimizeDeps:{entries:[resolve(fixture,'index.html')]},server:{host:'127.0.0.1',port:0}});
  await server.listen();
  const url = `${server.resolvedUrls.local[0]}${fixture.split('/').pop()}/`;
  if(process.argv.includes('--serve')) {console.log(url);await new Promise(()=>{});}
  for(const engine of [chromium,webkit]) {
    const browser=await engine.launch();
    try {
      for(const kind of ['dialog','drawer','side','window','projected']) {
        const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
        const errors=[];page.on('pageerror',error=>errors.push(error.message));
        await page.addInitScript(()=>{
          // This optional DOM API is not available in every WebKit port.
          Object.defineProperty(Element.prototype,'currentCSSZoom',{configurable:true,get:()=>undefined});
          window.expectedFixedScale=1;
          const viewport=Object.assign(new EventTarget(),{width:390,height:700,offsetLeft:0,offsetTop:44,scale:1});
          Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
          const computed=window.getComputedStyle.bind(window);
          window.getComputedStyle=(element,...args)=>{
            const style=computed(element,...args);
            if(element.style.height!=='100dvh' || element.style.visibility!=='hidden') return style;
            return new Proxy(style,{get(target,key){return ({paddingTop:'20px',paddingRight:'8px',paddingBottom:'34px',paddingLeft:'8px'})[key] ?? Reflect.get(target,key);}});
          };
          window.setVisibleRect=next=>{Object.assign(viewport,next);viewport.dispatchEvent(new Event('resize'));};
        });
        await page.goto(`${url}?kind=${kind}`);
        const panel=page.locator('[role=dialog]');await panel.waitFor();
        await page.waitForTimeout(300);
        const assertBounds=async()=>{
          await page.waitForFunction(()=>{
            const rect=document.querySelector('[role=dialog]')?.getBoundingClientRect(),v=window.viewportSnapshot;
            if(!v || v.fixedScale!==window.expectedFixedScale || v.visible.width!==window.visualViewport.width || v.visible.height!==window.visualViewport.height || Math.abs(v.visible.top+v.fixedOffset.top-window.visualViewport.offsetTop)>1 || Math.abs(v.visible.left+v.fixedOffset.left-window.visualViewport.offsetLeft)>1) return false;
            return rect && rect.top>=v.visible.top+v.safeArea.top-1 && rect.bottom<=v.visible.bottom-v.safeArea.bottom+1 && rect.left>=v.visible.left+v.safeArea.left-1 && rect.right<=v.visible.right-v.safeArea.right+1;
          },null,{timeout:3000});
          const close=page.getByRole('button',{name:'Close',exact:true});
          assert(await close.isVisible(),'close control remains reachable');
          assert(await page.getByRole('button',{name:'Save',exact:true}).isVisible(),'footer remains reachable');
        };
        await assertBounds();
        if(kind==='projected') assert.equal(await page.locator('[data-floe-dialog-mode]').getAttribute('data-floe-dialog-mode'),'surface');
        const input=page.getByRole('textbox',{name:'Draft'});await input.fill('Retained 中文 draft');
        await input.evaluate(el=>{window.originalEditor=el;el.setSelectionRange(3,5);});
        for(let index=0;index<3;index++) {
          await page.evaluate(()=>window.setVisibleRect({height:320,offsetTop:120}));await assertBounds();
          assert.deepEqual(await input.evaluate(el=>({same:el===window.originalEditor,focused:document.activeElement===el,value:el.value,start:el.selectionStart,end:el.selectionEnd})),{same:true,focused:true,value:'Retained 中文 draft',start:3,end:5});
          await page.evaluate(()=>window.setVisibleRect({height:700,offsetTop:44}));await assertBounds();
        }
        // CSS zoom changes fixed CSS units while client viewport coordinates stay stable.
        for (const target of ['body', 'documentElement']) {
          await page.evaluate(target=>{window.expectedFixedScale=2;document[target].style.zoom='2';}, target);
          await assertBounds();
          assert.equal(await input.inputValue(), 'Retained 中文 draft');
          await page.evaluate(target=>{window.expectedFixedScale=1;document[target].style.zoom='';}, target);
          await assertBounds();
        }
        // Safari can pan the fixed containing block while the keyboard is open.
        await page.evaluate(()=>{document.documentElement.style.transform='translateY(-110px)';window.setVisibleRect({height:320,offsetTop:120});});
        await assertBounds();
        await page.evaluate(()=>{document.documentElement.style.transform='';window.setVisibleRect({height:700,offsetTop:44});});
        await assertBounds();
        await page.setViewportSize({width:844,height:390});
        await page.evaluate(()=>window.setVisibleRect({width:790,height:310,offsetLeft:27,offsetTop:20}));await assertBounds();
        await page.locator('[data-floe-dialog-body], [data-floe-floating-window-content]').evaluate(el=>{el.scrollTop=el.scrollHeight;});
        await page.waitForFunction(()=>{
          const last=document.querySelector('[data-last]').getBoundingClientRect();
          const body=document.querySelector('[data-floe-dialog-body], [data-floe-floating-window-content]').getBoundingClientRect();
          return last.top>=body.top-1 && last.bottom<=body.bottom+1;
        }, null, {timeout:3000}).catch(async error=>{
          console.error(engine.name(),kind,await page.evaluate(()=>({last:document.querySelector('[data-last]').getBoundingClientRect().toJSON(),body:Array.from(document.querySelectorAll('[data-floe-dialog-body], [data-floe-floating-window-content]')).map(el=>({rect:el.getBoundingClientRect().toJSON(),scroll:el.scrollTop,total:el.scrollHeight,height:el.clientHeight})),viewport:window.viewportSnapshot})));
          throw error;
        });
        assert.deepEqual(errors,[]);
        await page.close();console.log(`${engine.name()} ${kind}: visible bounds, retained editor, rotation and last line passed`);
      }
    } finally {await browser.close();}
  }
} finally {await server?.close();await rm(fixture,{recursive:true,force:true});}
