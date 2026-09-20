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
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      `${runtime.baseURL}/current-${entry}/dist/?panel=files&surface=soft-neumorphic`
    );
    await page.waitForFunction(() => !!window.surfaceFixture);
    for (const mode of ['light', 'dark']) {
      await page.evaluate(
        (mode) => window.surfaceFixture.theme.selectShellTheme(mode, `classic-${mode}`),
        mode
      );
      const sample = await page.evaluate(() => {
        const colors = (name) => {
          const svg = document.querySelector(`[data-file-sample="${name}"] svg`);
          return [...svg.querySelectorAll('path,rect,stop')].flatMap((el) => {
            const style = getComputedStyle(el);
            return [style.fill, style.stroke, style.stopColor];
          });
        };
        const kind = (name) =>
          document.querySelector(`[data-file-sample="${name}"] svg`).dataset.fileIconType;
        const styles = (selector) => getComputedStyle(document.querySelector(selector));
        return {
          types: [
            'settings.json',
            'config.yaml',
            'Cargo.toml',
            'Main.swift',
            'Cover.psd',
            'Proposal.docx',
            'Budget.xlsx',
            'Pitch.pptx',
            'Report.wps',
            'App.dmg',
            'App.deb',
          ].map(kind),
          brands: Object.fromEntries(
            [
              'Main.swift',
              'Cover.psd',
              'Proposal.docx',
              'Budget.xlsx',
              'Pitch.pptx',
              'index.ts',
              'app.js',
            ].map((name) => [name, colors(name)])
          ),
          compact: document.querySelector('[data-file-sample="settings.json"] svg[width="16"]')
            .dataset.fileIconSize,
          detailed: document.querySelector('[data-file-sample="settings.json"] svg[width="40"]')
            .dataset.fileIconSize,
          textNodes: document.querySelectorAll('[data-file-icon-type] text').length,
          shadows: [
            '[data-file-study] button',
            '[data-file-study] [data-floe-surface-part="rail"]',
            '[aria-label="Filter files"]',
          ].map((selector) => styles(selector).boxShadow),
        };
      });
      assert.deepEqual(sample.types, [
        'json',
        'yaml',
        'cargo',
        'swift',
        'photoshop',
        'word',
        'excel',
        'powerpoint',
        'wps',
        'dmg',
        'deb',
      ]);
      for (const [name, expected] of Object.entries({
        'Main.swift': 'rgb(240, 81, 56)',
        'Cover.psd': 'rgb(49, 168, 255)',
        'Proposal.docx': 'rgb(43, 87, 154)',
        'Budget.xlsx': 'rgb(33, 115, 70)',
        'Pitch.pptx': 'rgb(183, 71, 42)',
        'index.ts': 'rgb(49, 120, 198)',
        'app.js': 'rgb(247, 223, 30)',
      }))
        assert.ok(
          sample.brands[name].includes(expected),
          `${entry}/${mode}/${name} retains its product color`
        );
      assert.ok(sample.brands['Cover.psd'].includes('rgb(0, 30, 54)'));
      assert.equal(sample.compact, 'compact');
      assert.equal(sample.detailed, 'detailed');
      assert.equal(sample.textNodes, 0);
      for (const shadow of sample.shadows)
        assert.ok(shadow === 'none' || shadow === 'rgba(0, 0, 0, 0) 0px 0px 0px 0px');
      await page.screenshot({ path: resolve(output, `${entry}-${mode}.png`), fullPage: true });
      results.push({ entry, mode, ...sample });
    }
    for (const width of [1440, 760, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${entry}/${width} does not overflow`
      );
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await runtime.close();
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(results, null, 2));
}
console.log(
  `Product palettes and compact/detail artwork passed for both packed CSS entries: ${output}`
);
