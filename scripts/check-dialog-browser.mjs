/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: solid } = await import('vite-plugin-solid');
const { default: tailwind } = await import(
  pathToFileURL(require.resolve('@tailwindcss/vite')).href
);
const server = await createServer({
  configFile: false,
  optimizeDeps: { entries: ['test/browser/dialog.html'] },
  root: fileURLToPath(new URL('../packages/core/', import.meta.url)),
  plugins: [solid(), tailwind()],
  resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0 },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/test/browser/dialog.html`);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'Review stop sharing', exact: true }).click();
    const sharing = page.getByRole('dialog', { name: 'Stop sharing', exact: true });
    await sharing.locator('[data-floe-dialog-body] p').waitFor();
    const layout = await sharing.evaluate((el) => {
      const header = el.querySelector('[data-floe-dialog-header]');
      const body = el.querySelector('[data-floe-dialog-body]');
      const footer = el.querySelector('[data-floe-dialog-footer]');
      const description = document.getElementById(el.getAttribute('aria-describedby'));
      return {
        size: getComputedStyle(description).fontSize,
        title: header.textContent,
        inBody: description.parentElement === body,
        bodyChildren: body.children.length,
        visible: description.getBoundingClientRect().height > 0,
        afterHeader:
          description.getBoundingClientRect().top >= header.getBoundingClientRect().bottom,
        beforeFooter:
          description.getBoundingClientRect().bottom <= footer.getBoundingClientRect().top,
        noOverflow: body.scrollWidth <= body.clientWidth,
      };
    });
    assert.deepEqual(layout, {
      size: '13px',
      title: 'Stop sharing',
      inBody: true,
      bodyChildren: 1,
      visible: true,
      afterHeader: true,
      beforeFooter: true,
      noOverflow: true,
    });
    await sharing.getByRole('button', { name: 'Cancel', exact: true }).click();
    await sharing.waitFor({ state: 'detached' });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Manage plugins', exact: true }).click();
  const drawer = page.locator('[data-floe-dialog-presentation="bottom-drawer"]');
  await drawer.locator('[data-floating-presence="open"]').first().waitFor();
  assert.equal(await drawer.evaluate((el) => el.closest('[inert]')), null);
  await page.getByRole('textbox', { name: 'Search plugins' }).fill('weather');
  await page.getByRole('button', { name: 'Source filter', exact: true }).click();
  assert.equal(await drawer.getByRole('menu').count(), 1);
  await drawer.getByRole('menuitem', { name: 'Official sources', exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector('[data-filter]')?.textContent === 'official'
  );
  await page.getByRole('button', { name: 'Source filter', exact: true }).click();
  await page.getByRole('menuitem', { name: 'All sources', exact: true }).focus();
  await page.keyboard.press('Escape');
  await page.getByRole('menu').waitFor({ state: 'detached' });
  assert.equal(await drawer.getAttribute('data-floating-presence'), 'open');

  const review = page.getByRole('button', { name: 'Review install', exact: true });
  await review.click();
  const confirm = page.getByRole('dialog', { name: 'Confirm installation', exact: true });
  await confirm.getByRole('textbox').fill('reviewed');
  await confirm.getByRole('button', { name: 'Cancel installation' }).focus();
  await page.keyboard.press('Tab');
  assert.equal(await confirm.evaluate((el) => el.contains(document.activeElement)), true);
  await page.keyboard.press('Escape');
  await confirm.waitFor({ state: 'detached' });
  await page.waitForFunction(() => document.activeElement?.textContent === 'Review install');
  assert.equal(await drawer.getAttribute('data-floating-presence'), 'open');

  await page.getByRole('button', { name: 'Source filter', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Review package', exact: true }).click();
  await confirm.getByRole('textbox').fill('opened from menu');
  await page.keyboard.press('Escape');
  await confirm.waitFor({ state: 'detached' });
  await page.waitForFunction(() => document.activeElement?.textContent === 'Source filter', null, {
    timeout: 1500,
  });
  assert.equal(await drawer.getAttribute('data-floating-presence'), 'open');

  await drawer.locator('[data-scroll]').hover();
  await page.mouse.wheel(0, 500);
  await page.waitForFunction(() => document.querySelector('[data-scroll]').scrollTop > 0);
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollTop), 0);
  await page.mouse.click(10, 10);
  assert.equal(await drawer.count(), 1, 'exit stays mounted');
  assert.equal(await page.locator('[data-background]').evaluate((el) => el.inert), true);
  await page.mouse.click(10, 10);
  await drawer.waitFor({ state: 'detached' });
  assert.equal(await page.locator('[data-count]').textContent(), '0');
  await page.getByRole('button', { name: 'Background action', exact: true }).click();
  assert.equal(await page.locator('[data-count]').textContent(), '1');

  await page.getByRole('button', { name: 'Local settings', exact: true }).click();
  const local = page.getByRole('dialog', { name: 'Local settings', exact: true });
  assert.equal(
    await local.evaluate((el) => el.closest('[data-floe-dialog-mode]').dataset.floeDialogMode),
    'surface'
  );
  await local.getByRole('button', { name: 'Local action', exact: true }).click();
  assert.equal(await page.locator('[data-count]').textContent(), '2');
  await page.keyboard.press('Escape');
  await local.waitFor({ state: 'detached' });

  const canvasViewport = await page.locator('[data-canvas-viewport]').textContent();
  await page.getByRole('button', { name: 'Canvas dialog', exact: true }).click();
  const canvasDialog = page.getByRole('dialog', { name: 'Canvas settings', exact: true });
  await canvasDialog.getByRole('button', { name: 'Apply canvas settings', exact: true }).click();
  assert.equal(
    await page.locator('[data-canvas-actions]').textContent(),
    '1',
    'global dialog footer owns its pointer sequence'
  );
  await canvasDialog.getByRole('button', { name: 'Close', exact: true }).click();
  await canvasDialog.waitFor({ state: 'detached' });
  assert.equal(await page.locator('[data-canvas-viewport]').textContent(), canvasViewport);
  await page.getByRole('button', { name: 'Canvas dialog', exact: true }).click();
  await canvasDialog.waitFor();
  await page.mouse.click(10, 10);
  await canvasDialog.waitFor({ state: 'detached' });
  assert.equal(await page.locator('[data-canvas-viewport]').textContent(), canvasViewport);

  // A body whose content is chosen rather than typed — the shape dialog reveals
  // guidance for one option — must travel to its new height instead of snapping,
  // and must do that once per change rather than fighting its own frames.
  await page.evaluate(() => {
    window.__heightAnimations = [];
    const pixels = (value) => Number.parseFloat(String(value));
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const frames = Array.isArray(keyframes) ? keyframes : [];
      if (frames.some((frame) => frame && 'height' in frame)) {
        window.__heightAnimations.push({
          panel: this.hasAttribute('data-floe-dialog-panel'),
          from: pixels(frames[0].height),
          to: pixels(frames[frames.length - 1].height),
          duration: typeof options === 'number' ? options : options?.duration,
          easing: typeof options === 'number' ? null : options?.easing,
          fill: typeof options === 'number' ? null : options?.fill,
        });
      }
      return animate.call(this, keyframes, options);
    };
  });

  await page.getByRole('button', { name: 'Open shape settings', exact: true }).click();
  const shapeDialog = page.getByRole('dialog', { name: 'Shape settings', exact: true });
  // The marker sits on the dialog root itself, not on a child.
  const shapePanel = page.locator('[data-floe-dialog-panel]');
  await shapePanel.waitFor();
  await page.waitForTimeout(400);
  const compactHeight = await shapePanel.evaluate((el) => el.getBoundingClientRect().height);
  assert.equal(await page.locator('[data-shape-help]').count(), 0);

  await shapeDialog.getByRole('radio', { name: 'Detailed', exact: true }).click();
  await page.waitForTimeout(40);
  const growingHeight = await shapePanel.evaluate((el) => el.getBoundingClientRect().height);
  await page.waitForTimeout(400);
  await page.locator('[data-shape-help]').waitFor();
  const detailedHeight = await shapePanel.evaluate((el) => el.getBoundingClientRect().height);
  assert.ok(detailedHeight > compactHeight + 8, 'the detailed body is taller');
  assert.ok(
    growingHeight > compactHeight && growingHeight < detailedHeight,
    `the panel travels between its heights, got ${growingHeight}px between ${compactHeight} and ${detailedHeight}`
  );
  assert.equal(
    await shapePanel.evaluate((el) => el.style.height),
    '',
    'the animated height is released once it lands'
  );

  await shapeDialog.getByRole('radio', { name: 'Compact', exact: true }).click();
  await page.waitForTimeout(400);
  const backHeight = await shapePanel.evaluate((el) => el.getBoundingClientRect().height);
  assert.ok(Math.abs(backHeight - compactHeight) < 1, 'the panel returns to its compact height');

  const heightAnimations = await page.evaluate(() => window.__heightAnimations);
  assert.equal(heightAnimations.length, 2, 'one height pass per change');
  for (const animation of heightAnimations) {
    assert.deepEqual(
      { panel: animation.panel, duration: animation.duration, easing: animation.easing, fill: animation.fill },
      {
        panel: true,
        duration: 220,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'none',
      }
    );
  }
  assert.ok(Math.abs(heightAnimations[0].from - compactHeight) < 1, 'grow starts at the old height');
  assert.ok(Math.abs(heightAnimations[0].to - detailedHeight) < 1, 'grow ends at the new height');
  assert.ok(Math.abs(heightAnimations[1].from - detailedHeight) < 1, 'shrink starts at the old height');
  assert.ok(Math.abs(heightAnimations[1].to - compactHeight) < 1, 'shrink ends at the new height');

  await page.keyboard.press('Escape');
  await shapeDialog.waitFor({ state: 'detached' });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Manage plugins', exact: true }).click();
  assert.ok(
    await drawer
      .locator('[data-floe-dialog-panel]')
      .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration) <= 0.001)
  );
  await page.getByRole('button', { name: 'Close manager', exact: true }).click();
  await drawer.waitFor({ state: 'detached' });
  assert.deepEqual(errors, []);
  console.log(
    'Dialog browser contract passed: native input, nested menus/confirmation, exit isolation, projected placement, reduced motion.'
  );
} finally {
  await browser?.close();
  await server.close();
}
