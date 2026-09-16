/* global window, document, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openSurfaceBrowser, artifactRoot } from './surface-browser-utils.mjs';

const version = process.argv.includes('--baseline') ? 'baseline' : 'current';
const runtime = await openSurfaceBrowser();
const output = resolve(artifactRoot, `${version}-selection`);
mkdirSync(output, { recursive: true });
const results = [];
const sample = () => {
  const ctx = document.createElement('canvas').getContext('2d');
  const rgba = (color) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data];
  };
  const mix = (a, b) => a.slice(0, 3).map((v, i) => (v * a[3]) / 255 + b[i] * (1 - a[3] / 255));
  const background = (el) => {
    if (!el) return [255, 255, 255];
    return mix(rgba(getComputedStyle(el).backgroundColor), background(el.parentElement));
  };
  const luminance = (rgb) =>
    rgb
      .map((v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (a, b) => {
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  return [
    ...document.querySelectorAll(
      '[aria-label="Time range"] [aria-checked="true"], [data-floe-choice-variant="button"][data-floe-selected="true"]'
    ),
  ].map((el) => {
    const style = getComputedStyle(el);
    const bg = background(el);
    const parent = background(el.parentElement);
    return {
      control: el.textContent.trim(),
      text: contrast(mix(rgba(style.color), bg), bg),
      selection: contrast(bg, parent),
      background: style.backgroundColor,
      color: style.color,
      shadow: style.boxShadow,
    };
  });
};
try {
  for (const entry of ['styles', 'tailwind']) {
    const page = await runtime.browser.newPage({ viewport: { width: 1440, height: 1080 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      `${runtime.baseURL}/${version}-${entry}/dist/?panel=components&surface=standard`
    );
    await page.waitForFunction(() => !!window.surfaceFixture);
    const themes = await page.evaluate(() =>
      window.surfaceFixture.themes.map(({ name, mode }) => ({ name, mode }))
    );
    for (const surface of ['standard', 'soft-neumorphic']) {
      await page.evaluate((value) => window.surfaceFixture.theme.setSurfaceStyle(value), surface);
      for (const theme of themes) {
        await page.evaluate(
          (value) => window.surfaceFixture.theme.selectShellTheme(value.mode, value.name),
          theme
        );
        await page.waitForTimeout(150);
        const controls = await page.evaluate(sample);
        const failures = controls.flatMap((control) => [
          ...(control.text < 4.5 ? [`${control.control}: selected text < 4.5:1`] : []),
          ...(control.selection < 3 ? [`${control.control}: selected fill < 3:1`] : []),
        ]);
        assert.equal(controls.length, 3, 'segment, radio button and checkbox button are measured');
        const selected = page.getByRole('radio', { name: 'Day', exact: true });
        await selected.hover();
        await page.waitForTimeout(140);
        assert.deepEqual(
          await page.evaluate(sample),
          controls,
          'hover preserves the selected appearance'
        );
        await page.mouse.move(0, 0);
        results.push({ entry, surface, ...theme, controls, failures });
        await page.screenshot({ path: resolve(output, `${entry}-${surface}-${theme.name}.png`) });
      }
    }
    for (const surface of ['standard', 'soft-neumorphic']) {
      await page.evaluate((value) => window.surfaceFixture.theme.setSurfaceStyle(value), surface);
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      const forced = await page.evaluate(sample);
      assert.ok(
        forced.every((control) => control.text >= 4.5 && control.selection >= 3),
        `${entry}/${surface}: system colors preserve selected text and fill contrast`
      );
    }
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
    const day = page.getByRole('radio', { name: 'Day', exact: true });
    const week = page.getByRole('radio', { name: 'Week', exact: true });
    await week.focus();
    await page.keyboard.press('Space');
    assert.equal(await week.getAttribute('aria-checked'), 'true');
    await day.click();
    assert.equal(await day.getAttribute('aria-checked'), 'true');
    assert.equal(await page.getByRole('radio', { name: 'Year', exact: true }).isDisabled(), true);
    await page.locator('[data-radio-variant="button"] label').filter({ hasText: 'Cloud' }).click();
    assert.equal(
      await page.getByRole('radio', { name: 'Cloud', exact: true }).nth(1).isChecked(),
      true
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await runtime.close();
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(results, null, 2));
}
const failures = results.filter((row) => row.failures.length);
console.log(JSON.stringify({ cases: results.length, failedCases: failures.length, output }));
assert.equal(
  failures.length,
  0,
  'compact selections must remain readable and clearly distinct in every theme and material'
);
