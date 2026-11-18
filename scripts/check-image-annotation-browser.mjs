/* global window, document, getComputedStyle, requestAnimationFrame */
import assert from 'node:assert/strict';
import { URL } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import solid from 'vite-plugin-solid';
const requireCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(requireCore.resolve('vite'));
const fixture = `import {createSignal} from 'solid-js';import {render} from 'solid-js/web';
import {ImageAnnotationSurface,annotateImage} from '/packages/core/src/image-annotation';
const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1000;const ctx=canvas.getContext('2d');ctx.fillStyle='#263449';ctx.fillRect(0,0,1600,1000);ctx.fillStyle='#a3e635';ctx.fillRect(1196,396,8,8);
const blob=await new Promise(r=>canvas.toBlob(r));const [annotation,setAnnotation]=createSignal(),[zoom,setZoom]=createSignal(1),[panning,setPanning]=createSignal(false),[src,setSrc]=createSignal(URL.createObjectURL(blob)),[annotations,setAnnotations]=createSignal([]),[activeIndex,setActiveIndex]=createSignal(),[cursor,setCursor]=createSignal();
render(()=><ImageAnnotationSurface width={1600} height={1000} src={src()} label="Frozen image" annotation={annotation()} annotations={annotations()} activeIndex={activeIndex()} onSelect={index=>{setActiveIndex(index);setAnnotation(annotations()[index]);}} onChange={setAnnotation} zoom={zoom()} panning={panning()} cursor={cursor()}/>,document.getElementById('root'));
window.fixture={setCursor,annotation,setAnnotation,setAnnotations,activeIndex,setZoom,setSrc,setPanning,export:async()=>{const result=await annotateImage(blob,annotations().length ? annotations() : annotation());const bitmap=await createImageBitmap(result);const out=document.createElement('canvas');out.width=bitmap.width;out.height=bitmap.height;const c=out.getContext('2d');c.drawImage(bitmap,0,0);bitmap.close();return {width:out.width,height:out.height,pixel:Array.from(c.getImageData(1200,400,1,1).data)};}};`;
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true },
  resolve: { alias: ['solid-js', 'solid-js/web', 'solid-js/store', 'solid-js/html', 'solid-js/h'].map(name => ({ find: new RegExp('^' + name + '$'), replacement: requireCore.resolve(name === 'solid-js' ? 'solid-js/dist/solid.js' : name + '/dist/' + name.split('/').at(-1) + '.js') })) },
  plugins: [solid({ hot: false }), { name: 'image-annotation-fixture', resolveId: id => id === '/fixture.tsx' ? id : undefined, load: id => id === '/fixture.tsx' ? fixture : undefined,
    configureServer(server) { server.middlewares.use((req,res,next) => { if (req.url !== '/') return next(); res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}::-webkit-scrollbar{width:15px;height:15px}#root{position:absolute;left:20px;top:30px;width:calc(100% - 40px);height:600px}</style><div id="root"></div><script type="module" src="/fixture.tsx"></script>'); }); } }],
  server: { host:'127.0.0.1',port:0,hmr:false } });
let browser;
try {
  await server.listen(); browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
  for(const width of [390,1280]) for(const dpr of [1,1.25,2,3]) {
    const context=await browser.newContext({viewport:{width,height:800},deviceScaleFactor:dpr});const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(server.resolvedUrls.local[0]);await page.waitForFunction(()=>window.fixture);
    const image=page.getByRole('img',{name:'Frozen image'});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const bounds=await image.boundingBox();
    const host=await page.locator('#root').boundingBox();
    assert(Math.abs(bounds.width-Math.min(host.width,host.height*1.6))<1,'Fit view must use the full viewport without a reserved scrollbar shrinking the image');
    await page.mouse.click(bounds.x+bounds.width*.75,bounds.y+bounds.height*.4);
    const selected=await page.evaluate(()=>window.fixture.annotation());assert(Math.abs(selected.x-1200)<1);assert(Math.abs(selected.y-400)<1);
    // Lock the exact subpixel-independent source coordinate for raster verification.
    await page.evaluate(()=>window.fixture.setAnnotation({kind:'point',x:1200,y:400}));
    const exported=await page.evaluate(()=>window.fixture.export());assert.equal(exported.width,1600);assert.equal(exported.height,1000);assert(exported.pixel[0]<100 && exported.pixel[1]>60 && exported.pixel[1]<170 && exported.pixel[2]>200 && exported.pixel[3]===255,'Export must mark the original target pixel');
    await page.evaluate(()=>window.fixture.setZoom(2));
    await page.waitForFunction(()=>document.querySelector('svg').getBoundingClientRect().width>document.querySelector('#root').clientWidth);
    await page.evaluate(()=>{const h=document.querySelector('[data-floe-image-annotation]');h.scrollLeft=100;h.scrollTop=40;});
    assert.deepEqual(await page.evaluate(()=>window.fixture.annotation()),{kind:'point',x:1200,y:400});
    await page.evaluate(()=>window.fixture.setPanning(true));
    const panBefore=await page.locator('[data-floe-image-annotation]').evaluate(e=>e.scrollLeft);
    await page.mouse.move(width/2,300);await page.mouse.down();await page.mouse.move(width/2-50,260,{steps:5});await page.mouse.up();
    assert((await page.locator('[data-floe-image-annotation]').evaluate(e=>e.scrollLeft))>panBefore+40,'Pan mode must drag the viewport');
    assert.deepEqual(await page.evaluate(()=>window.fixture.annotation()),{kind:'point',x:1200,y:400});
    await page.evaluate(()=>window.fixture.setPanning(false));
    await image.focus();await page.keyboard.press('ArrowLeft');assert.equal((await page.evaluate(()=>window.fixture.annotation())).x,1199);
    await page.evaluate(()=>{window.fixture.setZoom(1);window.fixture.setAnnotation(undefined);});
    await page.waitForFunction(()=>document.querySelector('svg').getBoundingClientRect().width<=document.querySelector('#root').clientWidth);
    await page.evaluate(()=>new Promise(r=>window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>window.requestAnimationFrame(r)))));
    const next=await image.boundingBox();await page.mouse.move(next.x+next.width*.1,next.y+next.height*.2);await page.mouse.down();await page.mouse.move(next.x+next.width*.4,next.y+next.height*.6,{steps:5});await page.mouse.up();
    const region=await page.evaluate(()=>window.fixture.annotation());assert.equal(region.kind,'rectangle');assert(Math.abs(region.x-160)<1);assert(Math.abs(region.width-480)<1);assert(Math.abs(region.height-400)<1);
    await page.evaluate(()=>{window.fixture.setAnnotation(undefined);window.fixture.setAnnotations([{kind:'point',x:1200,y:400},{kind:'rectangle',x:100,y:100,width:300,height:200}]);});
    assert.deepEqual(await image.locator('text').allTextContents(),['1','2']);
    const badge = await image.locator('[data-annotation-index="1"] [data-annotation-marker]').first().boundingBox();
    const bx = badge.x + badge.width / 2, by = badge.y + badge.height / 2;
    await page.mouse.move(bx, by); await page.mouse.down(); await page.mouse.move(bx + 20, by + 12);
    await image.evaluate(svg => {
      const capture = [svg, svg.closest('[data-floe-image-annotation]')].find(el => el.hasPointerCapture(1));
      if (!capture) throw new Error('Expected captured mouse gesture');
      capture.releasePointerCapture(1);
    });
    await page.mouse.move(bx + 45, by + 30); await page.mouse.up();
    assert.equal(await page.evaluate(()=>window.fixture.activeIndex()), undefined, 'Dragging from a marker must not activate it');
    const fromMarker = await page.evaluate(()=>window.fixture.annotation());
    assert.equal(fromMarker.kind, 'rectangle'); assert(Math.abs(fromMarker.width - 45 * 1600 / next.width) < 1);
    await page.evaluate(()=>window.fixture.setAnnotation(undefined));
    await image.locator('[data-annotation-index="1"] text').click();
    assert.equal(await page.evaluate(()=>window.fixture.activeIndex()),1);
    assert.equal(await page.evaluate(()=>window.fixture.annotation().kind),'rectangle');
    assert.equal(await image.evaluate(element=>getComputedStyle(element).cursor),'crosshair');
    await page.evaluate(()=>window.fixture.setCursor('default'));
    for (const target of [image, image.locator('[data-annotation-index="0"] text'), image.locator('[data-corner="0"]')]) {
      assert.equal(await target.evaluate(element=>getComputedStyle(element).cursor),'default','Fixed cursor applies to canvas, pins and resize handles');
    }
    await page.evaluate(()=>window.fixture.setPanning(true));
    assert.equal(await image.evaluate(element=>getComputedStyle(element).cursor),'default','Panning retains the configured cursor');
    await page.evaluate(()=>{window.fixture.setCursor(undefined);window.fixture.setPanning(false);});
    assert.equal(await image.evaluate(element=>getComputedStyle(element).cursor),'crosshair');
    const multi=await page.evaluate(()=>window.fixture.export());assert(multi.pixel[2]>200 && multi.pixel[0]<100,'Multi-marker PNG preserves marker 1');
    await page.evaluate(()=>{window.fixture.setAnnotation(undefined);window.fixture.setAnnotations([{kind:'rectangle',x:0,y:0,width:1600,height:1000}]);});
    const overlap=await image.boundingBox();await page.mouse.move(overlap.x+overlap.width*.5,overlap.y+overlap.height*.5);await page.mouse.down();await page.mouse.move(overlap.x+overlap.width*.7,overlap.y+overlap.height*.7,{steps:5});await page.mouse.up();
    assert.equal((await page.evaluate(()=>window.fixture.annotation())).kind,'rectangle','Existing regions must not swallow overlapping new selections');
    assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS image annotation: 8 viewport/DPR combinations, original-pixel point/region, zoom/pan, keyboard and matching exported PNG pixels');
} finally {await browser?.close();await server.close();}
