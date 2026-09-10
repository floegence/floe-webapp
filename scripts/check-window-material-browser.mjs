/* global window, document, getComputedStyle, DOMMatrix */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openSurfaceBrowser, artifactRoot } from './surface-browser-utils.mjs';
const baseline = process.argv.includes('--baseline');
const version = baseline ? 'baseline' : 'current';
const output = resolve(artifactRoot, baseline ? 'window-before' : 'window-after');
mkdirSync(output, { recursive: true });
const runtime = await openSurfaceBrowser();
const checks = [];
const measurements = [];
function check(name, action) {
  try {
    action();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({ name, passed: false, message: error.message });
  }
}
async function measure(page) {
  return page.locator('.window-study-window-0').evaluate((panel) => {
    const title = panel.querySelector('[data-floe-floating-window-titlebar]');
    const style = getComputedStyle(panel),
      header = getComputedStyle(title);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    const rgb = (value) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    return {
      background: rgb(style.backgroundColor),
      foreground: rgb(style.color),
      muted: rgb(getComputedStyle(panel.querySelector('.window-study-lead')).color),
      title: rgb(header.backgroundColor),
      titleForeground: rgb(header.color),
      state: panel.getAttribute('data-floe-floating-window-state'),
      titleImage: header.backgroundImage,
      border: style.borderColor,
      shadow: style.boxShadow,
      backdrop: style.backdropFilter,
      opacity: style.opacity,
      willChange: style.willChange,
      transition: style.transitionProperty,
      transform: style.transform,
    };
  });
}
const luminance = (rgb) =>
  rgb
    .slice(0, 3)
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) =>
  (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
try {
  for (const entry of ['styles', 'tailwind']) {
    const page = await runtime.browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      `${runtime.baseURL}/${version}-${entry}/dist/?panel=windows&surface=soft-neumorphic&theme=paper`
    );
    await page.waitForFunction(() => !!window.surfaceFixture);
    const presets = await page.evaluate(() =>
      window.surfaceFixture.themes.map(({ name, mode }) => ({ name, mode }))
    );
    for (const preset of presets) {
      await page.getByLabel('Window study theme').selectOption(preset.name);
      await page.waitForTimeout(180);
      assert.equal(await page.locator('html').getAttribute('data-floe-shell-theme'), preset.name);
      await page.getByRole('heading', { name: 'Project files', exact: true }).click();
      const before = await measure(page);
      await page.getByRole('button', { name: 'Window 1 actions', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Copy reference' }).click();
      await page.waitForTimeout(180);
      const active = await measure(page);
      measurements.push({ entry, theme: preset.name, ...active });
      if (preset.name !== 'hc-light') {
        check(`${entry}/${preset.name}: opaque solid title and reading surface`, () => {
          assert.equal(active.background[3], 255);
          assert.equal(active.title[3], 255);
          assert.equal(active.titleImage, 'none');
          assert.equal(active.backdrop, 'none');
          assert.ok(
            Math.abs(luminance(active.background) - luminance(active.title)) > 0.008,
            'title remains identifiable in grayscale'
          );
          assert.ok(
            contrast(active.foreground, active.background) >= 4.5,
            'reading foreground contrast'
          );
          assert.ok(contrast(active.foreground, active.title) >= 4.5, 'title foreground contrast');
          assert.ok(
            contrast(active.muted, active.background) >= 4.5,
            'secondary reading text contrast'
          );
        });
        check(`${entry}/${preset.name}: steady material without permanent promotion`, () => {
          assert.equal(active.state, 'active');
          assert.equal(before.state, 'inactive');
          assert.deepEqual(active.background, before.background);
          assert.notDeepEqual(
            active.title,
            before.title,
            'activation immediately distinguishes title chrome'
          );
          assert.ok(
            contrast(before.titleForeground, before.title) >= 4.5,
            'inactive title remains readable'
          );
          assert.equal(active.shadow, before.shadow);
          assert.equal(active.opacity, '1');
          assert.equal(active.willChange, 'auto');
          assert.ok(!active.transition.includes('shadow'));
          assert.ok(!active.shadow.includes('inset'), 'no bevel on a reading window');
        });
      }
      if (['paper', 'classic-dark', 'forest', 'graphite', 'nord'].includes(preset.name)) {
        await page
          .getByLabel('Window study background')
          .selectOption(preset.mode === 'dark' ? 'cards' : 'files');
        await page.screenshot({ path: resolve(output, `${entry}-${preset.name}.png`) });
      }
    }
    if (!baseline) {
      await page.getByLabel('Window study theme').selectOption('paper');
      await page.getByLabel('Window study background').selectOption('cards');
      await page.screenshot({ path: resolve(output, `${entry}-paper-cards.png`) });
      const panel = page.locator('.window-study-window-0');
      const geometry = panel.locator('..');
      const title = panel.locator('[data-floe-floating-window-titlebar]');
      const initial = await geometry.boundingBox();
      const heading = await title.boundingBox();
      const settledShadow = await panel.evaluate((el) => getComputedStyle(el).boxShadow);
      await page.mouse.move(heading.x + 180, heading.y + 18);
      await page.mouse.down();
      await page.mouse.move(heading.x + 230, heading.y + 48, { steps: 8 });
      const dragged = await geometry.boundingBox();
      check(`${entry}: direct drag keeps scale and ownership`, () => {
        assert.ok(Math.abs(dragged.x - initial.x - 50) <= 1);
        assert.ok(Math.abs(dragged.y - initial.y - 30) <= 1);
      });
      assert.equal(await panel.getAttribute('data-floe-surface-interacting'), 'true');
      assert.equal(await panel.evaluate((el) => getComputedStyle(el).willChange), 'auto');
      assert.ok(
        (await geometry.evaluate((el) => getComputedStyle(el).willChange)).includes('transform')
      );
      assert.equal(
        await panel.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a),
        1
      );
      await page.mouse.up();
      assert.equal(await panel.getAttribute('data-floe-surface-interacting'), null);
      assert.equal(await panel.evaluate((el) => getComputedStyle(el).boxShadow), settledShadow);
      const handle = await geometry
        .locator('[data-floe-floating-window-resize-handle="se"]')
        .boundingBox();
      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
      await page.mouse.down();
      await page.mouse.move(handle.x + handle.width / 2 + 40, handle.y + handle.height / 2 + 20, {
        steps: 8,
      });
      await page.mouse.up();
      const resized = await geometry.boundingBox();
      check(`${entry}: resize retains direct geometry`, () => {
        assert.ok(Math.abs(resized.width - dragged.width - 40) <= 1);
        assert.ok(Math.abs(resized.height - dragged.height - 20) <= 1);
      });
      await panel.getByRole('button', { name: 'Maximize', exact: true }).click();
      const maximized = await geometry.boundingBox();
      check(`${entry}: maximize respects the safe viewport`, () => {
        assert.equal(maximized.x, 12);
        assert.equal(maximized.y, 126);
        assert.equal(maximized.width, 1416);
        assert.equal(maximized.height, 846);
      });
      await panel.getByRole('button', { name: 'Restore', exact: true }).click();
      assert.deepEqual(await geometry.boundingBox(), resized);
      // Explicit public root overrides must reach both the window and its chrome.
      await page.evaluate(() => {
        Object.assign(window, {
          windowPanelBeforeClose: document.querySelector('.window-study-window-0'),
        });
        const root = document.documentElement;
        root.style.setProperty('--floe-window-background', '#f8faff');
        root.style.setProperty('--floe-window-titlebar-background', '#e4e9f2');
        root.style.setProperty('--floe-window-shadow', '0 2px 4px rgb(12 24 36 / 20%)');
      });
      const custom = await measure(page);
      check(`${entry}: public window overrides are authoritative`, () => {
        assert.deepEqual(custom.background, [248, 250, 255, 255]);
        assert.deepEqual(custom.title, [228, 233, 242, 255]);
        assert.equal(custom.shadow, 'rgba(12, 24, 36, 0.2) 0px 2px 4px 0px');
      });
      await panel.getByRole('button', { name: 'Close', exact: true }).click();
      await page.waitForTimeout(35);
      await page.getByRole('button', { name: 'Open preview', exact: true }).click();
      assert.equal(await panel.evaluate((el) => el === window.windowPanelBeforeClose), true);
      await page.waitForTimeout(180);
      assert.equal(await panel.evaluate((el) => getComputedStyle(el).willChange), 'auto');
      await page.evaluate(() =>
        [
          '--floe-window-background',
          '--floe-window-titlebar-background',
          '--floe-window-shadow',
        ].forEach((token) => document.documentElement.style.removeProperty(token))
      );
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await panel.evaluate((el) => getComputedStyle(el).transitionDuration), '0s');
      await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'active' });
      check(`${entry}: forced colors retain a real boundary`, () => assert.equal(errors.length, 0));
      assert.notEqual(await panel.evaluate((el) => getComputedStyle(el).borderStyle), 'none');
      assert.equal(await panel.evaluate((el) => getComputedStyle(el).boxShadow), 'none');
      await page.emulateMedia({ forcedColors: 'none' });
    }
    await page.getByLabel('Window study theme').selectOption('paper');
    await page.getByRole('button', { name: 'Open notes', exact: true }).click();
    await page.getByLabel('Window 2 draft').fill('Draft survives theme and activation changes.');
    await page.getByLabel('Window study theme').selectOption('classic-dark');
    await page.waitForTimeout(200);
    check(`${entry}: overlapping windows retain editable content`, () =>
      assert.equal(errors.length, 0)
    );
    assert.equal(
      await page.getByLabel('Window 2 draft').inputValue(),
      'Draft survives theme and activation changes.'
    );
    await page.screenshot({ path: resolve(output, `${entry}-overlap.png`) });
    if (!baseline) {
      await page.getByRole('button', { name: 'Third window', exact: true }).click();
      await page.getByLabel('Window 3 draft').waitFor();
      await page.waitForTimeout(180);
      assert.equal(await page.locator('[data-floe-floating-window-surface]').count(), 3);
      await page.screenshot({ path: resolve(output, `${entry}-three-windows.png`) });
      await page
        .locator('.window-study-window-2')
        .getByRole('button', { name: 'Close', exact: true })
        .click();
      await page
        .locator('.window-study-window-1')
        .getByRole('button', { name: 'Close', exact: true })
        .click();
      await page.locator('.window-study-window-1').waitFor({ state: 'detached' });
      const prose = page.locator('.window-study-document h1');
      const textBounds = await prose.boundingBox();
      await page.mouse.move(textBounds.x + 2, textBounds.y + 12);
      await page.mouse.down();
      await page.mouse.move(textBounds.x + 150, textBounds.y + 12, { steps: 12 });
      await page.mouse.up();
      const selection = await page.evaluate(() => window.getSelection()?.toString() ?? '');
      check(`${entry}: trusted pointer selection remains native`, () =>
        assert.ok(selection.length > 5)
      );
    }
    await page.close();
    // Compare identical geometry independently of the drag/resize recovery checks.
    const overlap = await runtime.browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await overlap.goto(
      `${runtime.baseURL}/${version}-${entry}/dist/?panel=windows&scene=overlap&surface=soft-neumorphic&theme=classic-dark`
    );
    await overlap.getByRole('button', { name: 'Open notes', exact: true }).click();
    await overlap.getByLabel('Window 2 draft').click();
    await overlap.waitForTimeout(250);
    await overlap.screenshot({ path: resolve(output, `${entry}-comparison-overlap.png`) });
    await overlap.close();
    if (!baseline) {
      for (const display of [
        { width: 390, height: 844, scale: 2 },
        { width: 430, height: 932, scale: 2 },
        { width: 768, height: 1024, scale: 2 },
        { width: 1440, height: 1000, scale: 2 },
        { width: 1152, height: 800, scale: 1.25 },
        { width: 960, height: 667, scale: 1.5 },
      ]) {
        const { scale, ...viewport } = display;
        const responsive = await runtime.browser.newPage({ viewport, deviceScaleFactor: scale });
        await responsive.goto(
          `${runtime.baseURL}/current-${entry}/dist/?panel=windows&surface=soft-neumorphic&theme=paper`
        );
        await responsive.locator('.window-study-window-0').waitFor();
        await responsive.waitForTimeout(200);
        const bounds = await responsive
          .locator('[data-floe-geometry-surface="floating-window"]')
          .boundingBox();
        check(`${entry}: ${viewport.width}px at ${scale}x retains visible window bounds`, () => {
          assert.ok(bounds.x >= 0 && bounds.y >= 126);
          assert.ok(
            bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height
          );
        });
        await responsive.screenshot({
          path: resolve(output, `${entry}-${viewport.width}-${scale}x.png`),
        });
        await responsive.close();
      }
      // Optional material must not change the existing standard presentation.
      const standard = [];
      for (const build of ['baseline', 'current']) {
        const compatibility = await runtime.browser.newPage();
        await compatibility.goto(
          `${runtime.baseURL}/${build}-${entry}/dist/?panel=windows&surface=standard&theme=classic-dark`
        );
        await compatibility.locator('.window-study-window-0').waitFor();
        await compatibility.waitForTimeout(250);
        standard.push(await measure(compatibility));
        await compatibility.close();
      }
      check(`${entry}: standard material remains unchanged`, () =>
        assert.deepEqual(standard[1], standard[0])
      );
    }
  }
} catch (error) {
  checks.push({ name: 'browser scenario', passed: false, message: error.stack });
} finally {
  await runtime.close();
  const failed = checks.filter((check) => !check.passed);
  writeFileSync(
    resolve(output, 'report.json'),
    JSON.stringify({ version, checks, measurements }, null, 2)
  );
  console.log(
    `${checks.length - failed.length}/${checks.length} checks passed; ${failed.length} failures`
  );
  if (failed.length) console.log(failed.slice(0, 6));
  process.exitCode = failed.length ? 1 : 0;
}
