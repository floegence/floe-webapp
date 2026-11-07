/* global window, CSS, scrollY */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { chromium } from 'playwright';
import solid from 'vite-plugin-solid';
const requireCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(requireCore.resolve('vite'));
const { default: tailwind } = await import(requireCore.resolve('@tailwindcss/vite'));
const fixture = `import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { SandboxedHtmlFrame } from '/packages/core/src/components/html-preview/SandboxedHtmlFrame';
import { createTextSearch } from '/packages/core/src/components/ui/textSearch';
import { TextSearchBar } from '/packages/core/src/components/ui/TextSearchBar';
import '/packages/core/src/styles/globals.css';
render(()=>{
 const [api,setApi]=createSignal(); const [active,setActive]=createSignal(true);
 const [state,setState]=createSignal({current:0,total:0}); const [ready,setReady]=createSignal(false);
 const [html,setHtml]=createSignal('<h1>Hello <b>world</b></h1><button>Hello world excluded</button><div style="height:1400px"></div><p>Hello world</p>');
 const search=createTextSearch({identity:html,active,engine:{state,search:(q,d)=>{if(ready())api()?.search(q,d)},clear:()=>api()?.clear()}});
 window.searchTest={setActive,replace:()=>setHtml('<h1>Replacement text</h1>')};
 return <><button id="find" onClick={e=>search.show(e.currentTarget)}>Find</button><TextSearchBar search={search} labels={{find:'Find',previous:'Previous',next:'Next',close:'Close',noMatches:'No matches',matches:(c,t)=>c+' of '+t}}/>
 <div style="height:400px"><SandboxedHtmlFrame html={html()} title="Document" active={active()} onSearchReady={setApi} onSearchState={setState} onPresentationStateChange={s=>setReady(s==='ready')} onSearchRequest={a=>a==='open'?search.show():search.close()}/></div></>;
},document.getElementById('root'));`;
const server = await createServer({
  configFile: false, optimizeDeps: { noDiscovery: true },
  resolve: { alias: [
    { find: /^solid-js$/, replacement: requireCore.resolve('solid-js/dist/solid.js') },
    { find: 'solid-js/web', replacement: requireCore.resolve('solid-js/web/dist/web.js') },
    { find: 'solid-js/store', replacement: requireCore.resolve('solid-js/store/dist/store.js') },
    { find: 'solid-js/html', replacement: requireCore.resolve('solid-js/html/dist/html.js') },
    { find: 'solid-js/h', replacement: requireCore.resolve('solid-js/h/dist/h.js') },
  ] },
  plugins: [solid({ hot: false }), tailwind(), {
    name: 'html-preview-regression',
    resolveId: id => id === '/html-fixture.tsx' ? id : undefined,
    load: id => id === '/html-fixture.tsx' ? fixture : undefined,
    configureServer(instance) {
      instance.middlewares.use((request, response, next) => {
        if (request.url === '/') {
          response.setHeader('Content-Type', 'text/html');
          response.end('<!doctype html><html><body><div id="root"></div><script type="module" src="/html-fixture.tsx"></script></body></html>');
        }
        else next();
      });
    },
  }], server: { host: '127.0.0.1', port: 0, hmr: false },
});

try {
 await server.listen(); const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.resolvedUrls.local[0]); await page.locator('[data-floe-html-state="ready"]').waitFor();
  await page.locator('#find').click(); await page.getByRole('searchbox').fill('hello world');
  await page.getByRole('status').filter({hasText:'1 of 2'}).waitFor();
  const frame=page.frameLocator('iframe');
  assert.equal(await frame.locator('body').evaluate(()=>CSS.highlights.get('floe-html-find').size),2);
  await page.getByRole('searchbox').press('Enter');await page.getByRole('status').filter({hasText:'2 of 2'}).waitFor();
  assert.ok(await frame.locator('body').evaluate(()=>scrollY)>500);
  await page.evaluate(()=>window.searchTest.setActive(false));
  await page.waitForTimeout(50);assert.equal(await frame.locator('body').evaluate(()=>CSS.highlights.size),0);
  await page.evaluate(()=>window.searchTest.setActive(true));
  await page.getByRole('searchbox').press('Escape');
  assert.equal(await page.getByRole('searchbox').count(),0);
  await frame.locator('h1').click();await page.keyboard.press('ControlOrMeta+f');
  await page.getByRole('searchbox').waitFor();
  await page.evaluate(()=>window.searchTest.replace());await page.locator('[data-floe-html-state="ready"]').waitFor();
  assert.equal(await page.getByRole('searchbox').count(),0);
  assert.deepEqual(errors,[]);console.log('HTML search: inline matching, navigation, inactive cleanup, shortcut and replacement passed');
 }finally{await browser.close()}
}finally{await server.close()}
