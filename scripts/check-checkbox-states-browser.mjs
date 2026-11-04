/* global window, document, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, webkit, firefox } from 'playwright';
import { artifactRoot, openSurfaceBrowser } from './surface-browser-utils.mjs';

const version = process.env.FLOE_CHECKBOX_VERSION ?? 'current';
const runtime = await openSurfaceBrowser();
const output = resolve(artifactRoot, 'checkbox-states-' + version);
mkdirSync(output, { recursive: true });
const report = [];
function sample() {
  const context = document.createElement('canvas').getContext('2d');
  const paint = (color, behind = [255, 255, 255]) => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = 'rgb(' + behind.join(',') + ')'; context.fillRect(0, 0, 1, 1);
    context.fillStyle = color; context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
  };
  const background = node => node ? paint(getComputedStyle(node).backgroundColor, background(node.parentElement)) : [255, 255, 255];
  const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
  return [...document.querySelectorAll('[data-checkbox-case]')].map(node => {
    const input = node.querySelector('input'), face = node.querySelector('[data-floe-surface-part="indicator"]');
    const style = getComputedStyle(face), rect = face.getBoundingClientRect(), glyph = face.querySelector('svg');
    const outside = background(face.parentElement), fill = background(face);
    return { state: node.dataset.checkboxCase, size: node.dataset.checkboxSize, checked: input.checked, mixed: input.indeterminate,
      aria: input.getAttribute('aria-checked'), fill: style.backgroundColor, border: style.borderTopColor, borderWidth: style.borderTopWidth,
      edgeContrast: contrast(paint(style.borderTopColor, fill), outside), fillContrast: contrast(fill, outside),
      markContrast: glyph ? contrast(paint(getComputedStyle(glyph).color, fill), fill) : null,
      path: glyph?.querySelector('path')?.getAttribute('d') ?? null, width: rect.width, height: rect.height };
  });
}
function check(rows, label) {
  assert.equal(rows.length, 60, label);
  for (const row of rows) {
    const enabled = !row.state.startsWith('disabled');
    assert.equal(row.width, { sm: 14, md: 16, lg: 20 }[row.size], label + ' fixed width');
    assert.equal(row.height, row.width, label + ' square');
    if (row.state.endsWith('unchecked')) {
      assert.equal(row.fill, 'rgba(0, 0, 0, 0)', label + ': unchecked must be hollow');
      assert.equal(row.borderWidth, '1px', label + ' hairline');
      assert.equal(row.path, null, label + ': unchecked has no mark');
      assert.equal(row.aria, 'false');
      if (enabled) assert.ok(row.edgeContrast >= 3, label + ' unchecked boundary ' + row.edgeContrast);
    } else {
      assert.ok(row.path, label + ': selected has a mark');
      if (enabled) {
        assert.ok(row.fillContrast >= 3, label + ' selected face ' + row.fillContrast);
        assert.ok(row.markContrast >= 3, label + ' selected mark ' + row.markContrast);
      }
      assert.equal(row.aria, row.state === 'mixed' ? 'mixed' : 'true');
      assert.equal(row.path, row.state === 'mixed' ? 'M2 6h8' : 'M2 6l3 3 5-6');
    }
  }
}
try {
  const engines = process.argv.includes('--all') ? { chromium, webkit, firefox } : { chromium };
  for (const [engine, browserType] of Object.entries(engines)) {
    const browser = engine === 'chromium' ? runtime.browser : await browserType.launch({ headless: true });
    try {
      for (const entry of ['styles', 'tailwind']) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.goto(`${runtime.baseURL}/${version}-${entry}/dist/?panel=checkboxes`);
        await page.waitForFunction(() => !!window.surfaceFixture);
        const themes = await page.evaluate(() => window.surfaceFixture.themes.map(p => ({ name: p.name, mode: p.mode })));
        for (const theme of themes) {
          await page.evaluate(p => { window.surfaceFixture.theme.selectShellTheme(p.mode, p.name); window.surfaceFixture.theme.setTheme(p.mode); }, theme);
          await page.waitForTimeout(160);
          check(await page.evaluate(sample), engine + '/' + entry + '/' + theme.name);
        }
        await page.evaluate(() => { window.surfaceFixture.theme.selectShellTheme('light', 'porcelain-light'); window.surfaceFixture.theme.setTheme('light'); });
        const input = page.getByRole('checkbox', { name: 'Interactive choice', exact: true });
        const label = input.locator('xpath=ancestor::label');
        await page.waitForTimeout(160);
        const before = await label.boundingBox();
        const indicatorBefore = await label.locator('[data-floe-choice-kind="checkbox"]').boundingBox();
        assert.ok(Math.abs(before.y + before.height / 2 - indicatorBefore.y - indicatorBefore.height / 2) <= .5, 'single-line faces center within their native targets');
        await label.hover();
        assert.equal(await label.locator('[data-floe-surface-part="indicator"]').evaluate(n => getComputedStyle(n).backgroundColor), 'rgba(0, 0, 0, 0)');
        await label.click(); assert.equal(await input.isChecked(), true);
        assert.equal(await page.getByLabel('Change count').textContent(), '1');
        await input.focus();
        // Pointer focus is not keyboard focus; Tab back to the choice before measuring.
        await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
        await input.focus();
        assert.ok(await label.locator('[data-floe-surface-part="indicator"]').evaluate(n => parseFloat(getComputedStyle(n).outlineWidth) >= 2 && getComputedStyle(n).outlineStyle !== 'none'), engine + '/' + entry + ' keyboard focus');
        const focus = await label.locator('[data-floe-surface-part="indicator"]').evaluate(n => ({ width: getComputedStyle(n).outlineWidth, style: getComputedStyle(n).outlineStyle }));
        await page.keyboard.press('Space'); assert.equal(await input.isChecked(), false);
        assert.equal(await page.getByLabel('Change count').textContent(), '2');
        assert.deepEqual(await label.boundingBox(), before, 'toggle preserves geometry');
        await page.getByRole('checkbox', { name: 'Read only choice', exact: true }).locator('xpath=ancestor::label').click();
        assert.equal(await page.getByRole('checkbox', { name: 'Read only choice', exact: true }).isChecked(), false);
        assert.equal(await page.getByLabel('Change count').textContent(), '2');
        await page.getByRole('checkbox', { name: 'Group first', exact: true }).locator('xpath=ancestor::label').click();
        assert.equal(await page.getByRole('checkbox', { name: 'Group first', exact: true }).isChecked(), true);
        assert.equal(await page.getByRole('checkbox', { name: 'Group second', exact: true }).isChecked(), false);
        for (const variant of ['card', 'button', 'tile']) {
          const choice = page.getByRole('checkbox', { name: variant + ' choice', exact: true });
          await choice.locator('xpath=ancestor::label').click();
          assert.equal(await choice.isChecked(), true, variant + ' native state');
          assert.equal(await choice.locator('xpath=ancestor::label').getAttribute('data-floe-selected'), 'true');
          await choice.locator('xpath=ancestor::label').click();
          assert.equal(await choice.isChecked(), false, variant + ' clears');
        }
        for (const width of [390, 430, 768, 1440]) {
          await page.setViewportSize({ width, height: 1080 });
          assert.ok((await label.boundingBox()).width >= 24);
          assert.ok((await label.boundingBox()).height >= 24);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
        }
        await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
        const forced = await page.locator('[data-checkbox-case="unchecked"]').first().locator('[data-floe-surface-part="indicator"]').evaluate(n => ({ fill: getComputedStyle(n).backgroundColor, edge: getComputedStyle(n).borderTopColor }));
        assert.notEqual(forced.fill, forced.edge, 'forced colors retain hollow outline');
        await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
        assert.equal(await page.locator('[data-checkbox-case="checked"] svg').first().evaluate(n => getComputedStyle(n).animationName), 'none');
        await page.screenshot({ path: resolve(output, engine + '-' + entry + '-light.png'), fullPage: true });
        await page.evaluate(() => { window.surfaceFixture.theme.selectShellTheme('dark', 'porcelain-dark'); window.surfaceFixture.theme.setTheme('dark'); });
        await page.screenshot({ path: resolve(output, engine + '-' + entry + '-dark.png'), fullPage: true });
        assert.deepEqual(errors, []);
        report.push({ engine, entry, themes: themes.length, focus });
        await page.close();
        // Radio and Switch share material plumbing but keep their published
        // presentation. Compare both faces and geometry against the old pack.
        if (engine === 'chromium') for (const mode of ['light', 'dark']) {
          const faces = [];
          for (const candidate of ['baseline', version]) {
            const probe = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
            await probe.goto(`${runtime.baseURL}/${candidate}-${entry}/dist/?panel=components&mode=${mode}`);
            await probe.waitForFunction(() => !!window.surfaceFixture);
            await probe.waitForTimeout(350);
            faces.push(await probe.locator('[data-floe-surface-part="switch-track"], [data-floe-surface-part="indicator"]:has([data-floe-surface-part="radio-dot"])').evaluateAll(nodes => nodes.map(node => {
              const style = getComputedStyle(node), rect = node.getBoundingClientRect();
              return { fill: style.backgroundColor, edge: style.borderColor, border: style.borderWidth, width: rect.width, height: rect.height };
            })));
            await probe.close();
          }
          assert.deepEqual(faces[1], faces[0], entry + '/' + mode + ' Radio and Switch retain their released faces');
        }
        const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: engine !== 'firefox' });
        const touchPage = await touch.newPage();
        await touchPage.goto(`${runtime.baseURL}/${version}-${entry}/dist/?panel=checkboxes`);
        const touchLabel = touchPage.getByRole('checkbox', { name: 'Interactive choice', exact: true }).locator('xpath=ancestor::label');
        await touchLabel.waitFor(); assert.ok((await touchLabel.boundingBox()).height >= 44, 'touch target is 44px');
        const touchBounds = await touchLabel.boundingBox();
        const touchFace = await touchLabel.locator('[data-floe-choice-kind="checkbox"]').boundingBox();
        assert.ok(Math.abs(touchBounds.y + touchBounds.height / 2 - touchFace.y - touchFace.height / 2) <= .5, 'touch faces center within their native targets');
        await touchLabel.tap(); assert.equal(await touchPage.getByRole('checkbox', { name: 'Interactive choice', exact: true }).isChecked(), true);
        await touchPage.screenshot({ path: resolve(output, engine + '-' + entry + '-touch-2x.png'), fullPage: true });
        await touch.close();
      }
    } finally { if (engine !== 'chromium') await browser.close(); }
  }
} finally {
  await runtime.close();
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ report, output }, null, 2));
