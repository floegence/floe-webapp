/* global document, window, PointerEvent, Event */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import solid from 'vite-plugin-solid';
import { chromium, webkit } from 'playwright';
const root = resolve(import.meta.dirname, '..');
const require = createRequire(resolve(root, 'packages/core/package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const fixture = await mkdtemp(resolve(root, 'packages/core/.panel-lifecycle-'));
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
import { FloeConfigProvider, LayoutProvider } from '../dist/index.js';
import { SurfaceFloatingPanel, FloatingWindow } from '../dist/ui.js';
import '../dist/styles.css';
function App() {
  const scale = Number(new URLSearchParams(location.search).get('scale')) || 1;
  const [boundary, setBoundary] = createSignal();
  const [height, setHeight] = createSignal(540);
  const [width, setWidth] = createSignal(700.5);
  const [open, setOpen] = createSignal(false);
  window.fixture = { setOpen, setHeight, setWidth };
  return <FloeConfigProvider><LayoutProvider>
    <div data-floe-dialog-surface-host="true" style={{position:'relative', width:width()+'px', height:height()+'px', transform:'scale('+scale+')', 'transform-origin':'top left'}}>
      <div ref={setBoundary} data-testid="boundary" style={{width:'100%',height:'100%'}} />
      <SurfaceFloatingPanel boundary={boundary()} snapToEdge snapPreview snapMotion="gentle" snapInset={12} data-testid="panel" style={{width:'40px',height:'40px'}}>
        {handle => <button {...handle} data-testid="orb" style={{...handle.style,width:'40px',height:'40px',background:'#ddd', 'border-radius':'50%'}} onClick={() => setOpen(true)}>Open</button>}
      </SurfaceFloatingPanel>
      <FloatingWindow open={open()} onOpenChange={setOpen} boundary={boundary()} compactBelow={400} viewportInsets={{top:12,right:12,bottom:12,left:12}} defaultSize={{width:520,height:350}} title="Preview"><input value="Retained" /></FloatingWindow>
    </div>
  </LayoutProvider></FloeConfigProvider>;
}
render(() => <App/>, document.getElementById('root'));
`
  );
  server = await createServer({
    configFile: false,
    root: resolve(root, 'packages/core'),
    plugins: [solid()],
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
    optimizeDeps: { entries: [resolve(fixture, 'index.html')] },
  });
  await server.listen();
  for (const engine of [chromium, webkit].filter(
    (engine) => !process.env.FLOE_TEST_ENGINE || engine.name() === process.env.FLOE_TEST_ENGINE
  )) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const scale of process.env.FLOE_TEST_SCALE
        ? [Number(process.env.FLOE_TEST_SCALE)]
        : [1, 0.653, 1.27]) {
        const page = await browser.newPage({ viewport: { width: 1200, height: 950 } });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(
          `${server.resolvedUrls.local[0]}${fixture.split('/').at(-1)}/?scale=${scale}`
        );
        const orb = page.getByTestId('orb');
        const panel = page.getByTestId('panel');
        const mark = page.locator('[data-floe-panel-snap-preview]');
        await orb.waitFor();
        await page.waitForTimeout(100);
        const boundary = await page.getByTestId('boundary').boundingBox();
        const bounds = {
          left: boundary.x + 12,
          top: boundary.y + 12,
          right: boundary.x + boundary.width - 12 - 40 * scale,
          bottom: boundary.y + boundary.height - 12 - 40 * scale,
        };
        const near = (a, b) => assert(Math.abs(a - b) < 1.5, `${a} != ${b}`);
        const settle = async () => {
          await page.waitForFunction(() => !document.querySelector('[data-floe-panel-settling]'));
          await page.waitForTimeout(32);
          assert.equal(await page.locator('[role=dialog]').count(), 0);
          return panel.boundingBox();
        };
        const start = async () => {
          const b = await panel.boundingBox();
          await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
          await page.mouse.down();
          return b;
        };
        for (const edge of ['left', 'right', 'top', 'bottom']) {
          const x =
            edge === 'left'
              ? bounds.left + 18
              : edge === 'right'
                ? bounds.right - 18
                : (bounds.left + bounds.right) / 2;
          const y =
            edge === 'top'
              ? bounds.top + 18
              : edge === 'bottom'
                ? bounds.bottom - 18
                : (bounds.top + bounds.bottom) / 2;
          const b = await start();
          await page.mouse.move(x + b.width / 2, y + b.height / 2);
          assert.equal(await mark.getAttribute('data-floe-panel-snap-preview'), edge);
          await page.mouse.up();
          const actual = await settle();
          near(edge === 'left' || edge === 'right' ? actual.x : actual.y, bounds[edge]);
        }
        // Release carries newer coordinates than the last move, after capture loss.
        const b = await start();
        await orb.evaluate((el) => {
          if (el.hasPointerCapture(1)) el.releasePointerCapture(1);
        });
        await page.evaluate(
          ({ x, y }) =>
            document.dispatchEvent(
              new PointerEvent('pointerup', {
                pointerId: 1,
                clientX: x,
                clientY: y,
                buttons: 0,
                bubbles: true,
              })
            ),
          { x: bounds.left + b.width / 2 + 5, y: (bounds.top + bounds.bottom) / 2 + b.height / 2 }
        );
        await page.mouse.up();
        near((await settle()).x, bounds.left);
        // Cancel and blur settle at the held location; re-entry must not teleport.
        for (const interruption of ['pointercancel', 'blur', 'released']) {
          const b = await start();
          await page.mouse.move(
            bounds.right + b.width / 2 - 9,
            (bounds.top + bounds.bottom) / 2 + b.height / 2
          );
          await page.evaluate((kind) => {
            if (kind === 'blur') window.dispatchEvent(new Event('blur'));
            else
              document.dispatchEvent(
                new PointerEvent(kind === 'released' ? 'pointermove' : 'pointercancel', {
                  pointerId: 1,
                  clientX: 0,
                  clientY: 0,
                  buttons: 0,
                  bubbles: true,
                })
              );
          }, interruption);
          await page.mouse.up();
          near((await settle()).x, bounds.right);
        }
        const before = await start();
        await page.mouse.move(bounds.left + 20, bounds.top + 20);
        await page.keyboard.press('Escape');
        await page.mouse.up();
        const canceled = await settle();
        near(canceled.x, before.x);
        near(canceled.y, before.y);
        // A focus change inside the page does not end a gesture.
        await start();
        await orb.evaluate((el) => el.dispatchEvent(new Event('blur', { bubbles: false })));
        await page.mouse.move(bounds.left + 20, (bounds.top + bounds.bottom) / 2);
        await page.mouse.up();
        const afterFocus = await settle();
        near(afterFocus.x, bounds.left);
        // The next drag interrupts an in-flight snap at the painted location.
        await start();
        await page.mouse.move((bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2);
        await page.mouse.up();
        await page.waitForTimeout(40);
        const moving = await panel.boundingBox();
        await page.mouse.move(moving.x + moving.width / 2, moving.y + moving.height / 2);
        await page.mouse.down();
        await orb.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          el.dispatchEvent(
            new PointerEvent('pointerdown', {
              pointerId: 1,
              clientX: rect.x + rect.width / 2,
              clientY: rect.y + rect.height / 2,
              button: 0,
              buttons: 1,
              bubbles: true,
            })
          );
        });
        const frozen = await panel.boundingBox();
        assert(Math.abs(frozen.x - moving.x) < 30);
        await page.mouse.move(bounds.right + moving.width / 2, (bounds.top + bounds.bottom) / 2);
        await page.mouse.up();
        near((await settle()).x, bounds.right);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await start();
        await page.mouse.move(bounds.left + 20, (bounds.top + bounds.bottom) / 2);
        await page.mouse.up();
        near((await settle()).x, bounds.left);
        await orb.focus();
        await page.keyboard.press('Enter');
        const dialog = page.locator('[data-floe-geometry-surface="floating-window"]');
        await dialog.waitFor();
        await page.waitForTimeout(200);
        const original = await dialog.boundingBox();
        await page.evaluate(() => window.fixture.setHeight(220));
        await page.waitForTimeout(100);
        assert(
          (await dialog.boundingBox()).height < original.height,
          JSON.stringify({
            original,
            constrained: await dialog.boundingBox(),
            boundary: await page.getByTestId('boundary').boundingBox(),
            style: await dialog.getAttribute('style'),
          })
        );
        const title = dialog.locator('[data-floe-floating-window-titlebar]');
        const titleBox = await title.boundingBox();
        await page.mouse.move(titleBox.x + 30, titleBox.y + titleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(titleBox.x + 55, titleBox.y + titleBox.height / 2);
        await page.mouse.up();
        await page.evaluate(() => window.fixture.setHeight(540));
        await page.waitForTimeout(100);
        near((await dialog.boundingBox()).height, original.height);
        await page.evaluate(() => window.fixture.setWidth(300));
        await page.waitForTimeout(100);
        assert.equal(await dialog.getAttribute('data-floe-floating-window-compact'), 'true');
        assert.equal(await dialog.locator('[data-floe-floating-window-resize-handle]').count(), 0);
        await page.evaluate(() => window.fixture.setWidth(700.5));
        await page.waitForTimeout(100);
        near((await dialog.boundingBox()).width, original.width);
        await dialog.locator('[data-floe-floating-window-control=maximize]').click();
        const maximized = await dialog.boundingBox();
        await dialog.locator('[data-floe-floating-window-control=close]').click();
        await dialog.waitFor({ state: 'detached' });
        await orb.focus();
        await page.keyboard.press('Space');
        await dialog.waitFor();
        await page.waitForTimeout(150);
        near((await dialog.boundingBox()).width, maximized.width);
        await dialog.locator('[data-floe-floating-window-control=maximize]').click();
        near((await dialog.boundingBox()).width, original.width);
        assert.deepEqual(errors, []);
        await page.close();
        console.log(
          `${engine.name()} scale=${scale}: drag lifecycle, preview and window preference passed`
        );
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
