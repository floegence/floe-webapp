import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, URL } from 'node:url';
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
import solid from 'vite-plugin-solid';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const fixture = await mkdtemp(resolve(root, 'packages/core/.panel-test-'));
let server; let browser;
try {
  await writeFile(resolve(fixture, 'index.html'), '<div id="root"></div><script type="module" src="./main.tsx"></script>');
  await writeFile(resolve(fixture, 'main.tsx'), `
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { SurfaceFloatingPanel } from '../dist/ui.js';
const scale = Number(new URLSearchParams(location.search).get('scale'));
function App() {
  const [small, setSmall] = createSignal(false);
  return <div data-floe-dialog-surface-host={scale ? 'true' : undefined}
    style={{position:'relative',width:'700px',height:'500px',transform:scale ? 'scale('+scale+')' : undefined,'transform-origin':'top left'}}>
    <SurfaceFloatingPanel data-testid="panel" style={{width:small()?'52px':'300px',height:small()?'52px':'200px',background:'#ddd',position:scale?'absolute':'fixed'}}>
      {handle => small() ? <button {...handle} data-testid="ball" onClick={() => setSmall(false)}>Restore</button> : <>
        <button {...handle} data-testid="grip">Move</button><button data-testid="minimize" onClick={() => setSmall(true)}>Minimize</button><input data-testid="input" />
      </>}
    </SurfaceFloatingPanel>
  </div>;
}
render(() => <App/>, document.getElementById('root'));
`);
  server = await createServer({ configFile: false, root: resolve(root, 'packages/core'), plugins: [solid()], optimizeDeps: { entries: [resolve(fixture, 'index.html')] }, server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  browser = process.env.FLOE_TEST_BROWSER_WS
    ? await chromium.connect(process.env.FLOE_TEST_BROWSER_WS, { exposeNetwork: '<loopback>' })
    : await chromium.launch({ headless: true });
  for (const scale of [0, 0.65, 1.4]) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
    try {
      await page.goto(`${server.resolvedUrls.local[0]}${fixture.split('/').at(-1)}/?scale=${scale}`);
      const panel = page.getByTestId('panel'); await panel.waitFor();
      await page.waitForTimeout(100);
      if (scale) assert(await panel.evaluate(el => !!el.closest('[data-floe-dialog-surface-host]')));
      const before = await panel.boundingBox();
      const drag = async (control, dx, dy) => {
        const box = await control.boundingBox(); const x = box.x + box.width / 2; const y = box.y + box.height / 2;
        await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 8 }); await page.mouse.up();
      };
      await drag(page.getByTestId('grip'), -60, -40);
      const moved = await panel.boundingBox();
      assert(Math.abs(moved.x - before.x + 60) < 2 && Math.abs(moved.y - before.y + 40) < 2);
      await page.getByTestId('input').fill('native input');
      await page.getByTestId('minimize').click();
      const ball = page.getByTestId('ball'); await ball.waitFor();
      await drag(ball, -40, -20); assert.equal(await ball.count(), 1, 'drag must not restore');
      await ball.press('ArrowLeft'); await ball.press('Enter');
      await page.getByTestId('grip').waitFor();
      await page.setViewportSize({ width: 390, height: 500 }); await page.waitForTimeout(100);
      const resized = await panel.boundingBox();
      assert(resized.x >= 7 && resized.y >= 7 && resized.x + resized.width <= 383 && resized.y + resized.height <= 493);
    } finally { await page.close(); }
  }
  console.log('Floating panel drag, collapse, keyboard, projection and resize passed in Chromium.');
} finally {
  await browser?.close(); await server?.close(); await rm(fixture, { recursive: true, force: true });
}
