/* global window, document, Event, EventTarget */
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
const fixture = await mkdtemp(resolve(root, 'packages/core/.viewport-test-'));
let server;
try {
  await writeFile(resolve(fixture, 'index.html'), '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><div id="root"></div><script type="module" src="./main.tsx"></script>');
  await writeFile(resolve(fixture, 'main.tsx'), `
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { FloeProvider } from '../dist/app.js';
import { AppViewport, Shell, BottomBarCompanion } from '../dist/layout.js';
import '../dist/styles.css';
document.documentElement.style.overflow = 'hidden';
document.body.style.margin = '0';
const report = () => requestAnimationFrame(() => requestAnimationFrame(() => {
 const input=document.querySelector('textarea'), nav=document.querySelector('nav'), panel=document.querySelector('#composer');
 fetch('/__viewport-evidence', {method:'POST',body:JSON.stringify({viewport:window.viewportSnapshot,focused:document.activeElement===input,navHidden:nav?.hidden,panel:panel?.getBoundingClientRect().toJSON(),scroll:document.scrollingElement?.scrollTop,windowY:window.scrollY,innerHeight:window.innerHeight,root:document.querySelector('[data-floe-app-viewport]')?.getBoundingClientRect().toJSON(),anchor:document.querySelector('[data-floe-shell-slot=mobile-accessory]')?.getBoundingClientRect().toJSON(),panelStyle:panel?.getAttribute('style'),value:input?.value})});
}));
document.addEventListener('input',report);

function App() {
 const [anchor, setAnchor] = createSignal(null), [mount, setMount] = createSignal(null);
 const Icon = () => <span>●</span>;
 return <FloeProvider><AppViewport onViewportChange={v => {window.viewportSnapshot = v;report();}}>
  <Shell fillParent sidebarMode="hidden" hideMobileNavigationWhenKeyboardOpen
   logo={<span>Viewport acceptance</span>} activityItems={[{id:'files',label:'Files',icon:Icon},{id:'services',label:'Services',icon:Icon}]}
   mobileAccessory={<div style={{padding:'8px 12px'}}><div ref={setAnchor} style={{height:'44px'}} /></div>}>
   <div style={{height:'100%',overflow:'auto'}} data-scroll>
    {Array.from({length:80}, (_,i) => <div style={{height:'40px'}}>File {i + 1}</div>)}
   </div>
  </Shell>
 </AppViewport><div ref={setMount} />
 <BottomBarCompanion retained visible open={false} anchor={anchor()} mount={mount()} id="composer" label="Composer">
  <textarea aria-label="Message" style={{width:'100%',height:'100%','font-size':'16px'}} />
 </BottomBarCompanion></FloeProvider>;
}
render(() => <App />, document.getElementById('root'));
`);
  server = await createServer({ configFile: false, root: resolve(root, 'packages/core'), plugins: [solid(), {name:'viewport-evidence',configureServer(s){s.middlewares.use('/__viewport-evidence',(req,res)=>{let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{if(process.argv.includes('--serve')) console.log(body);res.end('ok');});});}}],
    optimizeDeps: { entries: [resolve(fixture, 'index.html')] }, server: {host:'127.0.0.1',port:0} });
  await server.listen();
  const url = `${server.resolvedUrls.local[0]}${fixture.split('/').at(-1)}/`;
  if (process.argv.includes('--serve')) {
    await writeFile('/tmp/floe-mobile-safari-url',url);
    console.log(url);
    await new Promise(resolve => {process.once('SIGTERM',resolve);process.once('SIGINT',resolve);});
  } else for (const engine of [chromium, webkit]) {
    const browser = await engine.launch({headless:true});
    try {
      const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        const viewport = Object.assign(new EventTarget(), {width:390,height:844,offsetLeft:0,offsetTop:0,scale:1});
        Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
        window.setVisibleRect = next => {Object.assign(viewport,next);viewport.dispatchEvent(new Event('resize'));};
      });
      await page.goto(url);
      const input = page.getByRole('textbox', {name:'Message'});
      await input.waitFor();
      await page.waitForFunction(() => document.querySelector('#composer')?.getBoundingClientRect().height === 44);
      await page.evaluate(() => {window.originalEditor=document.querySelector('textarea');window.originalNav=document.querySelector('nav');});
      await page.setViewportSize({width:390,height:700});
      await page.evaluate(() => window.setVisibleRect({height:700}));
      await page.waitForFunction(() => window.viewportSnapshot?.visible.height === 700);
      assert.equal(await page.locator('nav').isVisible(), true, 'browser chrome must not hide navigation');
      await input.fill('Draft 中文');
      await input.evaluate(el => el.setSelectionRange(2,4));
      await page.waitForFunction(() => window.viewportSnapshot.keyboardOpen === false);
      for (let i=0;i<3;i++) {
        await page.evaluate(() => window.setVisibleRect({height:420,offsetTop:30}));
        await page.waitForFunction(() => document.querySelector('nav')?.hidden === true);
        await page.waitForFunction(() => document.querySelector('#composer').getBoundingClientRect().bottom <= 450);
        const result = await page.evaluate(() => {
          const editor=document.querySelector('textarea'), panel=document.querySelector('#composer').getBoundingClientRect();
          return {same:editor===window.originalEditor,focused:document.activeElement===editor,value:editor.value,selection:editor.selectionStart,bottom:panel.bottom,scroll:document.scrollingElement.scrollTop};
        });
        assert.deepEqual({...result,bottom:0}, {same:true,focused:true,value:'Draft 中文',selection:2,bottom:0,scroll:0});
        assert(result.bottom >= 438, 'composer must follow the lower edge, not remain in the middle');
        await page.evaluate(() => window.setVisibleRect({height:700,offsetTop:0}));
        await page.waitForFunction(() => document.querySelector('nav')?.hidden === false);
      }
      assert.equal(await page.evaluate(() => document.querySelector('nav')===window.originalNav), true);
      await page.locator('[data-scroll]').evaluate(el => {el.scrollTop=el.scrollHeight;});
      assert.equal(await page.locator('[data-scroll]').evaluate(el => Math.abs(el.scrollHeight-el.scrollTop-el.clientHeight)<1),true);
      assert.deepEqual(errors,[]);
      console.log(`${engine.name()}: visible bounds, keyboard navigation, retained input and last-row reachability passed`);
    } finally {await browser.close();}
  }
} finally {await server?.close();await rm(fixture,{recursive:true,force:true});}
