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
let server;
let browser;
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
import { SurfaceFloatingPanel } from '../dist/ui.js';
const scale = Number(new URLSearchParams(location.search).get('scale'));
function App() {
  const [small, setSmall] = createSignal(false);
  const launcherInsets = { top: 48, right: 16, bottom: 72, left: 16 };
  return <div data-floe-dialog-surface-host={scale ? 'true' : undefined}
    style={{position:'relative',width:'700px',height:'500px',transform:scale ? 'scale('+scale+')' : undefined,'transform-origin':'top left'}}>
    <SurfaceFloatingPanel boundaryInsets={small() ? launcherInsets : undefined} snapInset={12} snapToEdge={small()} data-testid="panel"
      style={{width:small()?'56px':'300px',height:small()?'56px':'200px',background:'#ddd',position:scale?'absolute':'fixed'}}>
      {handle => small()
        ? <button {...handle} style={{...handle.style,width:'100%',height:'100%'}} data-testid="ball" onClick={() => setSmall(false)}>
            <span data-testid="ball-icon">Preview</span>
          </button>
        : <>
            <button {...handle} data-testid="grip">Move</button><button data-testid="minimize" onClick={() => setSmall(true)}>Minimize</button><input data-testid="input" />
          </>}
    </SurfaceFloatingPanel>
  </div>;
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
  browser = process.env.FLOE_TEST_BROWSER_WS
    ? await chromium.connect(process.env.FLOE_TEST_BROWSER_WS, { exposeNetwork: '<loopback>' })
    : await chromium.launch({
        headless: true,
        ...(process.env.FLOE_TEST_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.FLOE_TEST_CHROMIUM_EXECUTABLE }
          : {}),
      });
  for (const scale of [0, 0.65, 1.4]) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
    try {
      await page.goto(
        `${server.resolvedUrls.local[0]}${fixture.split('/').at(-1)}/?scale=${scale}`
      );
      const panel = page.getByTestId('panel');
      await panel.waitFor();
      await page.waitForTimeout(100);
      if (scale)
        assert(await panel.evaluate((el) => !!el.closest('[data-floe-dialog-surface-host]')));
      const before = await panel.boundingBox();
      assert(before);
      const dragPanelTo = async (control, targetPanelX, targetPanelY) => {
        const panelBox = await panel.boundingBox();
        const controlBox = await control.boundingBox();
        assert(panelBox);
        assert(controlBox);
        const x = controlBox.x + controlBox.width / 2;
        const y = controlBox.y + controlBox.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + targetPanelX - panelBox.x, y + targetPanelY - panelBox.y, {
          steps: 8,
        });
        await page.mouse.up();
      };
      const waitForPanelBox = async (predicate, message) => {
        let latest = null;
        for (let attempt = 0; attempt < 100; attempt += 1) {
          latest = await panel.boundingBox();
          if (latest && predicate(latest)) return latest;
          await page.waitForTimeout(16);
        }
        assert.fail(`${message}: ${JSON.stringify(latest)}`);
      };
      const readBoundary = async () => {
        const viewport = page.viewportSize();
        assert(viewport);
        if (!scale) return { x: 0, y: 0, width: viewport.width, height: viewport.height };
        const hostBox = await page.locator('[data-floe-dialog-surface-host]').boundingBox();
        assert(hostBox);
        const left = Math.max(0, hostBox.x);
        const top = Math.max(0, hostBox.y);
        const right = Math.max(left, Math.min(viewport.width, hostBox.x + hostBox.width));
        const bottom = Math.max(top, Math.min(viewport.height, hostBox.y + hostBox.height));
        return { x: left, y: top, width: right - left, height: bottom - top };
      };
      const readLauncherBounds = async () => {
        const boundary = await readBoundary();
        return {
          left: boundary.x + 28,
          top: boundary.y + 60,
          right: boundary.x + boundary.width - 28,
          bottom: boundary.y + boundary.height - 84,
        };
      };

      await dragPanelTo(page.getByTestId('grip'), before.x - 60, before.y - 40);
      const moved = await panel.boundingBox();
      assert(moved);
      assert(Math.abs(moved.x - before.x + 60) < 2 && Math.abs(moved.y - before.y + 40) < 2);
      await page.getByTestId('input').fill('native input');
      await page.getByTestId('minimize').click();
      const ball = page.getByTestId('ball');
      const ballIcon = page.getByTestId('ball-icon');
      await ball.waitFor();

      const launcherBounds = await readLauncherBounds();
      const collapsed = await panel.boundingBox();
      assert(collapsed);
      const middleX = (launcherBounds.left + launcherBounds.right - collapsed.width) / 2;
      const middleY = (launcherBounds.top + launcherBounds.bottom - collapsed.height) / 2;

      await dragPanelTo(ballIcon, launcherBounds.left + 8, middleY);
      await waitForPanelBox(
        (box) => Math.abs(box.x - launcherBounds.left) < 2 && Math.abs(box.y - middleY) < 2,
        'launcher must snap to the left safe edge from its nested icon'
      );
      assert.equal(await ball.count(), 1, 'dragging the launcher icon must not restore the panel');

      await dragPanelTo(ball, middleX, launcherBounds.top + 8);
      await waitForPanelBox(
        (box) => Math.abs(box.x - middleX) < 2 && Math.abs(box.y - launcherBounds.top) < 2,
        'launcher must snap to the top safe edge'
      );

      await dragPanelTo(ball, launcherBounds.right - collapsed.width - 8, middleY);
      await waitForPanelBox(
        (box) =>
          Math.abs(box.x + box.width - launcherBounds.right) < 2 && Math.abs(box.y - middleY) < 2,
        'launcher must snap to the right safe edge'
      );

      await dragPanelTo(ball, middleX, launcherBounds.bottom - collapsed.height - 8);
      await waitForPanelBox(
        (box) =>
          Math.abs(box.x - middleX) < 2 && Math.abs(box.y + box.height - launcherBounds.bottom) < 2,
        'launcher must snap to the bottom safe edge'
      );

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await dragPanelTo(ball, launcherBounds.left + 8, middleY);
      const reducedMotionTransition = await panel.evaluate((element) => element.style.transition);
      assert.doesNotMatch(
        reducedMotionTransition,
        /180ms/,
        'reduced motion must disable the snap transition'
      );
      await waitForPanelBox(
        (box) => Math.abs(box.x - launcherBounds.left) < 2 && Math.abs(box.y - middleY) < 2,
        'reduced-motion launcher must still settle on the requested edge'
      );
      await page.emulateMedia({ reducedMotion: 'no-preference' });

      await page.setViewportSize({ width: 390, height: 500 });
      const resizedLauncherBounds = await readLauncherBounds();
      const resizedBall = await waitForPanelBox(
        (box) =>
          box.x >= resizedLauncherBounds.left - 2 &&
          box.y >= resizedLauncherBounds.top - 2 &&
          box.x + box.width <= resizedLauncherBounds.right + 2 &&
          box.y + box.height <= resizedLauncherBounds.bottom + 2,
        'launcher must remain inside app chrome insets after viewport resize'
      );

      const beforeKeyboardX = resizedBall.x;
      await ball.press('ArrowRight');
      await waitForPanelBox(
        (box) => Math.abs(box.x - (beforeKeyboardX + 10)) < 2,
        'keyboard movement must not snap back automatically'
      );
      await ball.press('Enter');
      await page.getByTestId('grip').waitFor();
      await waitForPanelBox(
        (box) =>
          box.x >= 11 && box.y >= 11 && box.x + box.width <= 379 && box.y + box.height <= 489,
        'restored panel must clamp after viewport resize'
      );
    } finally {
      await page.close();
    }
  }
  console.log('Floating panel drag, collapse, keyboard, projection and resize passed in Chromium.');
} finally {
  await browser?.close();
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
