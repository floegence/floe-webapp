/* global document, window */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, URL } from 'node:url';
import solid from 'vite-plugin-solid';
import { chromium, webkit, firefox } from 'playwright';

const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const root = resolve(import.meta.dirname, '..', 'packages/core');
const fixture = await mkdtemp(resolve(root, '.canvas-viewport-test-'));
let server;
try {
  await writeFile(
    resolve(fixture, 'index.html'),
    '<div id="root"></div><script type="module" src="./main.tsx"></script>'
  );
  await writeFile(
    resolve(fixture, 'main.tsx'),
    `
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { InfiniteCanvas } from '../src/components/ui/InfiniteCanvas';
import '../src/components/ui/styles/ui.css';
function App() {
 const [viewport, setViewport] = createSignal({x:0,y:0,scale:1});
 window.moveViewport = setViewport;
 window.readViewport = viewport;
 return <div style="width:700px;height:400px"><InfiniteCanvas viewport={viewport()} onViewportChange={setViewport}>
  <button id="near" data-floe-canvas-interactive="true" style="position:absolute;left:60px;top:70px;width:120px;height:80px">Task</button>
  <button id="far" data-floe-canvas-interactive="true" style="position:absolute;left:1400px;top:700px;width:120px;height:80px">Offscreen task</button>
 </InfiniteCanvas></div>;
}
render(()=><App/>,document.getElementById('root'));
`
  );
  server = await createServer({
    configFile: false,
    root,
    plugins: [solid()],
    resolve: { dedupe: ['solid-js'] },
    server: { host: '127.0.0.1', port: 0 },
  });
  await server.listen();
  for (const [name, engine] of [
    ['chromium', chromium],
    ['webkit', webkit],
    ['firefox', firefox],
  ]) {
    const browser = await engine.launch({
      headless: true,
      ...(name === 'chromium' ? { args: ['--password-store=basic', '--use-mock-keychain'] } : {}),
    });
    try {
      const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
      await page.goto(
        `http://127.0.0.1:${server.httpServer.address().port}/${fixture.split('/').at(-1)}/index.html`
      );
      await page.locator('#near').waitFor();
      await page.evaluate(() => document.querySelector('#far').focus());
      await page.evaluate(() => window.moveViewport({ x: 120, y: 90, scale: 0.8 }));
      const position = await page.evaluate(() => {
        const canvas = document.querySelector('.floe-infinite-canvas');
        const task = document.querySelector('#near').getBoundingClientRect();
        const bounds = canvas.getBoundingClientRect();
        return {
          scrollLeft: canvas.scrollLeft,
          scrollTop: canvas.scrollTop,
          x: task.x - bounds.x,
          y: task.y - bounds.y,
        };
      });
      assert.equal(
        position.scrollLeft,
        0,
        `${name}: native focus must not create a second horizontal viewport`
      );
      assert.equal(
        position.scrollTop,
        0,
        `${name}: native focus must not create a second vertical viewport`
      );
      assert.ok(
        Math.abs(position.x - 168) < 1 && Math.abs(position.y - 146) < 1,
        `${name}: rendered coordinates must match the authoritative viewport`
      );
      await page.locator('.floe-infinite-canvas').evaluate((el) => el.scrollTo(300, 200));
      assert.deepEqual(
        await page.locator('.floe-infinite-canvas').evaluate((el) => [el.scrollLeft, el.scrollTop]),
        [0, 0]
      );
      await page.mouse.move(400, 300);
      await page.mouse.down();
      await page.mouse.move(450, 330, { steps: 5 });
      await page.mouse.up();
      const moved = await page.evaluate(() => window.readViewport());
      assert.ok(moved.x > 120 && moved.y > 90, `${name}: canvas panning remains available`);
      console.log(
        `${name}: focus, native-scroll exclusion, transformed geometry and pointer panning passed`
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
