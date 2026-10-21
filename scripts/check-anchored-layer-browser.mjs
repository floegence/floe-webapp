/* global window, document */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import solid from 'vite-plugin-solid';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const fixture = await mkdtemp(resolve(root, 'packages/core/.anchored-layer-test-'));
let server;
let browser;
try {
  await writeFile(
    resolve(fixture, 'index.html'),
    '<!doctype html><div id="root"></div><script type="module" src="./main.tsx"></script>'
  );
  await writeFile(
    resolve(fixture, 'main.tsx'),
    `
import { createSignal, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { SurfaceAnchoredLayer } from '../dist/ui.js';
import '../dist/styles.css';
function App() {
 const [anchor, setAnchor] = createSignal();
 const [open, setOpen] = createSignal(true);
 const projected = location.search.includes('projected');
 return <div data-floe-surface-portal-layer={projected ? 'true' : undefined}
   style={projected ? {position:'absolute',left:'80px',top:'60px',width:'900px',height:'800px'} : undefined}>
   <div data-floe-dialog-surface-host={projected ? 'true' : undefined}
   style={projected ? {position:'absolute',left:'0px',top:'0px',width:'900px',height:'800px',transform:'scale(.75)','transform-origin':'top left'} : undefined}>
   <button ref={setAnchor} data-anchor style={{position:'absolute',left:'8px',top:'96px',width:'40px',height:'40px'}}>Open</button>
   <Show when={open()}><SurfaceAnchoredLayer anchor={anchor()} placement="right" gap={16}
     onAnchorDisconnect={() => setOpen(false)} data-panel
     style={{width:'424px',height:'427px','box-sizing':'border-box','max-height':'var(--floe-anchored-layer-max-height)'}}>
     <input aria-label="Search" />
   </SurfaceAnchoredLayer></Show>
 </div></div>;
}
render(() => <App/>, document.getElementById('root'));
`
  );
  server = await createServer({
    configFile: false,
    root: resolve(root, 'packages/core'),
    plugins: [solid()],
    optimizeDeps: { entries: [resolve(fixture, 'index.html')] },
    server: { host: '127.0.0.1', port: 0 },
  });
  await server.listen();
  const url = `${server.resolvedUrls.local[0]}${fixture.split('/').pop()}/`;
  browser = await chromium.launch();
  for (const projected of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${url}${projected ? '?projected' : ''}`);
    const panel = page.locator('[data-panel]');
    await panel.waitFor({ state: 'visible' });
    const input = page.getByRole('textbox', { name: 'Search' });
    await input.fill('Retained draft');
    await input.evaluate((el) => {
      window.retainedInput = el;
    });
    const assertGeometry = async (side) => {
      await page
        .waitForFunction(
          (side) => {
            const panel = document.querySelector('[data-panel]');
            const rect = panel.getBoundingClientRect();
            const anchor = document.querySelector('[data-anchor]').getBoundingClientRect();
            const boundary = document
              .querySelector('[data-floe-dialog-surface-host]')
              ?.getBoundingClientRect() ?? {
              left: 0,
              top: 0,
              right: window.innerWidth,
              bottom: window.innerHeight,
            };
            const attached =
              side === 'right'
                ? Math.abs(rect.left - anchor.right - 16) < 1
                : Math.abs(anchor.left - rect.right - 16) < 1;
            return (
              panel.dataset.placement === side &&
              attached &&
              Math.abs(rect.width - 424) < 1 &&
              rect.top >= boundary.top + 11 &&
              rect.bottom <= boundary.bottom - 11
            );
          },
          side,
          { timeout: 3000 }
        )
        .catch(async (error) => {
          console.error(
            { projected, side },
            await page.evaluate(() => ({
              panel: document.querySelector('[data-panel]').getBoundingClientRect().toJSON(),
              anchor: document.querySelector('[data-anchor]').getBoundingClientRect().toJSON(),
              style: document.querySelector('[data-panel]').getAttribute('style'),
              placement: document.querySelector('[data-panel]').getAttribute('data-placement'),
            }))
          );
          throw error;
        });
      assert.equal(await input.inputValue(), 'Retained draft');
      assert(await input.evaluate((el) => el === window.retainedInput));
    };
    await assertGeometry('right');
    await page.locator('[data-anchor]').evaluate((el) => {
      el.style.left = '840px';
      el.style.top = '700px';
    });
    await assertGeometry('left');
    await page.locator('[data-anchor]').evaluate((el) => el.remove());
    await panel.waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    'PASS: anchored side placement, flip, boundary clamp, projected screen size, retained input and disconnect'
  );
} finally {
  await browser?.close();
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
