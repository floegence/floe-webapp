/* global window, document, innerWidth */
import assert from 'node:assert/strict';
import { URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import solid from 'vite-plugin-solid';
const requireCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(requireCore.resolve('vite'));
const { default: tailwind } = await import(requireCore.resolve('@tailwindcss/vite'));
const video = readFileSync(new URL('./fixtures/media/scheduler.mp4', import.meta.url));
const labels = { image: 'Image', video: 'Video', audio: 'Audio', html: 'Interactive preview', loading: 'Loading preview…', unavailable: 'Preview unavailable', retry: 'Retry', expand: 'Expand preview', collapse: 'Collapse preview', open: 'Open source', close: 'Close preview' };
const fixture = `import { render } from 'solid-js/web';
import { MarkdownMedia } from '/packages/core/src/components/chat/blocks/MarkdownMedia';
import '/packages/core/src/styles/globals.css';
const labels = ${JSON.stringify(labels)};
const html = ${JSON.stringify(`<h1>Preview workspace</h1><button onclick="this.textContent='Clicked'">Try interaction</button><script>try{parent.previewEscape=true}catch{};fetch('/should-not-fetch').catch(()=>{});</script>`)};
render(() => <main style="max-width:680px;margin:auto"><MarkdownMedia labels={labels} source={{kind:'html',title:'Interactive report',html}}/><MarkdownMedia labels={labels} source={{kind:'video',title:'Demo clip',src:location.origin+'/media.mp4'}}/><MarkdownMedia labels={labels} source={{kind:'image',title:'Design study',src:location.origin+'/image.svg'}}/></main>, document.getElementById('root'));`;
let forbiddenRequests = 0;
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, resolve: { alias: [{ find: /^solid-js$/, replacement: requireCore.resolve('solid-js/dist/solid.js') }, { find: 'solid-js/web', replacement: requireCore.resolve('solid-js/web/dist/web.js') }, { find: 'solid-js/html', replacement: requireCore.resolve('solid-js/html/dist/html.js') }, { find: 'solid-js/h', replacement: requireCore.resolve('solid-js/h/dist/h.js') }, { find: 'solid-js/store', replacement: requireCore.resolve('solid-js/store/dist/store.js') }] }, plugins: [solid({ hot: false }), tailwind(), { name: 'chat-media-fixture', resolveId(id) { if (id === '/fixture.tsx') return '/fixture.tsx'; }, load(id) { if (id === '/fixture.tsx') return fixture; }, configureServer(instance) {
  instance.middlewares.use((req, res, next) => {
    if (req.url === '/') { res.setHeader('Content-Type','text/html'); res.end('<html><head><style>:root{--background:#fff;--card:#fff;--foreground:#262626;--muted:#f5f5f5;--muted-foreground:#666;--border:#ddd;--ring:#555}body{font-family:system-ui}button,a{color:inherit}button{border:0}svg{width:20px}</style></head><body><div id="root"></div><script type="module" src="/fixture.tsx"></script></body></html>'); }
    else if (req.url === '/media.mp4') { const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? ''); const start = range ? Number(range[1]) : 0; const end = range?.[2] ? Math.min(Number(range[2]),video.length-1) : video.length-1; res.writeHead(range ? 206 : 200, {'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':end-start+1,...(range ? {'Content-Range':`bytes ${start}-${end}/${video.length}`} : {})}); res.end(video.subarray(start,end+1)); }
    else if (req.url === '/image.svg') { res.setHeader('Content-Type','image/svg+xml'); res.end('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="280"><rect width="640" height="280" fill="#dde5d7"/><circle cx="320" cy="140" r="80" fill="#597b58"/></svg>'); }
    else if (req.url === '/should-not-fetch') { forbiddenRequests++; res.end('blocked'); }
    else next();
  });
} }], server: {host:'127.0.0.1',port:0} });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({headless:true,channel:'chromium'});
  const page = await browser.newPage({viewport:{width:1000,height:1100}});
  await page.goto(server.resolvedUrls.local[0]);
  const iframe = page.frameLocator('iframe');
  await iframe.getByRole('button', {name:'Try interaction'}).click();
  await iframe.getByRole('button', {name:'Clicked'}).waitFor();
  assert.equal(await page.evaluate(() => window.previewEscape), undefined);
  assert.equal(forbiddenRequests, 0);
  assert.equal(await page.locator('iframe').getAttribute('sandbox'), 'allow-scripts');
  const frame = await page.locator('iframe').elementHandle();
  await page.locator('[data-media-kind=html]').getByRole('button', {name:'Expand preview'}).click();
  assert.equal(await frame.evaluate(node => node === document.querySelector('iframe')), true);
  await page.locator('video').evaluate(async media => { media.muted=true; await media.play(); });
  await page.waitForFunction(() => document.querySelector('video').currentTime > .1);
  await page.locator('video').evaluate(media => { media.pause(); media.currentTime=3; });
  await page.waitForFunction(() => !document.querySelector('video').seeking && document.querySelector('video').currentTime >= 3);
  await page.locator('.chat-media-image-button').click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({state:'detached'});
  await page.locator('.chat-media-full-image').waitFor({state:'detached'});
  await iframe.getByRole('button', {name:'Clicked'}).waitFor();
  await page.locator('[data-media-kind=html]').getByRole('button', {name:'Collapse preview'}).click();
  await page.screenshot({path:'/tmp/floe-chat-media-desktop.png',fullPage:true});
  await page.setViewportSize({width:360,height:900});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({path:'/tmp/floe-chat-media-mobile.png',fullPage:true});
  console.log('PASS: interactive sandbox, network isolation, stable expansion, video playback/seek, image dialog, narrow layout');
} finally { await browser?.close(); await server.close(); }
