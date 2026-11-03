/* global window, document, getComputedStyle */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openSurfaceBrowser, openFixture, artifactRoot } from './surface-browser-utils.mjs';

const runtime = await openSurfaceBrowser();
const report = [];
try {
  for (const entry of ['styles', 'tailwind']) {
    const { page, errors } = await openFixture(runtime.browser, runtime.baseURL, 'current', entry);
    await page.evaluate(() => window.surfaceFixture.theme.selectShellTheme('light', 'porcelain-light'));
    await page.waitForTimeout(250);
    const rows = [];
    for (const surface of ['background', 'card', 'sidebar', 'muted']) {
      await page.locator('[data-case="card"]').evaluate((node, surface) => {
        node.style.backgroundColor = 'var(--' + surface + ')';
      }, surface);
      const input = page.getByRole('textbox', { name: 'Workspace name', exact: true });
      await input.evaluate(node => { node.placeholder = 'Search workspaces'; node.blur(); });
      await page.mouse.move(0, 0);
      const idle = await input.evaluate(node => {
        const style = getComputedStyle(node), bounds = node.getBoundingClientRect();
        return { width: bounds.width, height: bounds.height, border: style.borderWidth, padding: style.padding, shadow: style.boxShadow, background: style.backgroundColor };
      });
      await input.focus();
      await page.waitForTimeout(180);
      const sample = await input.evaluate(node => {
        const context = document.createElement('canvas').getContext('2d');
        const paint = (color, behind = [255, 255, 255]) => {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = 'rgb(' + behind.join(',') + ')'; context.fillRect(0, 0, 1, 1);
          context.fillStyle = color; context.fillRect(0, 0, 1, 1);
          return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
        };
        const background = element => element ? paint(getComputedStyle(element).backgroundColor, background(element.parentElement)) : [255, 255, 255];
        const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
        const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
        const style = getComputedStyle(node), fill = background(node), bounds = node.getBoundingClientRect();
        const swatch = document.createElement('span');
        swatch.className = 'text-muted-foreground/60'; swatch.textContent = 'Secondary label';
        node.parentElement.append(swatch);
        const secondaryFill = background(swatch);
        const secondary = contrast(paint(getComputedStyle(swatch).color, secondaryFill), secondaryFill);
        swatch.remove();
        return { text: contrast(paint(style.color, fill), fill), placeholder: contrast(paint(getComputedStyle(node, '::placeholder').color, fill), fill), focus: contrast(paint(style.borderTopColor, fill), fill), secondary,
          geometry: { width: bounds.width, height: bounds.height, border: style.borderWidth, padding: style.padding, shadow: style.boxShadow, background: style.backgroundColor },
        };
      });
      assert.deepEqual(sample.geometry, idle, entry + '/' + surface + ': stable field geometry');
      for (const role of ['text', 'placeholder', 'secondary']) assert.ok(sample[role] >= 4.5, entry + '/' + surface + '/' + role + ': ' + sample[role]);
      assert.ok(sample.focus >= 3, entry + '/' + surface + ': focus');
      rows.push({ surface, ...sample });
    }
    const canvas = await page.locator('.workbench-surface').evaluate(node => {
      const style = getComputedStyle(node);
      return { canvas: style.getPropertyValue('--wb-canvas').trim(), neutral: getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() };
    });
    assert.equal(canvas.canvas.toLowerCase(), canvas.neutral.toLowerCase(), entry + ': porcelain canvas follows its authored surface');
    const input = page.getByRole('textbox', { name: 'Workspace name', exact: true });
    await input.fill('Keep this draft'); await input.evaluate(node => node.setSelectionRange(2, 7));
    await page.evaluate(() => {
      window.surfaceFixture.theme.selectShellTheme('dark', 'classic-dark');
      window.surfaceFixture.theme.setTheme('dark');
    });
    await page.evaluate(() => { window.surfaceFixture.theme.setTheme('light'); });
    assert.equal(await input.inputValue(), 'Keep this draft');
    assert.equal(await input.evaluate(node => document.activeElement === node && node.selectionStart === 2 && node.selectionEnd === 7), true, entry + ': native editing continuity');
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await input.focus();
    const systemFocus = await input.evaluate(node => {
      const style = getComputedStyle(node);
      return { border: style.borderTopColor, fill: style.backgroundColor, width: style.borderTopWidth };
    });
    assert.notEqual(systemFocus.border, systemFocus.fill, entry + ': visible forced-color focus');
    assert.notEqual(systemFocus.width, '0px');
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
    assert.deepEqual(errors, []);
    report.push({ entry, rows, canvas, systemFocus });
    await page.screenshot({ path: resolve(artifactRoot, 'porcelain-' + entry + '.png'), fullPage: true });
    await page.close();
  }
} finally {
  await runtime.close();
  writeFileSync(resolve(artifactRoot, 'porcelain-visibility.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ entries: report.length, surfaces: report.flatMap(r => r.rows).length, report: resolve(artifactRoot, 'porcelain-visibility.json') }, null, 2));
