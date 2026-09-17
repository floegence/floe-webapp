/* global window, document, getComputedStyle, requestAnimationFrame, createImageBitmap, Blob */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openSurfaceBrowser, artifactRoot } from './surface-browser-utils.mjs';

const runtime = await openSurfaceBrowser();
const output = resolve(artifactRoot, 'progress-shimmer');
mkdirSync(output, { recursive: true });
const report = { cases: [], accessibility: [], errors: [], status: 'running' };
function sample() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const color = (value) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data];
  };
  const mix = (a, b, t) => a.slice(0, 3).map((v, i) => v * (1 - t) + b[i] * t);
  const background = (el) => {
    if (!el) return [255, 255, 255];
    const rgba = color(getComputedStyle(el).backgroundColor);
    return mix(background(el.parentElement), rgba, rgba[3] / 255);
  };
  const linear = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const luminance = (rgb) =>
    rgb
      .slice(0, 3)
      .map(linear)
      .reduce((v, c, i) => v + c * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (a, b) =>
    (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  const lab = (rgb) => {
    const [r, g, b] = rgb.slice(0, 3).map(linear);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  };
  return [
    ...document.querySelectorAll('[data-floe-progress-shimmer], .processing-text-shimmer'),
  ].map((el) => {
    const style = getComputedStyle(el);
    const surface = el.dataset.floeProgressShimmer === 'surface';
    const token = (name) => {
      const swatch = document.createElement('span');
      swatch.style.color = `var(${name})`;
      el.append(swatch);
      const result = color(getComputedStyle(swatch).color);
      swatch.remove();
      return result;
    };
    const base = token(surface ? '--floe-progress-surface-base' : '--floe-progress-text-base');
    const peak = token(surface ? '--floe-progress-surface-peak' : '--floe-progress-text-peak');
    const ink = color(style.color);
    const bg = background(el);
    const minimumContrast = Math.min(
      ...Array.from({ length: 33 }, (_, i) =>
        surface ? contrast(ink, mix(base, peak, i / 32)) : contrast(mix(base, peak, i / 32), bg)
      )
    );
    const a = lab(base),
      b = lab(peak);
    const animation = el
      .getAnimations({ subtree: true })
      .find((a) => a.animationName === 'floe-progress-shimmer');
    return {
      name: el.dataset.progressCase,
      base,
      peak,
      luminanceGain: luminance(peak) - luminance(base),
      lightnessGain: b[0] - a[0],
      chromaChange: Math.hypot(b[1], b[2]) - Math.hypot(a[1], a[2]),
      minimumContrast,
      deltaEOK: Math.hypot(...a.map((v, i) => v - b[i])),
      duration: animation?.effect.getTiming().duration,
      animation: !!animation,
      text: el.textContent,
    };
  });
}
try {
  for (const entry of ['styles', 'tailwind']) {
    const page = await runtime.browser.newPage({
      viewport: { width: 900, height: 580 },
      recordVideo: { dir: output, size: { width: 900, height: 580 } },
    });
    page.on('pageerror', (e) => report.errors.push(String(e)));
    await page.goto(`${runtime.baseURL}/current-${entry}/dist/?panel=progress`);
    await page.waitForFunction(() => !!window.progressFixture && !!window.surfaceFixture);
    const themes = await page.evaluate(() =>
      window.surfaceFixture.themes.map(({ name, mode }) => ({ name, mode }))
    );
    for (const material of ['standard', 'soft-neumorphic']) {
      await page.evaluate((v) => window.surfaceFixture.theme.setSurfaceStyle(v), material);
      for (const theme of themes) {
        await page.evaluate(
          (t) => window.surfaceFixture.theme.selectShellTheme(t.mode, t.name),
          theme
        );
        for (const hover of [false, true]) {
          if (hover) await page.locator('[data-progress-case="surface"]').hover();
          else await page.mouse.move(850, 550);
          // Theme and hover transitions must settle before comparing frames.
          // A wall-clock delay can expire before a busy renderer starts them.
          await page.evaluate(async () => {
            await new Promise(requestAnimationFrame);
            await Promise.all(document.getAnimations()
              .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
              .map((animation) => animation.finished.catch(() => {})));
          });
          const values = await page.evaluate(sample);
          report.cases.push({ entry, material, ...theme, hover, values });
          for (const value of values) {
            const label = `${entry}/${material}/${theme.name}/${hover}/${value.name}`;
            assert.equal(value.animation, true, `${label}: has a real running shimmer`);
            assert.ok(value.luminanceGain > 0, `${label}: highlight must brighten, not cast a shadow`);
            assert.ok(value.lightnessGain > 0, `${label}: highlight must increase perceptual lightness`);
            if (value.name === 'surface') assert.ok(value.chromaChange <= 0.005, `${label}: reflection approaches neutral light`);
            assert.equal(value.duration, 2400, `${label}: one shared cadence`);
            assert.ok(
              value.minimumContrast >= 4.5,
              `${label}: contrast ${value.minimumContrast} < 4.5`
            );
            assert.ok(value.deltaEOK >= 0.08, `${label}: deltaEOK ${value.deltaEOK} < 0.08`);
          }
        }
        const freeze = async (time) =>
          page.evaluate((time) => {
            for (const a of document.getAnimations())
              if (a.animationName === 'floe-progress-shimmer') {
                a.pause();
                a.currentTime = time;
              }
          }, time);
        await freeze(0);
        const before = await page.screenshot();
        await freeze(1200);
        const after = await page.screenshot();
        assert.equal(before.equals(after), false, `${theme.name}: sweep changes painted pixels`);
        const changedPixels = await page.evaluate(
          async ({ before, after }) => {
            const frames = await Promise.all(
              [before, after].map(async (bytes) => {
                const bitmap = await createImageBitmap(
                  new Blob([new Uint8Array(bytes)], { type: 'image/png' })
                );
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0);
                bitmap.close();
                return ctx;
              })
            );
            return [
              ...document.querySelectorAll(
                '[data-floe-progress-shimmer], .processing-text-shimmer'
              ),
            ].map((el) => {
              const box = el.getBoundingClientRect();
              const [a, b] = frames.map(
                (ctx) =>
                  ctx.getImageData(
                    Math.ceil(box.x),
                    Math.ceil(box.y),
                    Math.floor(box.width),
                    Math.floor(box.height)
                  ).data
              );
              let changed = 0;
              let brightened = 0;
              let darkened = 0;
              const pixelLuminance = (data, offset) => [0.2126, 0.7152, 0.0722].reduce((sum, weight, channel) => {
                const value = data[offset + channel] / 255;
                return sum + weight * (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
              }, 0);
              let backgroundChanged = 0;
              const isText = el.dataset.floeProgressShimmer !== 'surface';
              if (isText) {
                if (getComputedStyle(el).backgroundClip !== 'text') throw new Error('Text shimmer must clip to glyphs');
                if (getComputedStyle(el, '::before').content !== 'none') throw new Error('Text shimmer must not add a surface');
                for (let i = 0; i < a.length; i += 4) {
                  if (a[i] === a[0] && a[i + 1] === a[1] && a[i + 2] === a[2]
                    && Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 6) backgroundChanged++;
                }
              }
              for (let i = 0; i < a.length; i += 4)
                if (
                  Math.abs(a[i] - b[i]) +
                    Math.abs(a[i + 1] - b[i + 1]) +
                    Math.abs(a[i + 2] - b[i + 2]) >
                  15
                )
                  changed++;
              for (let i = 0; i < a.length; i += 4) {
                const gain = pixelLuminance(b, i) - pixelLuminance(a, i);
                if (gain > 0.003) brightened++;
                if (gain < -0.003) darkened++;
              }
              return { name: el.dataset.progressCase, changed, brightened, darkened, backgroundChanged };
            });
          },
          { before: [...before], after: [...after] }
        );
        for (const value of changedPixels) {
          assert.ok(
            value.changed > 4,
            `${theme.name}/${value.name}: actual glyph or surface paint moves`
          );
          assert.ok(value.brightened > 4, `${theme.name}/${value.name}: actual sweep brightens painted pixels`);
          assert.equal(value.darkened, 0, `${theme.name}/${value.name}: sweep never darkens painted pixels`);
          assert.equal(value.backgroundChanged, 0, `${theme.name}/${value.name}: text flow never paints its surrounding background`);
        }
        report.cases.at(-1).paintedMotion = changedPixels;
        if (['classic-light', 'classic-dark', 'github-light', 'nord'].includes(theme.name)) {
          await page.screenshot({
            path: resolve(output, `${entry}-${material}-${theme.name}.png`),
          });
        }
        await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
      }
    }
    const surface = page.locator('[data-progress-case="surface"]');
    await surface.evaluate(el => { el.disabled = true; });
    assert.equal(await surface.evaluate(el => getComputedStyle(el).opacity), '1', 'busy disabled controls retain readable progress');
    await surface.evaluate(el => { el.disabled = false; });
    await surface.click();
    assert.equal(
      await surface.getAttribute('aria-expanded'),
      'true',
      'sweep preserves pointer interaction'
    );
    await surface.focus();
    await page.keyboard.press('Space');
    assert.equal(
      await surface.getAttribute('aria-expanded'),
      'false',
      'sweep preserves keyboard interaction'
    );
    const continuity = await page.evaluate(async () => {
      const el = document.querySelector('[data-progress-case="status"]');
      const animation = el.getAnimations()[0];
      window.progressFixture.setLabel('Finalizing response…');
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return {
        sameNode: el === document.querySelector('[data-progress-case="status"]'),
        sameAnimation: animation === el.getAnimations()[0],
      };
    });
    assert.deepEqual(continuity, { sameNode: true, sameAnimation: true });
    const selection = await page.evaluate(() => {
      const el = document.querySelector('[data-progress-case="title"]');
      const range = document.createRange(); range.selectNodeContents(el);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      const result = { text: selection.toString(), fill: getComputedStyle(el, '::selection').webkitTextFillColor, expected: el.textContent };
      selection.removeAllRanges(); return result;
    });
    assert.equal(selection.text, selection.expected, 'native selection includes nested text exactly once');
    assert.notEqual(selection.fill, 'rgba(0, 0, 0, 0)', 'selected glyphs remain opaque');
    for (const forcedColors of ['none', 'active']) {
      await page.emulateMedia({ reducedMotion: 'reduce', forcedColors });
      const states = await page
        .locator('[data-floe-progress-shimmer], .processing-text-shimmer')
        .evaluateAll((elements) =>
          elements.map((el) => ({
            animations: el.getAnimations({ subtree: true })
              .filter((animation) => animation.animationName === 'floe-progress-shimmer').length,
            ink: getComputedStyle(el).webkitTextFillColor,
            background: getComputedStyle(el).backgroundImage,
          }))
        );
      for (const state of states) {
        assert.equal(state.animations, 0);
        assert.notEqual(state.ink, 'rgba(0, 0, 0, 0)');
        assert.equal(state.background, 'none');
      }
      report.accessibility.push({ entry, forcedColors, states });
    }
    await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' });
    await page.evaluate(() => window.progressFixture.setActive(false));
    assert.equal(
      await page.locator('[data-floe-progress-shimmer]').count(),
      0,
      'settlement removes only the visual opt-in'
    );
    await page.close();
  }
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
  console.log(`Progress shimmer passed ${report.cases.length} theme/material/hover cases.`);
} catch (error) {
  report.status = 'failed';
  report.failure = String(error.stack || error);
  throw error;
} finally {
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  await runtime.close();
}
