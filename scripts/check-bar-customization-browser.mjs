/* global document, window, Element, requestAnimationFrame, MouseEvent, getComputedStyle */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium, webkit } from 'playwright';
const require = createRequire(new URL('../apps/demo/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = await createServer({ root: fileURLToPath(new URL('../apps/demo', import.meta.url)), configFile: fileURLToPath(new URL('../apps/demo/vite.config.ts', import.meta.url)), server: { host: '127.0.0.1', port: 5276, strictPort: true } });
await server.listen();
let browser;
try {
  browser = await (process.argv.includes('--webkit') ? webkit : chromium).launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 750 } });
  await page.addInitScript(() => {
    window.barAnimations = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.hasAttribute('data-floe-bar-key')) window.barAnimations.push({ key: this.getAttribute('data-floe-bar-key'), frames });
      return original.call(this, frames, options);
    };
  });
  const errors = []; page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  const url = `http://127.0.0.1:${server.httpServer.address().port}/bar-customization.html`;
  await page.goto(url);
  await page.locator('[data-floe-bar-key="files"]').waitFor();
  await page.evaluate(() => {
    window.railFrames = [];
    window.railSampling = true;
    const sample = () => {
      const rail = document.querySelector('nav > div');
      const button = rail.querySelector('[data-floe-bar-key="plugins"]');
      const rect = button.getBoundingClientRect();
      window.railFrames.push({ height: rail.clientHeight, extent: rail.scrollHeight, x: rect.x, width: rect.width, y: rect.y, opacity: getComputedStyle(button).opacity });
      if (window.railSampling) requestAnimationFrame(sample);
    };
    sample();
  });
  await page.locator('nav [data-floe-bar-key="files"]').click({ button: 'right' });
  await page.waitForTimeout(40);
  await page.locator('nav [data-floe-bar-key="terminal"]').dispatchEvent('contextmenu', { button: 2 });
  await page.waitForTimeout(240);
  const frames = await page.evaluate(() => { window.railSampling = false; return window.railFrames; });
  assert.ok(frames.every(frame => frame.extent <= frame.height), `Unpin must not create transient overflow in a roomy rail: ${JSON.stringify(frames)}`);
  assert.ok(frames.every((frame, index) => frame.opacity === '1' && (!index || frame.y <= frames[index - 1].y + 1)), 'Repeated unpin keeps retained icons opaque and moving monotonically');
  await page.goto(url);
  await page.locator('[data-floe-bar-key="files"]').waitFor();
  const compactFrames = await page.evaluate(async () => {
    const rail = document.querySelector('nav > div');
    rail.style.maxHeight = '115px';
    rail.scrollTop = rail.scrollHeight;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const frames = [];
    const sample = () => {
      const rect = rail.querySelector('[data-floe-bar-key="plugins"]').getBoundingClientRect();
      frames.push({ x: rect.x, y: rect.y, width: rect.width });
    };
    sample();
    rail.querySelector('[data-floe-bar-key="files"]').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, button: 2 }));
    for (let i = 0; i < 20; i++) { await new Promise(requestAnimationFrame); sample(); }
    return frames;
  });
  assert.ok(compactFrames.every(frame => Math.abs(frame.x - compactFrames[0].x) < .5 && Math.abs(frame.width - compactFrames[0].width) < .5), `Scrollbar changes cannot resize rail slots: ${JSON.stringify(compactFrames)}`);
  assert.ok(compactFrames.every(frame => frame.y <= compactFrames[0].y + 1), `Unpin at the scroll boundary cannot jump downward: ${JSON.stringify(compactFrames)}`);
  const keys = locator => locator.locator('[data-floe-bar-key]').evaluateAll(nodes => nodes.map(node => node.dataset.floeBarKey));
  const drag = async (source, target, axis, cancel = false) => {
    const a = await source.boundingBox(), b = await target.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + (axis === 'x' ? b.width - 2 : b.width / 2), b.y + (axis === 'y' ? b.height - 2 : b.height / 2), { steps: 8 });
    if (cancel) await page.keyboard.press('Escape');
    await page.mouse.up();
  };
  for (const theme of ['light', 'dark']) {
    await page.goto(url);
    await page.locator('[data-floe-bar-key="files"]').waitFor();
    await page.evaluate(mode => {
      const root = document.documentElement;
      root.classList.toggle('light', mode === 'light');
      root.classList.toggle('dark', mode === 'dark');
      root.dataset.floeShellTheme = `porcelain-${mode}`;
    }, theme);
    const rail = page.locator('nav'), dock = page.locator('.workbench-dock');
    const press = await rail.locator('[data-floe-bar-key="terminal"]').boundingBox();
    await page.mouse.move(press.x + press.width / 2, press.y + press.height / 2);
    await page.mouse.down(); await page.keyboard.press('Escape'); await page.mouse.up();
    assert.equal(await page.locator('[data-active]').textContent(), 'files', 'Escape before threshold must not activate');
    await rail.locator('[data-floe-bar-key="terminal"]').press('Enter');
    assert.equal(await page.locator('[data-active]').textContent(), 'terminal', 'Cancel does not swallow a later keyboard activation');
    await rail.locator('[data-floe-bar-key="files"]').click();
    const moving = rail.locator('[data-floe-bar-key="files"]');
    const movingStart = await moving.boundingBox();
    await page.mouse.move(movingStart.x + movingStart.width / 2, movingStart.y + movingStart.height / 2);
    await page.mouse.down();
    let neighborAnimations;
    for (const delta of [8, 60, 64, 68, 80, 72, 65, 7]) {
      await page.mouse.move(movingStart.x + movingStart.width / 2, movingStart.y + movingStart.height / 2 + delta);
      const live = await moving.boundingBox();
      assert.ok(Math.abs(live.y - movingStart.y - delta) < 1, `Dragged rail entry must track the pointer without easing or lag: ${JSON.stringify({ delta, live, movingStart, style: await moving.getAttribute('style') })}`);
      if (delta === 60) neighborAnimations = await page.evaluate(() => window.barAnimations.length);
      if ([64, 68, 80, 72, 65].includes(delta)) assert.equal(await page.evaluate(() => window.barAnimations.length), neighborAnimations, 'Pointer movement within a slot must not restart neighbor motion');
    }
    await page.keyboard.press('Escape'); await page.mouse.up();
    await page.waitForTimeout(200);
    const trackingDock = dock.locator('[data-floe-bar-key="widget:files"]');
    const dockStart = await trackingDock.boundingBox();
    await page.mouse.move(dockStart.x + dockStart.width / 2, dockStart.y + dockStart.height / 2);
    await page.mouse.down();
    for (const delta of [8, 16, 24, 13, 7]) {
      await page.mouse.move(dockStart.x + dockStart.width / 2 + delta, dockStart.y + dockStart.height / 2);
      assert.ok(Math.abs((await trackingDock.boundingBox()).x - dockStart.x - delta) < 1, 'Dragged Dock entry must follow the pointer synchronously');
    }
    await page.keyboard.press('Escape'); await page.mouse.up();
    await page.waitForTimeout(200);
    await drag(rail.locator('[data-floe-bar-key="files"]'), rail.locator('[data-floe-bar-key="plugins"]'), 'y');
    assert.deepEqual(await keys(rail), ['terminal', 'plugins', 'files']);
    const fades = await page.evaluate(() => window.barAnimations.filter(animation => animation.frames[0].opacity === 0));
    assert.deepEqual(fades, [], 'Existing navigation must never fade out during the first reorder');
    assert.equal(await page.locator('[data-active]').textContent(), 'files');
    await rail.locator('[data-floe-bar-key="files"]').press('Alt+Shift+ArrowUp');
    assert.deepEqual(await keys(rail), ['terminal', 'files', 'plugins']);
    await drag(rail.locator('[data-floe-bar-key="terminal"]'), rail.locator('[data-floe-bar-key="plugins"]'), 'y', true);
    assert.deepEqual(await keys(rail), ['terminal', 'files', 'plugins']);
    await drag(dock.locator('[data-floe-bar-key="widget:files"]'), dock.locator('[data-floe-bar-key="host:weather"]'), 'x');
    assert.deepEqual(await keys(dock), ['widget:terminal', 'action:plugins', 'host:weather', 'widget:files', 'tool:sticky-note']);
    assert.equal(await page.locator('[data-created]').textContent(), '0');
    assert.equal(await page.locator('[data-activated]').textContent(), '0');
    await dock.locator('[data-floe-bar-key="widget:files"]').press('Alt+Shift+ArrowLeft');
    assert.deepEqual(await keys(dock), ['widget:terminal', 'action:plugins', 'widget:files', 'host:weather', 'tool:sticky-note']);
    await drag(dock.locator('[data-floe-bar-key="widget:terminal"]'), dock.locator('[data-floe-bar-key="host:weather"]'), 'x', true);
    assert.equal((await keys(dock))[0], 'widget:terminal');
    await dock.locator('[data-floe-bar-key="widget:terminal"]').evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => undefined))); });
    const source = await dock.locator('[data-floe-bar-key="widget:terminal"]').boundingBox();
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2); await page.mouse.down();
    await page.mouse.move(600, 240, { steps: 8 }); await page.mouse.up();
    assert.equal(await page.locator('[data-created]').textContent(), '1');
    await dock.locator('[data-floe-bar-key="action:plugins"]').click();
    assert.equal(await page.locator('[data-activated]').textContent(), '1');

    await dock.locator('[data-floe-bar-key="widget:files"]').click({ button: 'right' });
    const overflow = page.locator('[data-overflow-drag="widget:files"]');
    await overflow.click();
    assert.equal(await page.locator('[data-activated]').textContent(), '2', 'Overflow click activates once');
    const pressOverflow = await overflow.boundingBox();
    await page.mouse.move(pressOverflow.x + pressOverflow.width / 2, pressOverflow.y + pressOverflow.height / 2);
    await page.mouse.down(); await page.keyboard.press('Escape'); await page.mouse.up();
    assert.equal(await page.locator('[data-activated]').textContent(), '2', 'Escape before the overflow threshold must cancel the pending click');
    for (const cancel of [true, false]) {
      const origin = await overflow.boundingBox();
      await page.mouse.move(origin.x + origin.width / 2, origin.y + origin.height / 2);
      await page.mouse.down(); await page.mouse.move(600, 240, { steps: 8 });
      if (cancel) await page.keyboard.press('Escape');
      await page.mouse.up();
      assert.equal(await page.locator('[data-created]').textContent(), cancel ? '1' : '2');
      assert.equal(await page.locator('[data-overflow-result]').textContent(), cancel ? 'canceled' : 'dropped');
      assert.equal(await page.locator('[data-activated]').textContent(), '2', 'Overflow dragging cannot activate the click path');
    }
    await page.locator('[data-restore="widget:files"]').click();

    for (const key of ['widget:files', 'tool:sticky-note', 'action:plugins', 'host:weather']) {
      await dock.locator(`[data-floe-bar-key="${key}"]`).click({ button: 'right' });
      assert.ok(!(await keys(dock)).includes(key), `Unpin removes ${key} without a reactive read after disposal`);
      await page.locator(`[data-restore="${key}"]`).click();
      assert.ok((await keys(dock)).includes(key));
    }
    await page.goto(url);
    const shortRail = page.locator('nav > div').first();
    await shortRail.evaluate(element => { element.style.maxHeight = '68px'; });
    await rail.locator('[data-floe-bar-key="files"]').hover();
    const tooltip = page.getByRole('tooltip', { name: 'files', exact: true });
    await tooltip.waitFor({ state: 'visible' });
    assert.ok((await tooltip.boundingBox()).x >= (await rail.boundingBox()).width, 'Rail labels escape the scroll clip');
    const first = await rail.locator('[data-floe-bar-key="files"]').boundingBox();
    const viewport = await shortRail.boundingBox();
    await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
    await page.mouse.down();
    await page.mouse.move(viewport.x + viewport.width / 2, viewport.y + viewport.height - 2, { steps: 5 });
    await page.waitForFunction(() => {
      const element = document.querySelector('nav > div');
      return element.scrollTop > 0 && element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
    }, undefined, { timeout: 5000 });
    await page.mouse.up();
    assert.deepEqual(await keys(rail), ['terminal', 'plugins', 'files'], 'Edge scrolling makes the final slot reachable');
    for (const key of ['files', 'plugins', 'terminal']) {
      await rail.locator(`[data-floe-bar-key="${key}"]`).click({ button: 'right' });
      assert.ok(!(await keys(rail)).includes(key));
    }
  }
  assert.deepEqual(errors, []);
  console.log('Navigation customization: pointer/keyboard order, cancellation, stable selection and canvas creation passed in light/dark.');
} finally { await browser?.close(); await server.close(); }
