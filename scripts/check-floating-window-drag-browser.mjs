/* global document, window, requestAnimationFrame, PointerEvent, Event */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, URL } from 'node:url';
import solid from 'vite-plugin-solid';
import { chromium, webkit } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const fixture = await mkdtemp(resolve(root, 'packages/core/.window-drag-test-'));
let server;
try {
  await writeFile(resolve(fixture, 'index.html'), '<!doctype html><div id="root"></div><script type="module" src="./main.tsx"></script>');
  await writeFile(resolve(fixture, 'main.tsx'), [
    "import { render } from 'solid-js/web';",
    "import { FloeProvider } from '../dist/app.js';",
    "import { FloatingWindow } from '../dist/ui.js';",
    "import '../dist/styles.css';",
    "render(() => <FloeProvider><FloatingWindow open title='Drag acceptance' onOpenChange={() => {}} defaultPosition={{x:180,y:140}} defaultSize={{width:420,height:300}} viewportInsets={{top:48,right:20,bottom:24,left:16}}><textarea aria-label='Draft' /></FloatingWindow></FloeProvider>,document.getElementById('root'));",
  ].join(' '));
  server = await createServer({ configFile: false, root: resolve(root, 'packages/core'), plugins: [solid()],
    optimizeDeps: { entries: [resolve(fixture, 'index.html')] }, server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const panel = page.locator('[data-floe-geometry-surface="floating-window"]');
      const titlebar = panel.locator('[data-floe-floating-window-titlebar]');
      const maximize = panel.locator('[data-floe-floating-window-control="maximize"]');
      const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const reset = async () => {
        await page.goto(server.resolvedUrls.local[0] + fixture.split('/').pop() + '/');
        await panel.waitFor();
        await page.waitForTimeout(220);
      };
      const within = async () => {
        await page.waitForFunction(() => {
          const rect = document.querySelector('[data-floe-geometry-surface="floating-window"]').getBoundingClientRect();
          return rect.left >= 15.5 && rect.top >= 47.5 && rect.right <= window.innerWidth - 19.5 && rect.bottom <= window.innerHeight - 23.5;
        });
      };
      for (const target of [{ x: -600, y: -600 }, { x: 1800, y: 1400 }]) {
        await reset();
        await page.mouse.move(260, 156);
        await page.mouse.down();
        await page.mouse.move(target.x, target.y);
        await settle();
        const held = await panel.boundingBox();
        assert(held);
        assert(target.x < 0 ? held.x < 16 : held.x + held.width > 1180, 'drag can cross the horizontal safe edge');
        assert(target.y < 0 ? held.y < 48 : held.y + held.height > 776, 'drag can cross the vertical safe edge');
        assert(Math.min(held.x + held.width, 1180) - Math.max(held.x, 16) >= 160, 'titlebar stays horizontally reachable');
        const header = await titlebar.boundingBox();
        assert(Math.min(header.y + header.height, 776) - Math.max(header.y, 48) >= 23, 'titlebar stays vertically reachable');
        assert(Math.abs(held.x - 180) < Math.abs(target.x - 260), 'overscroll resists pointer movement');
        await page.mouse.up();
        await within();
      }
      await reset();
      const draft = page.getByRole('textbox', { name: 'Draft' });
      await draft.fill('Retained draft');
      await draft.evaluate(el => { window.retainedDraft = el; });
      await maximize.click();
      const maximized = await panel.boundingBox();
      await page.mouse.click(598, 64);
      assert.deepEqual(await panel.boundingBox(), maximized, 'plain titlebar click keeps maximization');
      await page.mouse.move(598, 64);
      await page.mouse.down();
      await page.mouse.move(599, 65);
      await settle();
      assert.deepEqual(await panel.boundingBox(), maximized, 'pointer tremor keeps maximization');
      await page.mouse.move(638, 144);
      await settle();
      const restored = await panel.boundingBox();
      assert.equal(restored.width, 420);
      assert.equal(restored.height, 300);
      assert(Math.abs(restored.x - 428) < 1 && Math.abs(restored.y - 128) < 1, 'restored header follows the original grab point');
      await page.mouse.move(658, 164);
      await settle();
      const moved = await panel.boundingBox();
      assert(Math.abs(moved.x - restored.x - 20) < 1 && Math.abs(moved.y - restored.y - 20) < 1);
      await page.mouse.up();
      await within();
      assert(await draft.evaluate(el => el === window.retainedDraft && el.value === 'Retained draft'));
      await maximize.click();
      await maximize.click();
      assert.deepEqual(await panel.boundingBox(), moved, 'subsequent maximize restores the dragged position');
      await titlebar.dblclick({ position: { x: 80, y: 16 } });
      assert.equal((await panel.boundingBox()).width, 1164, 'double-click still maximizes');
      await titlebar.dblclick({ position: { x: 80, y: 16 } });
      assert.deepEqual(await panel.boundingBox(), moved, 'double-click still restores');
      for (const reason of ['pointercancel', 'lostpointercapture', 'blur']) {
        console.log(engine.name() + ': checking ' + reason);
        await reset();
        await page.mouse.move(260, 156);
        await page.mouse.down();
        await page.mouse.move(-600, -600);
        await settle();
        await titlebar.evaluate((el, reason) => {
          if (reason === 'blur') window.dispatchEvent(new Event('blur'));
          else el.dispatchEvent(new PointerEvent(reason, { bubbles: true, pointerId: 1, clientX: -600, clientY: -600 }));
        }, reason);
        await within();
        assert.equal(await page.locator('html').getAttribute('data-floe-hot-interaction'), null);
        await page.mouse.up();
      }
      await reset();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.mouse.move(260, 156);
      await page.mouse.down();
      await page.mouse.move(1800, 1400);
      await page.setViewportSize({ width: 900, height: 650 });
      await settle();
      await page.mouse.up();
      await within();
      assert.equal(await panel.evaluate(el => el.getAnimations().length), 0, 'reduced motion settles immediately');
      assert.deepEqual(errors, []);
      await page.close();
      console.log(engine.name() + ': resistance, reachable header, release recovery, drag restore, retained content and reduced motion passed');
    } finally { await browser.close(); }
  }
} finally {
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
