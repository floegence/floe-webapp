/* global window, document, performance, requestAnimationFrame, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openSurfaceBrowser, artifactRoot } from './surface-browser-utils.mjs';

const outputName =
  process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ?? 'motion';
const output = resolve(artifactRoot, outputName);
mkdirSync(output, { recursive: true });
const runtime = await openSurfaceBrowser();
const report = {
  browser: runtime.browser.version(),
  renderer: runtime.renderer,
  package: JSON.parse(readFileSync(resolve(artifactRoot, 'current-manifest.json'), 'utf8')),
  checks: [],
  samples: [],
};
function check(name, action) {
  try {
    action();
    report.checks.push({ name, passed: true });
  } catch (error) {
    report.checks.push({ name, passed: false, message: error.message });
  }
}

// Start observation at the trusted input event. No synthetic state toggles or
// endpoint-only assertions: capture the intermediate positions actually painted.
async function captureControl(page, input, kind, key = 'Space') {
  await input.scrollIntoViewIfNeeded();
  await input.focus();
  await page.waitForTimeout(220);
  await input.evaluate((input, kind) => {
    const face = kind === 'tab' ? input : input.nextElementSibling;
    const moving = kind === 'tab' ? face : face.firstElementChild;
    window.controlFrames = [];
    input.addEventListener(
      kind === 'tab' ? 'keydown' : 'change',
      () => {
        const start = performance.now();
        const frame = () => {
          const style = getComputedStyle(moving);
          window.controlFrames.push({
            time: performance.now() - start,
            translate: parseFloat(style.translate) || 0,
            scale: style.scale === 'none' ? 1 : parseFloat(style.scale),
            fill: getComputedStyle(face).backgroundColor,
            selected: input.checked ?? input.getAttribute('aria-selected'),
          });
          if (performance.now() - start < 260) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      },
      { once: true }
    );
  }, kind);
  await input.press(key);
  await page.waitForTimeout(310);
  return page.evaluate(() => window.controlFrames);
}

async function resetOverlayEvents(page) {
  await page.evaluate(() => {
    window.overlayEvents = [];
  });
}
async function overlayEvents(page) {
  return page.evaluate(() => window.overlayEvents);
}
function checkMotion(name, events, selector, phase) {
  for (const property of ['opacity', 'transform']) {
    check(`${name}: ${phase} completes ${property}`, () => {
      assert.ok(
        events.some(
          (e) =>
            e.classes.includes(selector) && e.type === 'transitionrun' && e.property === property
        ),
        'transition starts'
      );
      assert.ok(
        events.some(
          (e) =>
            e.classes.includes(selector) && e.type === 'transitionend' && e.property === property
        ),
        'transition finishes before unmount'
      );
    });
  }
}

let completed = false;
try {
  for (const entry of ['styles', 'tailwind']) {
    for (const mode of ['light', 'dark']) {
      const name = `${entry}/${mode}`;
      const page = await runtime.browser.newPage({
        viewport: { width: 1440, height: 1080 },
        deviceScaleFactor: 1,
      });
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await page.goto(
        `${runtime.baseURL}/current-${entry}/dist/?panel=components&mode=${mode}&surface=soft-neumorphic`
      );
      await page.waitForFunction(() => !!window.surfaceFixture);
      await page.waitForTimeout(350);
      await page.evaluate(() => {
        window.overlayEvents = [];
        for (const type of ['transitionrun', 'transitionend', 'transitioncancel']) {
          document.addEventListener(type, (event) => {
            if (event.target.classList.contains('floe-floating-presence'))
              window.overlayEvents.push({
                type,
                property: event.propertyName,
                classes: event.target.className,
              });
          });
        }
      });
      for (const [size, travel] of [
        ['sm', 12],
        ['md', 16],
        ['lg', 20],
      ]) {
        const input = page.getByRole('switch', { name: `Off ${size}`, exact: true });
        // Each size shares the same controlled signal; exercise both directions.
        for (let repeat = 0; repeat < 2; repeat++) {
          const wasChecked = await input.isChecked();
          const frames = await captureControl(page, input, 'switch');
          report.samples.push({ name, kind: `switch-${size}`, wasChecked, frames });
          check(`${name}: switch ${size} moves continuously ${repeat}`, () => {
            assert.ok(
              frames.filter((f) => f.translate > 0.01 && f.translate < travel - 0.01).length >= 3,
              'at least three intermediate positions'
            );
            assert.equal(frames.at(-1).translate, wasChecked ? 0 : travel);
            for (let i = 1; i < frames.length; i++)
              assert.ok(
                wasChecked
                  ? frames[i].translate <= frames[i - 1].translate + 0.01
                  : frames[i].translate >= frames[i - 1].translate - 0.01,
                'no bounce or snap backwards'
              );
          });
        }
      }
      const group = page.locator('[data-radio-variant="default"]');
      const radio = group.getByRole('radio', { name: 'Cloud', exact: true });
      const radioFrames = await captureControl(page, radio, 'radio');
      report.samples.push({ name, kind: 'radio', frames: radioFrames });
      check(`${name}: radio immediate face and short dot motion`, () => {
        assert.equal(
          radioFrames[0].fill,
          radioFrames.at(-1).fill,
          'selection fill is final in the first frame'
        );
        assert.ok(
          radioFrames.filter((f) => f.scale > 0 && f.scale < 1).length >= 2,
          'dot has intermediate scales'
        );
        assert.equal(radioFrames.find((f) => f.time >= 120).scale, 1, 'dot settles within 120 ms');
      });
      await radio.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');
      const latestRadio = await radio.isChecked();
      check(`${name}: rapid native radio navigation keeps latest choice`, () =>
        assert.equal(latestRadio, true)
      );
      const rapidSwitch = page.getByRole('switch', { name: 'Off md', exact: true });
      await rapidSwitch.focus();
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Space');
        await page.waitForTimeout(25);
      }
      await page.waitForTimeout(170);
      const rapidState = await rapidSwitch.evaluate((el) => ({
        checked: el.checked,
        translate: getComputedStyle(el.nextElementSibling.firstElementChild).translate,
      }));
      check(`${name}: switch reversals finish at the latest native state`, () => {
        assert.equal(rapidState.checked, true);
        assert.equal(parseFloat(rapidState.translate), 16);
      });
      const tab = page.getByRole('tab', { name: 'Activity', exact: true });
      const tabFrames = await captureControl(page, tab, 'tab', 'Enter');
      report.samples.push({ name, kind: 'tab', frames: tabFrames });
      check(`${name}: tab first frame carries final selection`, () => {
        assert.equal(tabFrames[0].selected, 'true');
        assert.equal(tabFrames[0].fill, tabFrames.at(-1).fill);
      });
      await tab.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');
      const latestTab = await tab.getAttribute('aria-selected');
      check(`${name}: rapid keyboard tab selection keeps latest choice`, () =>
        assert.equal(latestTab, 'true')
      );
      for (const id of ['radios', 'checks']) {
        await page
          .locator(`[data-gallery-group="${id}"]`)
          .screenshot({ path: resolve(output, `${entry}-${id}-${mode}-1x.png`) });
      }
      const dotShadow = await group
        .locator('[data-floe-surface-part="radio-dot"]')
        .first()
        .evaluate((el) => getComputedStyle(el).boxShadow);
      check(`${name}: small radio dot is a crisp solid glyph`, () =>
        assert.match(dotShadow, /rgba\(0, 0, 0, 0\)/)
      );
      for (const [kind, label, selector] of [
        ['menu', 'Component menu', 'floe-floating-menu'],
        ['dialog', 'Open component dialog', 'floe-floating-dialog-panel'],
      ]) {
        await resetOverlayEvents(page);
        await page.getByRole('button', { name: label, exact: true }).click();
        await page.waitForTimeout(280);
        const enter = await overlayEvents(page);
        checkMotion(`${name}/${kind}`, enter, selector, 'enter');
        if (kind === 'dialog') {
          const blur = await page
            .locator('[data-floe-dialog-backdrop]')
            .evaluate((el) => getComputedStyle(el).backdropFilter);
          check(`${name}: dialog backdrop has no full-page blur`, () => assert.equal(blur, 'none'));
          await page.screenshot({ path: resolve(output, `${entry}-dialog-${mode}.png`) });
        }
        await resetOverlayEvents(page);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(250);
        const exit = await overlayEvents(page);
        checkMotion(`${name}/${kind}`, exit, selector, 'exit');
        report.samples.push({ name, kind, enter, exit });
      }
      await resetOverlayEvents(page);
      await page.evaluate(() => window.surfaceFixture.setWindows(true));
      await page.waitForTimeout(300);
      const enter = await overlayEvents(page);
      checkMotion(`${name}/window`, enter, 'floe-floating-window-motion', 'enter');
      const windowContainment = await page
        .locator('[data-floe-geometry-surface="floating-window"]')
        .first()
        .evaluate((el) => ({
          outer: getComputedStyle(el).contain,
          panel: getComputedStyle(el.firstElementChild).contain,
        }));
      check(`${name}: floating window shadow escapes geometry without unclipping content`, () => {
        assert.equal(windowContainment.outer, 'layout style');
        assert.equal(windowContainment.panel, 'paint');
      });
      await page.screenshot({ path: resolve(output, `${entry}-windows-${mode}.png`) });
      await page.evaluate(() => window.surfaceFixture.setWindows(false));
      await page.waitForTimeout(40);
      const reversal = await page.evaluate(() => {
        const panel = document.querySelector('[data-floe-floating-window-surface="true"]');
        const opacity = getComputedStyle(panel).opacity;
        window.surfaceFixture.setWindows(true);
        return {
          opacity,
          resumed: getComputedStyle(panel).opacity,
          state: panel.dataset.floatingPresence,
          samePanel: panel === document.querySelector('[data-floe-floating-window-surface="true"]'),
        };
      });
      check(`${name}: reopening reverses from the current frame without resetting`, () => {
        assert.equal(reversal.samePanel, true);
        assert.equal(reversal.state, 'open');
        assert.ok(Math.abs(Number(reversal.resumed) - Number(reversal.opacity)) < 0.02);
      });
      await page.waitForTimeout(220);
      await resetOverlayEvents(page);
      await page.evaluate(() => window.surfaceFixture.setWindows(false));
      await page.waitForTimeout(250);
      const exit = await overlayEvents(page);
      checkMotion(`${name}/window`, exit, 'floe-floating-window-motion', 'exit');
      report.samples.push({ name, kind: 'window', enter, exit, windowContainment });
      check(`${name}: no browser errors`, () => assert.deepEqual(pageErrors, []));
      await page.close();

      const retina = await runtime.browser.newPage({
        viewport: { width: 1440, height: 1080 },
        deviceScaleFactor: 2,
      });
      await retina.goto(
        `${runtime.baseURL}/current-${entry}/dist/?panel=components&mode=${mode}&surface=soft-neumorphic`
      );
      await retina.waitForTimeout(350);
      for (const id of ['radios', 'checks'])
        await retina
          .locator(`[data-gallery-group="${id}"]`)
          .screenshot({ path: resolve(output, `${entry}-${id}-${mode}-2x.png`) });
      await retina.emulateMedia({ reducedMotion: 'reduce' });
      const reduced = await retina
        .locator('[data-floe-surface-part="switch-thumb"]')
        .first()
        .evaluate((el) => getComputedStyle(el).transitionDuration);
      check(`${name}: reduced motion skips thumb travel animation`, () =>
        assert.equal(reduced, '0s')
      );
      await retina.close();
    }
  }
  completed = true;
} finally {
  await runtime.close();
  report.passed = completed && report.checks.every((c) => c.passed);
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(
  JSON.stringify(
    {
      passed: report.passed,
      checks: report.checks.length,
      failures: report.checks.filter((c) => !c.passed),
      output,
    },
    null,
    2
  )
);
assert.equal(report.passed, true, 'surface motion browser acceptance');
