/* global window, document, innerWidth, getComputedStyle, location, requestAnimationFrame, navigator */
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
const labels = { image: 'Image', previewImage: 'Preview image', video: 'Video', audio: 'Audio', html: 'Interactive preview', loading: 'Loading preview…', unavailable: 'Preview unavailable', retry: 'Retry', expand: 'Expand preview', collapse: 'Collapse preview', open: 'Open source', close: 'Close preview' };
const fixture = `import { render } from 'solid-js/web';
import { MarkdownMedia } from '/packages/core/src/components/chat/blocks/MarkdownMedia';
import '/packages/core/src/styles/globals.css';
const labels = ${JSON.stringify(labels)};
const html = ${JSON.stringify(`<h1>Preview workspace</h1><button onclick="this.textContent='Clicked'">Try interaction</button><script>try{parent.previewEscape=true}catch{};fetch('/should-not-fetch').catch(()=>{});document.documentElement.dataset.ready='true';</script>`)};
render(() => <main style="max-width:680px;margin:auto"><MarkdownMedia labels={labels} source={{kind:'html',title:'Interactive report',html}}/><MarkdownMedia labels={labels} source={{kind:'video',title:'Demo clip',src:location.origin+'/media.mp4'}}/><MarkdownMedia labels={labels} source={{kind:'image',title:'Design study',src:location.origin+'/image.svg'}}/><section id="host-image"><MarkdownMedia labels={labels} source={{kind:'image',title:'Host file',src:'/host/image.png'}} resolve={async () => ({src:location.origin+'/image.svg',openURL:location.origin+'/image.svg',preview:{label:'Preview image',onSelect:()=>{window.previewCount=(window.previewCount||0)+1}},reveal:{label:'Open containing folder',onSelect:()=>{window.revealCount=(window.revealCount||0)+1}}})}/></section></main>, document.getElementById('root'));`;
const lifecycleFixture = `import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { MarkdownMedia } from '/packages/core/src/components/chat/blocks/MarkdownMedia';
import '/packages/core/src/styles/globals.css';
const [snapshot, setSnapshot] = createSignal(0);
const [source, setSource] = createSignal({kind:'image',title:'Stable image',src:'/first.png'});
const requests = [];
const resolve = (source, signal) => {
  snapshot();
  return new Promise((accept, reject) => requests.push({source, signal, accept, reject}));
};
const [resolver, setResolver] = createSignal(resolve);
const dispose = render(() => <MarkdownMedia source={source()} labels={${JSON.stringify(labels)}} resolve={resolver()}/>, document.getElementById('root'));
window.mediaTest = {
  bump: () => setSnapshot(value => value + 1),
  equalSource: () => setSource(value => ({...value})),
  source: src => setSource({kind:'image',title:'Stable image',src}),
  resolver: () => setResolver(() => (source, signal) => resolve(source, signal)),
  stats: () => ({calls: requests.length, aborted: requests.filter(request => request.signal.aborted).length}),
  accept: (index, name) => requests[index].accept({src: location.origin+'/image.svg?'+name}),
  reject: index => requests[index].reject(new Error('Unavailable')),
  dispose,
};`;
const canvasFixture = `import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { MarkdownMedia } from '/packages/core/src/components/chat/blocks/MarkdownMedia';
import '/packages/core/src/styles/globals.css';
const [html,setHTML]=createSignal('<main>Partial source</main>');
const [state,setState]=createSignal('generating');
render(()=><main style="max-width:680px;margin:auto"><MarkdownMedia labels={${JSON.stringify(labels)}} source={{kind:'html',html:html(),title:'Canvas'}} htmlState={state()}/></main>,document.getElementById('root'));
window.canvasTest={generate:()=>setState('generating'),append:()=>setHTML('<main>Partial source grows</main>'),interrupt:()=>setState('incomplete'),finish:()=>{setHTML('<button>Try interaction</button>');setState(undefined)}};`;
let forbiddenRequests = 0;
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, resolve: { alias: [{ find: /^solid-js$/, replacement: requireCore.resolve('solid-js/dist/solid.js') }, { find: 'solid-js/web', replacement: requireCore.resolve('solid-js/web/dist/web.js') }, { find: 'solid-js/html', replacement: requireCore.resolve('solid-js/html/dist/html.js') }, { find: 'solid-js/h', replacement: requireCore.resolve('solid-js/h/dist/h.js') }, { find: 'solid-js/store', replacement: requireCore.resolve('solid-js/store/dist/store.js') }] }, plugins: [solid({ hot: false }), tailwind(), { name: 'chat-media-fixture', resolveId(id) { if (id === '/fixture.tsx' || id === '/lifecycle.tsx' || id === '/canvas.tsx') return id; }, load(id) { if (id === '/fixture.tsx') return fixture; if (id === '/lifecycle.tsx') return lifecycleFixture; if (id === '/canvas.tsx') return canvasFixture; }, configureServer(instance) {
  instance.middlewares.use((req, res, next) => {
    if (req.url === '/') { res.setHeader('Content-Type','text/html'); res.end('<html><head><style>:root{--background:#fff;--card:#fff;--foreground:#262626;--muted:#f5f5f5;--muted-foreground:#666;--border:#ddd;--ring:#555}body{font-family:system-ui}</style></head><body><div id="root"></div><script type="module" src="/fixture.tsx"></script></body></html>'); }
    else if (req.url === '/canvas') { res.setHeader('Content-Type','text/html'); res.end('<html><body><div id="root"></div><script type="module" src="/canvas.tsx"></script></body></html>'); }
    else if (req.url === '/lifecycle') { res.setHeader('Content-Type','text/html'); res.end('<html><body><div id="root"></div><script type="module" src="/lifecycle.tsx"></script></body></html>'); }
    else if (req.url === '/media.mp4') { const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? ''); const start = range ? Number(range[1]) : 0; const end = range?.[2] ? Math.min(Number(range[2]),video.length-1) : video.length-1; res.writeHead(range ? 206 : 200, {'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':end-start+1,...(range ? {'Content-Range':`bytes ${start}-${end}/${video.length}`} : {})}); res.end(video.subarray(start,end+1)); }
    else if (req.url.split('?')[0] === '/image.svg') { const portrait = req.url.includes('portrait'); res.setHeader('Content-Type','image/svg+xml'); res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="${portrait ? 280 : 640}" height="${portrait ? 640 : 280}"><rect width="100%" height="100%" fill="#dde5d7"/><circle cx="50%" cy="50%" r="80" fill="#597b58"/></svg>`); }
    else if (req.url === '/should-not-fetch') { forbiddenRequests++; res.end('blocked'); }
    else next();
  });
} }], server: {host:'127.0.0.1',port:0,hmr:false} });
let browser;
let page;
try {
  await server.listen();
  browser = await chromium.launch({headless:true,channel:'chromium'});
  page = await browser.newPage({viewport:{width:1000,height:1100}});
  await page.goto(server.resolvedUrls.local[0]);
  const iframe = page.frameLocator('iframe');
  await iframe.locator('html[data-ready=true]').waitFor();
  await iframe.getByRole('button', {name:'Try interaction'}).evaluate(button => button.click());
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
  await page.locator('.chat-media-image-button').first().click();
  await page.locator('.chat-media-preview-window').waitFor({timeout:3000});
  assert.equal(await page.locator('[aria-modal=true]').count(), 0);
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({state:'detached'});
  await page.locator('.chat-media-full-image').waitFor({state:'detached'});
  assert.equal(await page.locator('.chat-media-image-button').first().evaluate(node => node === document.activeElement), true);
  const hosted = page.locator('#host-image');
  await hosted.locator('.chat-media-image-button').click();
  assert.equal(await page.evaluate(() => window.previewCount), 1);
  assert.equal(await page.locator('.chat-media-preview-window').count(), 0);
  assert.equal(await hosted.locator('a').count(), 0);
  await hosted.getByRole('button', {name:'Open containing folder',exact:true}).click();
  assert.equal(await page.evaluate(() => window.revealCount), 1);
  assert.equal(await page.evaluate(() => window.previewCount), 1);
  await hosted.getByRole('button', {name:'Preview image',exact:true}).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.previewCount), 2);
  await iframe.getByRole('button', {name:'Clicked'}).waitFor();
  await page.locator('[data-media-kind=html]').getByRole('button', {name:'Collapse preview'}).click();
  await page.mouse.click(2, 2);
  assert.equal(await hosted.locator('.chat-media-actions').evaluate(node => getComputedStyle(node).opacity), '1', 'Image actions remain discoverable without hover');
  assert.equal(await page.locator('[data-media-kind=image]').first().evaluate(node => getComputedStyle(node).borderWidth), '0px');
  assert.equal(await page.locator('[data-media-kind=video]').evaluate(node => getComputedStyle(node).borderWidth), '0px');
  await page.locator('iframe').scrollIntoViewIfNeeded();
  await iframe.getByRole('button', {name:'Clicked'}).waitFor({state:'visible'});
  await page.screenshot({path:'/tmp/floe-chat-media-desktop.png',fullPage:true});
  await page.setViewportSize({width:360,height:900});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({path:'/tmp/floe-chat-media-mobile.png',fullPage:true});
  for (const width of [1000, 390, 320]) {
    await page.setViewportSize({width, height:900});
    await hosted.scrollIntoViewIfNeeded();
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
      const geometry = await hosted.evaluate(node => {
        const viewport = node.querySelector('.chat-media-viewport');
        const image = node.querySelector('.chat-media-image');
        const actions = node.querySelector('.chat-media-actions');
        const buttons = Array.from(actions.querySelectorAll('button'));
        const rect = element => { const {x, y, width, height} = element.getBoundingClientRect(); return {x, y, width, height}; };
        return { canvas: rect(viewport), image: rect(image), actions: rect(actions),
          dots: getComputedStyle(viewport, '::before').backgroundImage,
          actionBackground: getComputedStyle(actions).backgroundColor,
          actionBorder: getComputedStyle(actions).borderWidth,
          buttons: buttons.map(button => ({...rect(button), radius: getComputedStyle(button).borderRadius})),
          fit: getComputedStyle(image).objectFit,
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.match(geometry.dots, /radial-gradient/, 'Images use the same dotted canvas as HTML');
      assert.equal(geometry.fit, 'contain');
      assert.equal(geometry.actionBackground, 'rgba(0, 0, 0, 0)', 'Actions have no enclosing toolbar surface');
      assert.equal(geometry.actionBorder, '0px');
      assert.equal(geometry.overflow, false);
      assert.ok(geometry.image.x > geometry.canvas.x && geometry.image.y > geometry.canvas.y, 'Canvas padding remains visible around the image');
      assert.ok(geometry.actions.y + geometry.actions.height <= geometry.image.y, 'Actions never cover the image');
      assert.ok(geometry.actions.x + geometry.actions.width <= geometry.canvas.x + geometry.canvas.width);
      for (const button of geometry.buttons) {
        assert.equal(button.width, button.height);
        assert.equal(button.radius, '50%');
      }
      await hosted.screenshot({path:`/tmp/floe-chat-image-canvas-${theme}-${width}.png`});
      const bounds = await hosted.boundingBox();
      await hosted.locator('img').evaluate(image => { image.src = location.origin + '/image.svg?portrait'; });
      await page.waitForFunction(() => document.querySelector('#host-image img').naturalHeight === 640);
      assert.deepEqual(await hosted.boundingBox(), bounds, 'Portrait images keep the canvas and caption stable');
      await hosted.screenshot({path:`/tmp/floe-chat-image-portrait-${theme}-${width}.png`});
      await hosted.locator('img').evaluate(image => { image.src = location.origin + '/image.svg'; });
      await page.waitForFunction(() => document.querySelector('#host-image img').naturalWidth === 640);
    }
  }
  await page.emulateMedia({reducedMotion:'reduce', forcedColors:'active'});
  assert.equal(await hosted.locator('.chat-media-action').first().evaluate(node => getComputedStyle(node).transitionDuration), '0s');
  assert.equal(await hosted.locator('.chat-media-action').first().evaluate(node => getComputedStyle(node).borderWidth), '1px');
  await page.emulateMedia({reducedMotion:'no-preference', forcedColors:'none'});
  const touch = await browser.newPage({viewport:{width:390, height:844}, hasTouch:true, isMobile:true});
  await touch.goto(server.resolvedUrls.local[0]);
  const touchImage = touch.locator('#host-image');
  await touchImage.scrollIntoViewIfNeeded();
  await touchImage.locator('.chat-media-image').waitFor();
  const touchButton = await touchImage.getByRole('button', {name:'Preview image', exact:true}).boundingBox();
  const touchContent = await touchImage.locator('.chat-media-image').boundingBox();
  assert.ok(touchButton.width >= 42 && touchButton.height >= 42, 'Touch actions retain a usable target');
  assert.ok(touchButton.y + touchButton.height <= touchContent.y, 'Touch actions remain above the image');
  await touchImage.getByRole('button', {name:'Open containing folder', exact:true}).tap();
  assert.equal(await touch.evaluate(() => window.revealCount), 1);
  await touchImage.screenshot({path:'/tmp/floe-chat-image-canvas-touch.png'});
  await touch.close();
  await page.goto(new URL('/canvas', server.resolvedUrls.local[0]).href);
  const canvas = page.locator('.chat-html-canvas');
  await canvas.locator('[data-chat-media-action=source]').waitFor();
  assert.equal(await canvas.getAttribute('data-state'), 'generating');
  assert.equal(await canvas.locator('iframe').count(), 0);
  const generating = await canvas.boundingBox();
  assert.equal(await canvas.locator('[data-chat-media-action=preview]').isDisabled(), true);
  const status = canvas.locator('.chat-html-loading');
  const shimmer = status.locator('[data-floe-progress-shimmer=text]');
  assert.equal(await canvas.locator('.chat-html-skeleton').count(), 0, 'Generation must not display a decorative skeleton frame');
  assert.equal(await canvas.locator('.chat-html-sheet').isVisible(), false);
  for (const width of [680, 375, 320]) {
    await page.setViewportSize({width, height:800});
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.classList.toggle('dark',theme === 'dark'),theme);
      const surface = await canvas.boundingBox();
      const text = await shimmer.boundingBox();
      assert.ok(Math.abs(text.x + text.width / 2 - surface.x - surface.width / 2) < 1, 'Busy text must be horizontally centered');
      assert.ok(Math.abs(text.y + text.height / 2 - surface.y - surface.height / 2) < 1, 'Busy text must be vertically centered');
      assert.equal(await shimmer.evaluate(node => getComputedStyle(node).animationName), 'floe-progress-shimmer');
      assert.equal(await canvas.locator('.chat-html-sheen').evaluate(node => getComputedStyle(node).animationName), 'chat-html-sweep');
      assert.equal(await status.evaluate(node => getComputedStyle(node).borderWidth), '0px');
      await page.screenshot({path:'/tmp/floe-html-generating-'+theme+'-'+width+'.png'});
    }
  }
  for (const media of [{reducedMotion:'reduce'}, {forcedColors:'active'}]) {
    await page.emulateMedia(media);
    assert.equal(await shimmer.evaluate(node => getComputedStyle(node).animationName), 'none');
    assert.notEqual(await shimmer.evaluate(node => getComputedStyle(node).webkitTextFillColor), 'rgba(0, 0, 0, 0)');
    await page.emulateMedia({reducedMotion:'no-preference', forcedColors:'none'});
  }
  await page.setViewportSize({width:360,height:900});
  await page.screenshot({path:'/tmp/floe-html-canvas-generating.png'});
  await canvas.locator('[data-chat-media-action=source]').click();
  await page.evaluate(() => window.canvasTest.append());
  assert.equal(await canvas.locator('pre').textContent(), '<main>Partial source grows</main>');
  await page.evaluate(() => window.canvasTest.interrupt());
  assert.equal(await canvas.getAttribute('data-state'), 'incomplete');
  assert.equal(await canvas.locator('[data-chat-media-action=preview]').isDisabled(), true);
  assert.equal(await canvas.locator('iframe').count(), 0);
  await canvas.locator('[data-chat-media-action=source]').click();
  assert.equal(await status.locator('[data-floe-progress-shimmer]').count(), 0, 'Interrupted generation must settle its text animation');
  assert.equal(await canvas.locator('.chat-html-sheen').evaluate(node => getComputedStyle(node).animationName), 'none');
  await canvas.locator('[data-chat-media-action=source]').click();
  await page.evaluate(() => window.canvasTest.finish());
  await canvas.locator('iframe').waitFor({state:'attached'});
  assert.equal(await canvas.getAttribute('data-view'), 'source');
  const completed = await canvas.boundingBox();
  assert.equal(generating.height, completed.height, 'Completion must not shift neighboring content');
  await canvas.locator('[data-chat-media-action=source]').click();
  const completedFrame = await canvas.locator('iframe').elementHandle();
  await canvas.locator('[data-chat-media-action=source]').click();
  await canvas.locator('[data-chat-media-action=source]').click();
  assert.equal(await completedFrame.evaluate(node => node === document.querySelector('iframe')), true);
  for (const width of [680,375,320]) {
    await page.setViewportSize({width,height:800});
    for (const theme of ['light','dark']) {
      await page.evaluate(theme => document.documentElement.classList.toggle('dark',theme === 'dark'),theme);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
      const stableGeometry = await canvasGeometry(canvas);
      for (const state of ['generate', 'interrupt', 'finish']) {
        await page.evaluate(state => window.canvasTest[state](), state);
        assert.deepEqual(await canvasGeometry(canvas), stableGeometry, 'Generation and completion preserve canvas and controls');
      }
      await checkHTMLGeometry(canvas);
      await canvas.locator('.chat-html-sheet').evaluate(node => Promise.all(node.getAnimations().map(animation => animation.finished)));
      await page.screenshot({path:'/tmp/floe-html-canvas-'+theme+'-'+width+'.png'});
    }
  }
  await page.mouse.move(700, 700);
  const beforeFeedback = await canvasGeometry(canvas);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async () => { throw new Error('Clipboard denied'); } },
  }));
  await canvas.getByRole('button', {name:'More actions'}).click();
  await page.getByRole('menuitem', {name:'Copy HTML'}).click();
  await canvas.getByRole('status').filter({hasText:'Select and copy the source.'}).waitFor();
  assert.equal(await canvas.getAttribute('data-view'), 'source');
  assert.deepEqual(await canvasGeometry(canvas), beforeFeedback, 'Copy feedback does not move the controls');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const touchHTML = await browser.newPage({viewport:{width:320, height:740}, hasTouch:true, isMobile:true});
  await touchHTML.goto(new URL('/canvas', server.resolvedUrls.local[0]).href);
  await touchHTML.waitForFunction(() => window.canvasTest);
  await touchHTML.evaluate(() => window.canvasTest.finish());
  const touchCanvas = touchHTML.locator('.chat-html-canvas');
  await touchCanvas.locator('iframe').waitFor();
  await checkHTMLGeometry(touchCanvas);
  const touchPreview = touchCanvas.locator('[data-chat-media-action=preview]');
  const touchPreviewBounds = await touchPreview.boundingBox();
  assert.ok(touchPreviewBounds.width >= 42 && touchPreviewBounds.height >= 42);
  await touchPreview.tap();
  await touchHTML.locator('.chat-media-preview-window iframe').waitFor();
  await touchHTML.screenshot({path:'/tmp/floe-html-direct-preview-touch.png'});
  await touchHTML.close();
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await canvas.locator('.chat-html-sheen').evaluate(node => getComputedStyle(node).animationName),'none');
  await page.setViewportSize({width:1000,height:900});
  await page.goto(new URL('/lifecycle', server.resolvedUrls.local[0]).href);
  await page.waitForFunction(() => window.mediaTest?.stats().calls === 1);
  const loadingCanvas = await page.locator('.chat-media-viewport').boundingBox();
  for (let index = 0; index < 3; index++) await page.evaluate(() => window.mediaTest.bump());
  assert.deepEqual(await page.evaluate(() => window.mediaTest.stats()), {calls:1,aborted:0}, 'Host reads must not become media reload dependencies');
  await page.evaluate(() => window.mediaTest.accept(0, 'first'));
  await page.locator('img.chat-media-image').waitFor();
  assert.deepEqual(await page.locator('.chat-media-viewport').boundingBox(), loadingCanvas, 'Resolution keeps canvas geometry stable');
  const image = await page.locator('img.chat-media-image').elementHandle();
  await page.evaluate(() => window.mediaTest.bump());
  assert.equal(await image.evaluate(node => node === document.querySelector('img.chat-media-image')), true);
  assert.deepEqual(await page.evaluate(() => window.mediaTest.stats()), {calls:1,aborted:0});
  await page.locator('.chat-media-image-button').click();
  await page.locator('.chat-media-preview-window').waitFor();
  const preview = await page.locator('.chat-media-preview-window').elementHandle();
  await page.evaluate(async () => {
    for (let index = 0; index < 300; index++) {
      await new Promise(requestAnimationFrame);
      window.mediaTest.bump();
      window.mediaTest.equalSource();
    }
  });
  assert.deepEqual(await page.evaluate(() => window.mediaTest.stats()), {calls:1,aborted:0});
  assert.equal(await image.evaluate(node => node === document.querySelector('img.chat-media-image')), true);
  assert.equal(await preview.evaluate(node => node === document.querySelector('.chat-media-preview-window')), true);
  await page.keyboard.press('Escape');
  await page.locator('.chat-media-preview-window').waitFor({state:'hidden'});
  assert.equal(await page.locator('.chat-media-image-button').evaluate(node => node === document.activeElement), true);
  await page.locator('.chat-media-image-button').click();
  await page.locator('.chat-media-preview-window').waitFor();
  await page.evaluate(() => { const input = document.createElement('input'); input.id = 'navigation'; input.style.position = 'fixed'; document.body.append(input); input.focus({preventScroll:true}); });
  await page.evaluate(() => window.mediaTest.source('/second.png'));
  await page.locator('.chat-media-preview-window').waitFor({state:'hidden'});
  assert.equal(await page.locator('#navigation').evaluate(node => node === document.activeElement), true);
  await page.waitForFunction(() => window.mediaTest.stats().calls === 2);
  await page.evaluate(() => window.mediaTest.resolver());
  await page.waitForFunction(() => window.mediaTest.stats().calls === 3);
  await page.evaluate(() => { window.mediaTest.accept(2, 'current'); window.mediaTest.accept(1, 'stale'); });
  await page.waitForFunction(() => document.querySelector('img.chat-media-image')?.getAttribute('src')?.endsWith('?current'));
  assert.deepEqual(await page.evaluate(() => window.mediaTest.stats()), {calls:3,aborted:2});
  await page.evaluate(() => window.mediaTest.source('/retry.png'));
  await page.waitForFunction(() => window.mediaTest.stats().calls === 4);
  await page.evaluate(() => window.mediaTest.reject(3));
  await page.getByRole('button', {name:'Retry',exact:true}).waitFor();
  assert.deepEqual(await page.locator('.chat-media-viewport').boundingBox(), loadingCanvas, 'Failure keeps canvas geometry stable');
  await page.getByRole('button', {name:'Retry',exact:true}).click();
  await page.waitForFunction(() => window.mediaTest.stats().calls === 5);
  assert.deepEqual(await page.locator('.chat-media-viewport').boundingBox(), loadingCanvas, 'Retry keeps canvas geometry stable');
  await page.evaluate(() => window.mediaTest.dispose());
  assert.deepEqual(await page.evaluate(() => window.mediaTest.stats()), {calls:5,aborted:5});
  await page.evaluate(() => window.mediaTest.accept(4, 'disposed'));
  assert.equal(await page.locator('img.chat-media-image').count(), 0);
  console.log('PASS: stable host snapshots, explicit source/resolver invalidation, stale response rejection, retry, disposal');
  console.log('PASS: interactive sandbox, network isolation, stable expansion, video playback/seek, image window, host preview/reveal actions, keyboard, narrow layout');
} catch (error) {
  await page?.screenshot({path:'/tmp/floe-chat-media-failure.png',fullPage:true});
  throw error;
} finally { await browser?.close(); await server.close(); }

async function checkHTMLGeometry(canvas) {
  const surface = await canvas.boundingBox();
  const sheet = await canvas.locator('.chat-html-sheet').boundingBox();
  const controls = await canvas.locator('.chat-html-toolbar').boundingBox();
  const preview = canvas.locator('[data-chat-media-action=preview]');
  const previewBounds = await preview.boundingBox();
  assert.equal(await preview.isDisabled(), false);
  assert.ok(controls.y + controls.height < sheet.y, 'Actions stay above the HTML');
  assert.ok(previewBounds.x > surface.x + surface.width / 2, 'Preview is directly available at the top right');
  assert.equal(previewBounds.width, previewBounds.height);
  assert.equal(await preview.evaluate(node => getComputedStyle(node).borderRadius), '50%');
  assert.ok(sheet.width / surface.width > .92, 'HTML uses at least 92% of the canvas width');
  assert.ok(sheet.height / surface.height > .82, 'HTML uses at least 82% of the canvas height');
  for (const button of await canvas.locator('.chat-html-toolbar .chat-html-orb').all()) {
    const bounds = await button.boundingBox();
    assert.ok(bounds.x >= surface.x && bounds.x + bounds.width <= surface.x + surface.width);
    assert.ok(bounds.y + bounds.height < sheet.y, 'Every control stays outside the content');
  }
}

async function canvasGeometry(canvas) {
  return canvas.evaluate(async node => {
    const buttons = [...node.querySelectorAll('.chat-html-toolbar .chat-html-orb')];
    await Promise.all(buttons.flatMap(button => button.getAnimations().map(animation => animation.finished)));
    const bounds = element => {
      const {x, y, width, height} = element.getBoundingClientRect();
      return {x, y, width, height};
    };
    return [node, ...buttons].map(bounds);
  });
}
