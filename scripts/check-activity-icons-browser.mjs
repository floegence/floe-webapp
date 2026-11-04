/* global document, window, getComputedStyle, XMLSerializer, Image */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium, webkit } from 'playwright';

const require = createRequire(new URL('../apps/demo/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = await createServer({ root: fileURLToPath(new URL('../apps/demo/', import.meta.url)), configFile: fileURLToPath(new URL('../apps/demo/vite.config.ts', import.meta.url)), server: { host: '127.0.0.1', port: 0 } });
const artifacts = mkdtempSync(join(tmpdir(), 'floe-activity-icons-'));
const report = [];
await server.listen();
try {
  for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
    const browser = await launcher.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:' + server.httpServer.address().port + '/activity-icons.html');
      const rail = page.getByRole('navigation', { name: 'Desktop activities' });
      const files = rail.getByRole('button', { name: 'files', exact: true });
      await files.waitFor();
      const names = await rail.locator('button').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')).filter(name => name !== 'Plugins'));
      for (const name of names) {
        const button = rail.getByRole('button', { name, exact: true });
        await files.click();
        const before = await button.locator('svg').boundingBox();
        await button.hover();
        if (name !== 'files') assert.equal(await button.locator('svg').getAttribute('data-floe-rail-active'), 'false', name + ': hover must not select');
        await button.focus();
        await page.keyboard.press('Enter');
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
        assert.equal(await button.locator('svg').getAttribute('data-floe-rail-active'), 'true');
        assert.equal(await button.locator('[data-floe-rail-part="solid"]').count(), 1);
        assert.deepEqual(await button.locator('svg').boundingBox(), before, name + ': stable geometry');
      }
      const disclosure = rail.getByRole('button', { name: 'Plugins', exact: true });
      await disclosure.click();
      await page.waitForFunction(() => document.querySelector('[aria-label="Plugins"]')?.getAttribute('aria-expanded') === 'true');
      assert.equal(await disclosure.getAttribute('aria-pressed'), 'false');
      assert.equal(await disclosure.locator('svg').getAttribute('data-floe-rail-active'), 'true');
      await disclosure.click();
      await page.waitForFunction(() => document.querySelector('[aria-label="Plugins"]')?.getAttribute('aria-expanded') === 'false');
      assert.equal(await disclosure.locator('svg').getAttribute('data-floe-rail-active'), 'false');

      const themes = await page.evaluate(() => window.activityIconFixture.presets.map(preset => ({ name: preset.name, mode: preset.mode })));
      const contrasts = [];
      for (const preset of themes) {
        await page.evaluate(({ name, mode }) => {
          const theme = window.activityIconFixture.theme;
          theme.selectShellTheme(mode === 'dark' ? 'dark' : 'light', name);
          theme.setTheme(mode === 'dark' ? 'dark' : 'light');
          window.activityIconFixture.setActive('files');
        }, preset);
        await page.mouse.move(1100, 850);
        await page.waitForTimeout(200);
        const values = await rail.evaluate(nav => {
          const ctx = document.createElement('canvas').getContext('2d');
          const paint = (color, behind = [255, 255, 255]) => {
            ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = 'rgb(' + behind.join(',') + ')'; ctx.fillRect(0, 0, 1, 1);
            ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
          };
          const background = node => node ? paint(getComputedStyle(node).backgroundColor, background(node.parentElement)) : [255, 255, 255];
          const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
          return [...nav.querySelectorAll('button')].map(button => {
            const fill = paint(getComputedStyle(button.querySelector('span')).backgroundColor, background(button));
            const ink = paint(getComputedStyle(button.querySelector('svg')).color, fill);
            return (Math.max(luminance(fill), luminance(ink)) + .05) / (Math.min(luminance(fill), luminance(ink)) + .05);
          });
        });
        assert.ok(Math.min(...values) >= 3, preset.name + ': essential icon ink needs 3:1; got ' + Math.min(...values));
        contrasts.push({ theme: preset.name, minimum: Math.min(...values) });
        if (preset.name === 'porcelain-light' || preset.name === 'classic-dark') await page.screenshot({ path: join(artifacts, engine + '-' + preset.name + '.png'), fullPage: true });
      }
      const masks = await page.locator('[data-icon-pair="globe"] svg').last().evaluate(async svg => {
        const copy = svg.cloneNode(true);
        copy.setAttribute('width', '240'); copy.setAttribute('height', '240'); copy.setAttribute('style', 'color:rgb(35,80,120)');
        const image = new Image(); image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(copy));
        await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 240;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
        return { cutout: ctx.getImageData(120, 120, 1, 1).data[3], solid: ctx.getImageData(160, 160, 1, 1).data[3], ids: [...document.querySelectorAll('mask')].map(node => node.id) };
      });
      assert.equal(masks.cutout, 0, 'selected globe detail must be transparent');
      assert.equal(masks.solid, 255, 'selected globe face must be opaque');
      assert.equal(new Set(masks.ids).size, masks.ids.length, 'each mounted mask has a unique ID');
      await page.setViewportSize({ width: 390, height: 844 });
      const mobile = page.getByRole('navigation', { name: 'Mobile activities' });
      const first = mobile.getByRole('tab', { name: 'launchpad', exact: true });
      await first.focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await mobile.getByRole('tab', { name: 'notes', exact: true }).getAttribute('aria-selected'), 'true');
      assert.equal(await mobile.getByRole('tab', { name: 'notes', exact: true }).locator('svg').getAttribute('data-floe-rail-active'), 'true');
      if (engine === 'chromium') {
        await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
        const visible = await files.locator('svg').evaluate(svg => ({ ink: getComputedStyle(svg).color, stroke: getComputedStyle(svg).stroke, width: svg.getBoundingClientRect().width }));
        assert.equal(visible.stroke, visible.ink); assert.equal(visible.width, 20);
        const selected = await rail.locator('button[aria-pressed="true"]').evaluate(button => ({ ink: getComputedStyle(button.querySelector('svg')).color, surface: getComputedStyle(button).backgroundColor, mask: getComputedStyle(button.querySelector('mask rect')).fill }));
        assert.notEqual(selected.ink, selected.surface);
        assert.equal(selected.mask, 'rgb(255, 255, 255)', 'forced colors preserve the cutout mask');
        await page.screenshot({ path: join(artifacts, 'forced-colors.png'), fullPage: true });
      }
      assert.deepEqual(errors, []);
      report.push({ engine, icons: names.length, contrasts, masks: { cutout: masks.cutout, solid: masks.solid } });
    } finally { await browser.close(); }
  }
} finally { await server.close(); }
writeFileSync(join(artifacts, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ artifacts, report }, null, 2));
