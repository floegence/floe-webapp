/* global window, document, location, MessageEvent */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { chromium, webkit } from 'playwright';
import solid from 'vite-plugin-solid';

const requireCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(requireCore.resolve('vite'));
const { default: tailwind } = await import(requireCore.resolve('@tailwindcss/vite'));
const html = `<h1>Daily brief</h1><a href="#economy">Economy</a>
<a href="https://example.com/news">News source</a><a href="./details.html">Related file</a>
<a href="javascript:alert(1)">Unsupported link</a><a href="#missing">Missing section</a>
<a href="./slow.html">Slow file</a>
<input aria-label="Note" value="Original"><button onclick="this.textContent='Changed'">Change</button>
<form action="/forbidden"><button>Submit</button></form><img src="/forbidden"><script src="/forbidden"></script>
<section id="economy" tabindex="-1" style="margin-top:1200px">Economy section</section>
<script>
const token=document.scripts[0].textContent.match(/token:"([^"]+)"/)[1];
const fake=new MessageChannel();
parent.postMessage({type:'floe-html-ready',token},'*',[fake.port2]);
fake.port1.postMessage({type:'open-link',href:'https://forged.invalid'});
parent.postMessage({type:'open-link',href:'https://forged.invalid'},'*');
setTimeout(()=>{document.querySelector('a[href="https://example.com/news"]').click();document.body.dataset.synthetic='done'},0);
fetch('/forbidden').catch(()=>{});
try{parent.previewEscape=true}catch{document.body.dataset.parentBlocked='true'}
try{localStorage.setItem('escape','true')}catch{document.body.dataset.storageBlocked='true'}
const fakeTarget=document.createElement('a');fakeTarget.href='https://forged.invalid';
Object.defineProperty(Event.prototype,'target',{get:()=>fakeTarget});
</script>`;
const fixture = `import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { MarkdownMedia } from '/packages/core/src/components/chat/blocks/MarkdownMedia';
import '/packages/core/src/styles/globals.css';
const labels={image:'Image',video:'Video',audio:'Audio',html:'Interactive preview',loading:'Loading',unavailable:'Unavailable',retry:'Retry',expand:'Expand preview',collapse:'Collapse preview',open:'Open source',close:'Close preview',previewHTMLWindow:'Open preview window',anchorUnavailable:'Section unavailable'};
const [source,setSource]=createSignal({kind:'html',html:${JSON.stringify(html)},title:'Daily brief'});
const opened=[];
const dispose=render(()=><main style="max-width:680px;margin:auto"><MarkdownMedia source={source()} labels={labels} onOpenLink={async (_source,href,signal)=>{opened.push(href);if(href==='./slow.html'){window.htmlTest.pending=signal;await new Promise(resolve=>signal.addEventListener('abort',resolve));throw new Error('Obsolete failure')}if(href.startsWith('javascript:'))throw new Error('Unsupported link protocol.')}}/></main>,document.getElementById('root'));
window.htmlTest={opened,replace:()=>setSource({kind:'html',html:'<h1>Replacement</h1>',title:'Replacement'}),dispose};`;
let forbiddenRequests = 0;
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
        } else if (request.url === '/forbidden') { forbiddenRequests++; response.end('forbidden'); }
        else next();
      });
    },
  }], server: { host: '127.0.0.1', port: 0, hmr: false },
});

