/* global window, document, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openSurfaceBrowser, artifactRoot } from './surface-browser-utils.mjs';

const runtime = await openSurfaceBrowser();
const output = resolve(artifactRoot, 'file-appearance');
mkdirSync(output, { recursive: true });
const results = [];
try {
  for (const entry of ['styles', 'tailwind']) {
    const page = await runtime.browser.newPage();
    await page.goto(`${runtime.baseURL}/current-${entry}/dist/?panel=files&surface=soft-neumorphic`);
    await page.waitForFunction(() => !!window.surfaceFixture);
    await page.evaluate(() => window.surfaceFixture.theme.selectShellTheme('light', 'porcelain-light'));
    const inspect = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const rgb = (color) => { ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const style = (selector) => getComputedStyle(document.querySelector(selector));
      const icons = {};
      for (const [name, color] of Object.entries({ src: 'hsl(38 92% 50%)', 'README.md': 'oklch(0.65 0.2 25)', 'main.py': 'hsl(217 91% 60%)', 'index.ts': 'hsl(214 26% 17%)', 'app.js': 'hsl(38 92% 50%)', 'photo.png': 'oklch(0.68 0.16 150)', 'song.mp3': 'hsl(217 91% 60%)', 'archive.zip': 'hsl(38 92% 50%)' })) {
        const svg = document.querySelector(`[data-file-sample="${name}"] svg`);
        const stop = svg.querySelector('stop');
        const actual = stop ? getComputedStyle(stop).stopColor : getComputedStyle(svg.querySelector('path[stroke]')).stroke;
        icons[name] = { actual: rgb(actual), expected: rgb(color) };
      }
      const button = style('[data-file-study] button');
      return { icons, buttonBorder: rgb(button.borderColor), inputBorder: rgb(style('[aria-label="Filter files"]').borderColor), buttonShadow: button.boxShadow, railShadow: style('[data-file-study] [data-floe-surface-part="rail"]').boxShadow, fieldShadow: style('[aria-label="Filter files"]').boxShadow };
    };
    const sample = await page.evaluate(inspect);
    results.push({ entry, ...sample });
    await page.screenshot({ path: resolve(output, `${entry}.png`) });
    for (const [name, color] of Object.entries(sample.icons)) assert.deepEqual(color.actual, color.expected, `${entry}/${name}: retain original Classic Light identification color`);
    assert.notDeepEqual(sample.buttonBorder, sample.inputBorder, 'ordinary actions do not borrow the strong input boundary');
    for (const part of ['buttonShadow', 'railShadow', 'fieldShadow']) assert.ok(sample[part] === 'none' || sample[part] === 'rgba(0, 0, 0, 0) 0px 0px 0px 0px', `${entry}/${part}: no second embossed contour`);
    await page.evaluate(() => {
      for (const tone of ['primary', 'warning', 'info', 'success', 'error']) document.documentElement.style.removeProperty(`--floe-file-icon-${tone}`);
    });
    const cssOnly = await page.evaluate(inspect);
    assert.deepEqual(cssOnly.icons, sample.icons, 'generated CSS retains the same colors without inline theme overrides');
    await page.evaluate(() => window.surfaceFixture.theme.selectShellTheme('light', 'classic-light'));
    const otherTheme = await page.evaluate(inspect);
    assert.notDeepEqual(otherTheme.icons.src.actual, sample.icons.src.actual, 'Porcelain icon overrides do not leak when the theme changes');
    await page.close();
  }
} finally {
  await runtime.close();
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(results, null, 2));
}
console.log(`File colors and quiet controls passed for both packed CSS entries: ${output}`);
