/* global document, window, requestAnimationFrame */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import solid from 'vite-plugin-solid';
const root = resolve(import.meta.dirname, '..');
const require = createRequire(resolve(root, 'packages/core/package.json'));
const { createServer } = await import(require.resolve('vite'));
const { default: tailwind } = await import(require.resolve('@tailwindcss/vite'));
const fixture = await mkdtemp(resolve(root, 'packages/core/.dropdown-bounds-'));
let server, browser;
try {
  await writeFile(resolve(fixture, 'index.html'), '<div id="root"></div><script type="module" src="./main.tsx"></script>');
  await writeFile(resolve(fixture, 'main.tsx'), `
import { render } from 'solid-js/web';
import { Dropdown } from '../src/components/ui/Dropdown';
import '../src/styles/globals.css';
const scale = Number(new URLSearchParams(location.search).get('scale'));
render(() => <div data-testid="boundary" data-floe-dialog-surface-host={scale ? 'true' : undefined}
  style={{position:'relative',width:scale?'480px':'320px',height:scale?'800px':'568px',transform:scale?'scale('+scale+')':undefined,'transform-origin':'top left'}}>
  <div style={{position:'absolute',left:scale?'200px':'160px',top:scale?'560px':'160px'}}>
    <Dropdown trigger={<span>Filters</span>} triggerAriaLabel="Filters" onSelect={() => {}}
      items={[{id:'category',label:'Category',children:Array.from({length:14},(_,i)=>({id:String(i),label:'Category '+i}))},
        {id:'source',label:'Source'},{id:'state',label:'State'}]} />
  </div>
</div>, document.getElementById('root'));
`);
  server = await createServer({ configFile: false, root: resolve(root, 'packages/core'), plugins: [solid(), tailwind()],
    optimizeDeps: { entries: [resolve(fixture, 'index.html')] }, server: { host: '127.0.0.1', port: 0, watch: null } });
  await server.listen();
  for (const [name, engine] of Object.entries(process.argv.includes('--all') ? { chromium, firefox, webkit } : { chromium })) {
    browser = await engine.launch({ headless: true });
    for (const scale of [0, 0.65, 1.2]) for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width: scale ? 900 : 320, height: scale ? 1050 : 568 }, reducedMotion });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${server.resolvedUrls.local[0]}${fixture.split('/').at(-1)}/?scale=${scale}`);
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
      await page.mouse.move(1, 1);
      const parent = page.getByRole('menu').first();
      await parent.evaluate(async element => {
        await new Promise(resolve => requestAnimationFrame(resolve));
        await Promise.all(element.getAnimations().map(animation => animation.finished));
      });
      await page.evaluate(() => {
        window.menuBoundsFrames = [];
        window.sampleMenuBounds = true;
        const sample = () => {
          for (const menu of document.querySelectorAll('[role=menu]')) {
            const r = menu.getBoundingClientRect();
            if (r.left > -1000) window.menuBoundsFrames.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
          }
          if (window.sampleMenuBounds) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      await page.getByRole('menuitem', { name: 'Category', exact: true }).focus();
      await page.keyboard.press('ArrowRight');
      const child = page.getByRole('menu').nth(1);
      await child.waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('[role=menu]')].every(menu => menu.dataset.floatingPresence === 'open'));
      await child.evaluate(async element => {
        await new Promise(resolve => requestAnimationFrame(resolve));
        await Promise.all(element.getAnimations().map(animation => animation.finished));
      });
      const boundary = await page.getByTestId('boundary').boundingBox();
      const box = await child.boundingBox();
      assert(box.x >= boundary.x && box.y >= boundary.y, `${name}: start edge ${JSON.stringify(box)}`);
      assert(box.x + box.width <= boundary.x + boundary.width - 7, `${name}: right overflow ${JSON.stringify(box)}`);
      assert(box.y + box.height <= boundary.y + boundary.height - 7, `${name}: bottom overflow ${JSON.stringify(box)}`);
      const frames = await page.evaluate(() => { window.sampleMenuBounds = false; return window.menuBoundsFrames; });
      assert(frames.length > 0);
      for (const frame of frames) assert(frame.left >= boundary.x - 1 && frame.right <= boundary.x + boundary.width + 1
        && frame.top >= boundary.y - 1 && frame.bottom <= boundary.y + boundary.height + 1,
      `${name}: motion crossed boundary ${JSON.stringify(frame)}`);
      await page.keyboard.press('ArrowLeft');
      await child.waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Category');
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ browser: name, scale, reducedMotion, frames: frames.length, passed: true }));
      await page.close();
    }
    await browser.close(); browser = undefined;
  }
} finally { await browser?.close(); await server?.close(); await rm(fixture, { recursive: true, force: true }); }