try {
  await server.listen();
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
      page.setDefaultTimeout(5000);
      await page.goto(server.resolvedUrls.local[0]);
      const frame = page.frameLocator('#root iframe.chat-media-html');
      await frame.getByRole('heading', { name: 'Daily brief' }).waitFor();
      await frame.locator('body[data-synthetic="done"][data-parent-blocked="true"][data-storage-blocked="true"]').waitFor();
      const token = await frame.locator('script').first().evaluate(element => element.textContent.match(/token:"([^"]+)"/)[1]);
      await page.evaluate(async token => {
        window.dispatchEvent(new MessageEvent('message', { source: document.querySelector('iframe').contentWindow, data: { type: 'floe-html-ready', token } }));
        const sibling = document.createElement('iframe');
        sibling.hidden = true;
        sibling.sandbox = 'allow-scripts';
        sibling.srcdoc = `<script>const c=new MessageChannel();parent.postMessage({type:'floe-html-ready',token:${JSON.stringify(token)}},'*',[c.port2]);c.port1.postMessage({type:'open-link',href:'https://other-frame.invalid'});</script>`;
        await new Promise(resolve => { sibling.onload = resolve; document.body.append(sibling); });
        sibling.remove();
      }, token);
      assert.deepEqual(await page.evaluate(() => window.htmlTest.opened), [], 'Page scripts cannot forge link activation');
      await frame.getByRole('link', { name: 'Economy', exact: true }).click();
      await frame.locator('#economy').waitFor({ state: 'visible' });
      assert.ok(await frame.locator('html').evaluate(() => window.scrollY) > 1000);
      assert.equal(await frame.locator('html').evaluate(() => location.href), 'about:srcdoc');
      assert.equal(await page.evaluate(() => window.previewEscape), undefined);
      assert.equal(forbiddenRequests, 0);
      await frame.getByRole('button', { name: 'Submit', exact: true }).click();
      assert.equal(await frame.locator('html').evaluate(() => location.href), 'about:srcdoc');
      await frame.getByRole('link', { name: 'News source' }).focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => window.htmlTest.opened.length === 1);
      await frame.getByRole('link', { name: 'Related file' }).click();
      await page.waitForFunction(() => window.htmlTest.opened.length === 2);
      assert.deepEqual(await page.evaluate(() => window.htmlTest.opened), ['https://example.com/news', './details.html']);
      await frame.getByRole('link', { name: 'Unsupported link' }).click();
      await page.getByRole('alert').filter({ hasText: 'Unsupported link protocol.' }).waitFor();
      assert.equal(await frame.locator('html').evaluate(() => location.href), 'about:srcdoc');
      await frame.getByRole('link', { name: 'Missing section' }).click();
      await page.getByRole('alert').filter({ hasText: 'Section unavailable' }).waitFor();
      await frame.getByRole('link', { name: 'Economy', exact: true }).click();
      await page.getByRole('alert').waitFor({ state: 'detached' });
      await frame.getByRole('textbox', { name: 'Note' }).fill('Keep inline state');
      await frame.getByRole('button', { name: 'Change', exact: true }).click();
      const inline = await page.locator('iframe').elementHandle();
      const scroll = await page.evaluate(() => window.scrollY);
      await page.getByRole('button', { name: 'Open preview window' }).click();
      const floating = page.locator('.chat-media-preview-window');
      await floating.waitFor();
      const copy = floating.frameLocator('iframe');
      assert.equal(await copy.getByRole('textbox', { name: 'Note' }).inputValue(), 'Original');
      assert.equal(await inline.evaluate(element => element === document.querySelector('iframe.chat-media-html')), true);
      assert.equal(await frame.getByRole('textbox', { name: 'Note' }).inputValue(), 'Keep inline state');
      await frame.getByRole('button', { name: 'Changed', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.scrollY), scroll);
      await copy.getByRole('link', { name: 'News source' }).click();
      await page.waitForFunction(() => window.htmlTest.opened.length === 4);
      await page.getByRole('button', { name: 'Close preview', exact: true }).click();
      await floating.waitFor({ state: 'detached' });
      assert.equal(await page.getByRole('button', { name: 'Open preview window' }).evaluate(element => element === document.activeElement), true);
      await page.setViewportSize({ width: 360, height: 740 });
      await page.getByRole('button', { name: 'Open preview window' }).click();
      await floating.waitFor();
      const bounds = await floating.boundingBox();
      assert.ok(bounds.width <= 360 && bounds.height <= 740);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await copy.getByRole('link', { name: 'Slow file' }).click();
      await page.waitForFunction(() => window.htmlTest.pending);
      await page.evaluate(() => window.htmlTest.replace());
      await floating.waitFor({ state: 'detached' });
      await page.frameLocator('iframe').getByRole('heading', { name: 'Replacement' }).waitFor();
      assert.equal(await page.evaluate(() => window.htmlTest.pending.aborted), true);
      assert.equal(await page.getByRole('alert').count(), 0, 'Disposed requests cannot publish errors into the replacement');
      assert.equal(await page.locator('iframe').count(), 1);
      await page.evaluate(() => window.htmlTest.dispose());
      assert.equal(await page.locator('iframe').count(), 0);
      console.log(`PASS ${name}: local anchors, private link intents, isolated floating copies, errors, focus, narrow layout and disposal`);
    } finally { await browser.close(); }
  }
} finally { await server.close(); }
