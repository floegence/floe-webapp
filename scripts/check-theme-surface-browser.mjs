/* global window, document, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openSurfaceBrowser, openFixture, artifactRoot } from './surface-browser-utils.mjs';

const version = process.argv.includes('--baseline') ? 'baseline' : 'current';
const runtime = await openSurfaceBrowser();
const output = resolve(artifactRoot, `${version}-theme-matrix`);
mkdirSync(output, { recursive: true });
const results = [];
try {
  const { page } = await openFixture(runtime.browser, runtime.baseURL, version);
  // Measure resting/focused endpoint colors without sampling the transition between them.
  await page.addStyleTag({ content: 'input { transition: none !important; }' });
  const themes = await page.evaluate(() => window.surfaceFixture.themes.map(({ name, mode }) => ({ name, mode })));
  for (const surface of ['standard', 'soft-neumorphic']) {
    await page.evaluate((value) => window.surfaceFixture.theme.setSurfaceStyle(value), surface);
    for (const theme of themes) {
      await page.evaluate((value) => window.surfaceFixture.theme.selectShellTheme(value.mode, value.name), theme);
      await page.waitForTimeout(240);
      const sample = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const luminance = (color) => {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b] = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const contrast = (a, b) => {
          const x = luminance(a), y = luminance(b);
          return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
        };
        const input = document.querySelector('[aria-label="Workspace name"]');
        input.blur();
        const field = getComputedStyle(input);
        const card = getComputedStyle(document.querySelector('[data-case="card"]'));
        const idleBorder = field.borderColor;
        input.focus();
        const focusedBorder = getComputedStyle(input).borderColor;
        const focusedBackground = getComputedStyle(input).backgroundColor;
        input.blur();
        return {
          focusedInputContrast: contrast(focusedBorder, focusedBackground),
          inputContrast: contrast(idleBorder, field.backgroundColor),
          placeholderContrast: contrast(getComputedStyle(input, '::placeholder').color, field.backgroundColor),
          textContrast: contrast(card.color, card.backgroundColor),
          shadow: card.boxShadow,
          background: card.backgroundColor,
        };
      });
      const failures = [];
      if (theme.name === 'porcelain-dark') {
        if (sample.inputContrast < 1.25 || sample.inputContrast >= 2) failures.push('idle field edge outside quiet 1.25–2:1 range');
        if (sample.focusedInputContrast < 3) failures.push('focused field boundary < 3:1');
      } else if (sample.inputContrast < 3) failures.push('control boundary < 3:1');
      if (sample.placeholderContrast < 4.5) failures.push('placeholder < 4.5:1');
      if (sample.textContrast < 4.5) failures.push('body < 4.5:1');
      if (theme.mode === 'dark' && sample.shadow.includes('inset')) failures.push('dark card has inset lighting');
      results.push({ ...theme, surface, ...sample, failures });
      await page.screenshot({ path: resolve(output, `${surface}-${theme.name}.png`) });
    }
  }
  const continuity = await page.evaluate(async () => {
    const input = document.querySelector('[aria-label="Workspace name"]');
    input.value = 'Keep this draft';
    input.focus();
    input.setSelectionRange(2, 7);
    window.surfaceFixture.theme.selectShellTheme('light', 'classic-light');
    await Promise.resolve();
    const colorTransitions = document.documentElement.getAnimations({ subtree: true })
      .filter((animation) => 'transitionProperty' in animation && /color/.test(animation.transitionProperty) && animation.playState === 'running');
    return input === document.querySelector('[aria-label="Workspace name"]') &&
      document.activeElement === input && input.value === 'Keep this draft' &&
      input.selectionStart === 2 && input.selectionEnd === 7 && colorTransitions.length === 0;
  });
  assert.equal(continuity, true, 'theme switch keeps native editing and paints final colors immediately');
} finally {
  await runtime.close();
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(results, null, 2));
}
const failures = results.filter((row) => row.failures.length);
console.log(JSON.stringify({ cases: results.length, failures, output }, null, 2));
assert.equal(failures.length, 0, 'every theme retains readable controls and quiet surfaces');
