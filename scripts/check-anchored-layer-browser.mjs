/* global window, document, performance, getComputedStyle, requestAnimationFrame, DOMMatrixReadOnly */
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
import { SurfaceAnchoredLayer, createFloatingPresence, Dropdown, Popover } from '../dist/ui.js';
import '../dist/styles.css';
function App() {
 const primitive = new URLSearchParams(location.search).get('primitive');
 if (primitive) return <div style={{position:'fixed',left:'600px',top:location.search.includes('above') ? '800px' : '40px'}}>
   {primitive === 'dropdown' ? <Dropdown trigger={<span>Open choices</span>} items={[{id:'first',label:'First choice'},{id:'next',label:'More choices',children:[{id:'child',label:'Nested choice'}]}]} onSelect={() => {}} /> :
   <Popover placement={primitive === 'popover-top' ? 'top-start' : 'bottom-start'} trigger={<button>Open choices</button>} ariaLabel="Choices"><div style={{padding:'24px'}}>Popover choices</div></Popover>}
 </div>;
 const [anchor, setAnchor] = createSignal();
 const motion = new URLSearchParams(location.search).get('motion');
 const menu = location.search.includes('menu') || !!motion;
 const [open, setOpen] = createSignal(!menu);
 let motionPanel;
 const presence = createFloatingPresence({ open, element: () => motionPanel });
 const toggle = () => {
   setOpen(value => !value);
   window.openingFrames = [];
   const sample = () => {
     const panel = document.querySelector('[data-panel]');
     if (panel) {
       const rect = panel.getBoundingClientRect();
       window.openingFrames.push({ y: rect.y, bottom: rect.bottom, height: rect.height, visible: getComputedStyle(panel).visibility });
     }
     if (window.openingFrames.length < 18 && open()) requestAnimationFrame(sample);
   };
   if (open()) requestAnimationFrame(sample);
 };
 const projected = location.search.includes('projected');
 return <div data-floe-surface-portal-layer={projected ? 'true' : undefined}
   style={projected ? {position:'absolute',left:'80px',top:'60px',width:'900px',height:'800px'} : undefined}>
   <div data-floe-dialog-surface-host={projected ? 'true' : undefined}
   style={projected ? {position:'absolute',left:'0px',top:'0px',width:'900px',height:'800px',transform:'scale(.75)','transform-origin':'top left'} : undefined}>
   <button ref={setAnchor} onClick={toggle} data-anchor style={{position:'absolute',left:'8px',top:menu ? '700px' : '96px',width:'40px',height:'40px'}}>Open</button>
   <Show when={motion ? presence.mounted() : open()}><SurfaceAnchoredLayer anchor={anchor()} placement={motion === 'left' || motion === 'right' ? motion : menu ? undefined : "right"} gap={16}
     onAnchorDisconnect={() => setOpen(false)} data-panel
     style={menu ? undefined : {width:'424px',height:'427px','box-sizing':'border-box','max-height':'var(--floe-anchored-layer-max-height)'}}>
     {menu ? <div ref={motionPanel} data-motion-panel class={motion ? 'floe-floating-presence floe-floating-menu' : undefined} data-floating-presence={presence.state()} style={{width:'256px','max-height':'min(352px, var(--floe-anchored-layer-max-height))',overflow:'auto',padding:'4px',border:'1px solid gray','box-sizing':'border-box'}}>
       <div style={{height:'220px'}}>Permission choices</div></div> : <input aria-label="Search" />}
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
  // The generated fixture is immutable; filesystem delivery must not reload a measurement page.
  await server.watcher.close();
  const url = `${server.resolvedUrls.local[0]}${fixture.split('/').pop()}/`;
  browser = await chromium.launch();
  for (const primitive of ['dropdown', 'popover', 'popover-top']) {
    for (const above of primitive === 'popover-top' ? [true] : [false, true]) {
      const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
      await page.goto(`${url}?primitive=${primitive}${above ? '&above' : ''}`);
      const trigger = page.getByRole('button', { name: 'Open choices' });
      await trigger.evaluate(el => {
        window.primitiveFrames = [];
        el.addEventListener('click', () => {
          const start = performance.now();
          const sample = () => {
            const panel = document.querySelector('.floe-floating-menu');
            if (panel && panel.getBoundingClientRect().top >= 0) {
              const style = getComputedStyle(panel);
              window.primitiveFrames.push({ y: new DOMMatrixReadOnly(style.transform).m42, side: panel.dataset.floatingSide });
            }
            if (performance.now() - start < 320) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        });
      });
      await trigger.click();
      await page.waitForTimeout(360);
      const frames = await page.evaluate(() => window.primitiveFrames);
      const sign = above ? 1 : -1;
      assert(frames.length > 1);
      assert(frames.every(frame => frame.side === (above ? 'top' : 'bottom')), `${primitive}: use resolved placement`);
      assert(frames.some(frame => sign * frame.y > 0.1), `${primitive}/${above}: directional entry ${JSON.stringify(frames)}`);
      assert(frames.every(frame => sign * frame.y >= -0.01), `${primitive}: no reversed frame`);
      if (primitive === 'dropdown') {
        const parent = page.getByRole('menuitem', { name: 'More choices' });
        await parent.hover();
        const submenu = page.locator('.floe-floating-submenu');
        await submenu.waitFor();
        await page.waitForTimeout(280);
        assert.equal(await submenu.getAttribute('data-floating-side'), 'right');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        await trigger.evaluate(el => { el.parentElement.parentElement.style.left = '960px'; });
        await trigger.click();
        // Opening assigns focus on the next frame; wait before choosing another
        // item so a slower runner cannot redirect ArrowRight to the first item.
        await page.waitForFunction(() => {
          const menu = document.querySelector('[role="menu"]');
          return menu?.dataset.floatingPresence === 'open' && menu.contains(document.activeElement);
        });
        await parent.focus();
        await parent.press('ArrowRight');
        await submenu.waitFor();
        await page.waitForTimeout(280);
        assert.equal(await submenu.getAttribute('data-floating-side'), 'left', 'submenu flips at the right edge');
        const reversed = await submenu.evaluate(el => {
          const style = getComputedStyle(el);
          return { enter: style.getPropertyValue('--floe-floating-enter-x').trim(), exit: style.getPropertyValue('--floe-floating-exit-x').trim() };
        });
        assert.equal(parseFloat(reversed.enter), 0.375);
        assert.equal(parseFloat(reversed.exit), 0.125);
      }
      await page.keyboard.press('Escape');
      await page.close();
    }
  }
  for (const height of [400, 900]) {
    const page = await browser.newPage({ viewport: { width: 1100, height } });
    await page.goto(`${url}?menu`);
    const trigger = page.locator('[data-anchor]');
    await trigger.evaluate((button, height) => {
      button.style.top = `${height - 80}px`;
    }, height);
    for (let cycle = 0; cycle < 3; cycle++) {
      await trigger.click();
      await page.waitForFunction(() => window.openingFrames?.length >= 18);
      const visible = (await page.evaluate(() => window.openingFrames)).filter(
        (frame) => frame.visible === 'visible'
      );
      assert(visible.length > 1, 'capture the first and subsequent painted positions');
      for (const frame of visible) {
        assert.equal(
          frame.y,
          visible.at(-1).y,
          `first-paint position must be settled: ${JSON.stringify(visible)}`
        );
        assert(
          frame.y >= 12 && frame.bottom <= height - 12,
          'every painted frame stays inside the viewport'
        );
      }
      await trigger.click();
    }
    await page.close();
  }
  for (const reducedMotion of ['no-preference', 'reduce']) {
    for (const projected of [false, true]) {
      for (const side of ['above', 'below', 'left', 'right']) {
        const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, reducedMotion });
        await page.goto(`${url}?motion=${side}${projected ? '&projected' : ''}`);
        const trigger = page.locator('[data-anchor]');
        await trigger.evaluate((el, side) => {
          el.style.left = side === 'left' ? '600px' : '80px';
          el.style.top = side === 'above' ? '600px' : '60px';
          window.motionFrames = [];
          el.addEventListener('click', () => {
            const start = performance.now();
            const sample = () => {
              const panel = document.querySelector('[data-motion-panel]');
              const layer = document.querySelector('[data-panel]');
              if (panel && getComputedStyle(layer).visibility === 'visible') {
                const style = getComputedStyle(panel);
                const matrix = new DOMMatrixReadOnly(style.transform);
                window.motionFrames.push({ x: matrix.m41, y: matrix.m42, opacity: Number(style.opacity), side: layer.dataset.placement, origin: style.transformOrigin });
              }
              if (performance.now() - start < 320) requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
          });
        }, side);
        await trigger.click();
        await page.waitForTimeout(360);
        const frames = await page.evaluate(() => window.motionFrames);
        assert(frames.length > 1, `${side}: capture actual rendered motion`);
        assert(frames.every(frame => frame.side === side), `${side}: resolved placement`);
        const axis = side === 'left' || side === 'right' ? 'x' : 'y';
        const sign = side === 'above' || side === 'left' ? 1 : -1;
        if (reducedMotion === 'reduce') {
          assert(frames.every(frame => Math.abs(frame[axis]) < 0.01), `${side}: reduced motion has no travel`);
        } else {
          assert(frames.some(frame => sign * frame[axis] > 0.1), `${side}: enters away from its anchor: ${JSON.stringify(frames)}`);
          assert(frames.every(frame => sign * frame[axis] >= -0.01), `${side}: never travels from the opposite side`);
          assert.equal(frames.at(-1)[axis], 0, `${side}: settles exactly`);
          for (let i = 1; i < frames.length; i++) {
            assert(sign * frames[i][axis] <= sign * frames[i - 1][axis] + 0.01, `${side}: continuous entry`);
          }
        }
        await page.evaluate(() => { window.motionFrames = []; });
        await trigger.click();
        if (reducedMotion !== 'reduce') assert.equal(await page.locator('[data-motion-panel]').count(), 1, 'retain the closing surface');
        await page.waitForTimeout(360);
        const exit = await page.evaluate(() => window.motionFrames);
        if (reducedMotion !== 'reduce') assert(exit.some(frame => sign * frame[axis] > 0.1), `${side}: exits toward its anchor`);
        assert.equal(await page.locator('[data-motion-panel]').count(), 0);
        await page.close();
      }
    }
  }
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
    'PASS: directional enter/exit, reduced motion, stable first paint, repeated opens, short viewports, side flip, boundary clamp, projected size, retained input and disconnect'
  );
} finally {
  await browser?.close();
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
