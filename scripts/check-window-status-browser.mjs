/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { openSurfaceBrowser, artifactRoot, repoRoot } from './surface-browser-utils.mjs';
import { builtInShellThemePresets } from '../packages/core/dist/themes.js';
import {
  windowStatusIllustrationSvg,
  windowStatusRefreshSvg,
} from '../packages/core/dist/window-status.js';

function inlineCSS(path) {
  return readFileSync(path, 'utf8').replace(/@import ['"](.+?)['"];?/g, (_, relative) =>
    inlineCSS(resolve(dirname(path), relative))
  );
}
const css = ['standalone', 'window-status']
  .map((name) => inlineCSS(resolve(repoRoot, `packages/core/dist/${name}.css`)))
  .join('\n');
const runtime = await openSurfaceBrowser();
const output = resolve(artifactRoot, 'window-status');
mkdirSync(output, { recursive: true });
const report = [];
try {
  const page = await runtime.browser.newPage();
  for (const theme of builtInShellThemePresets) {
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 390, height: 640 },
    ]) {
      await page.setViewportSize(viewport);
      await page.setContent(
        `<!doctype html><html class="${theme.mode}" data-floe-shell-theme="${theme.name}"><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'none'"><style>${css}</style></head><body><div id="widget">Untouched widget</div><main class="floe-window-status"><section class="floe-window-status__content" aria-labelledby="title">${windowStatusIllustrationSvg('service')}<p class="floe-window-status__identity">Development preview / localhost:3000</p><h1 id="title" class="floe-window-status__title">Reconnecting to the application</h1><p class="floe-window-status__description">Waiting for the service to respond. Your workspace remains available after reconnecting.</p><div class="floe-window-status__activity" role="status"><p class="floe-window-status__label">Connection</p><span data-floe-progress-shimmer="text">正在检查服务状态</span></div><div class="floe-window-status__actions"><button class="floe-window-status__button">${windowStatusRefreshSvg}Retry now</button></div><details class="floe-window-status__details"><summary>Technical details</summary><pre>${'A'.repeat(500)}</pre></details></section></main></body></html>`
      );
      const result = await page.evaluate(() => {
        const root = document.querySelector('main');
        const content = document.querySelector('section');
        const text = document.querySelector('[data-floe-progress-shimmer]');
        return {
          overflow: root.scrollWidth > root.clientWidth,
          contentTop: content.getBoundingClientRect().top,
          blur: getComputedStyle(root).backdropFilter,
          widgetBlur: getComputedStyle(document.querySelector('#widget')).backdropFilter,
          shimmer: getComputedStyle(text).animationName,
          text: text.textContent,
          iconAnimation: getComputedStyle(document.querySelector('button svg')).animationName,
        };
      });
      assert.equal(result.overflow, false);
      assert.ok(result.contentTop >= 0);
      assert.equal(result.blur, 'none');
      assert.equal(result.widgetBlur, 'none');
      assert.equal(result.shimmer, 'floe-progress-shimmer');
      assert.equal(result.text, '正在检查服务状态');
      assert.equal(result.iconAnimation, 'none');
      await page.locator('summary').click();
      assert.equal(
        await page.locator('main').evaluate((el) => el.scrollWidth > el.clientWidth),
        false
      );
      await page.locator('main').evaluate((el) => {
        el.dataset.backdrop = 'workspace';
      });
      assert.equal(
        await page.locator('main').evaluate((el) => getComputedStyle(el).backdropFilter),
        'blur(8px)'
      );
      report.push({ theme: theme.name, viewport, ...result });
      if (theme.name === 'classic-dark' || theme.name === 'classic-light') {
        await page.screenshot({ path: resolve(output, `${theme.name}-${viewport.width}.png`) });
      }
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(
    await page
      .locator('[data-floe-progress-shimmer]')
      .evaluate((el) => getComputedStyle(el).animationName),
    'none'
  );
  await page.emulateMedia({ forcedColors: 'active' });
  assert.equal(
    await page.locator('main').evaluate((el) => getComputedStyle(el).backdropFilter),
    'none'
  );
  writeFileSync(resolve(output, 'acceptance.json'), JSON.stringify(report, null, 2));
  console.log(
    `Window status: ${report.length} theme/viewport cases, reduced motion and forced colors passed`
  );
} finally {
  await runtime.close();
}
