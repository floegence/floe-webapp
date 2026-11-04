/* global document, getComputedStyle, window */
import assert from 'node:assert/strict';
import { URL } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { builtInShellThemePresets } from '../packages/core/src/styles/themes/presets.ts';

const css = readFileSync(new URL('../packages/core/dist/styles.css', import.meta.url), 'utf8');
const path = '/workspace/project/src/' + 'deeply-nested-reference/'.repeat(10) + 'ThemeProvider.tsx';
const browser = await chromium.launch({ headless: true, channel: 'chromium' });
let cases = 0;
const porcelain = [];
mkdirSync('.cache/inline-code', { recursive: true });
try {
  const page = await browser.newPage();
  await page.setContent('<main class="chat-container"><section class="chat-message-bubble-assistant"><div class="chat-markdown-block"><p>Inspect <code class="chat-md-inline-code"></code> before continuing.</p></div></section><section class="chat-message-bubble-user"><p>Use <code class="chat-md-inline-code">--theme</code> here.</p></section><pre class="chat-md-code-block"><code>const untouched = true;</code></pre></main>');
  await page.addStyleTag({ content: css });
  await page.addStyleTag({ content: 'body { margin: 16px; background:var(--background); color:var(--foreground); } main { width:100%; max-width:720px; }' });
  await page.locator('.chat-md-inline-code').first().evaluate((node, value) => { node.textContent = value; }, path);
  await page.locator('.chat-markdown-block').evaluate(node => {
    const fixture = document.createElement('div');
    fixture.innerHTML = '<p>确认 <code class="chat-md-inline-code">redeven.com</code> 与 Cloudflare 配置一致。</p><table><thead><tr><th>检查项</th><th>结果</th></tr></thead><tbody><tr><td>状态</td><td>171 条记录均为 <code class="chat-md-inline-code">active</code></td></tr><tr><td>配置</td><td><code class="chat-md-inline-code">naturalfunc.com</code> 已核对；<code class="chat-md-inline-code">redeven.com</code> 已开启 HTTPS</td></tr><tr><td>副作用</td><td>从 <code class="chat-md-inline-code">file://</code> 恢复到安全中心</td></tr></tbody></table>';
    node.append(fixture);
  });
  const fenced = await page.locator('pre').evaluate(node => [getComputedStyle(node).backgroundColor, getComputedStyle(node).color]);
  for (const width of [1000, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const material of ['standard', 'soft-neumorphic']) {
      for (const preset of builtInShellThemePresets) {
        await page.evaluate(({ name, mode, material }) => {
          const root = document.documentElement;
          root.className = mode;
          root.dataset.floeShellTheme = name;
          root.dataset.floeSurfaceStyle = material;
        }, { name: preset.name, mode: preset.mode, material });
        const results = await page.evaluate(() => {
          const context = document.createElement('canvas').getContext('2d');
          const rgb = color => { context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3); };
          const light = color => rgb(color).map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
          const contrast = (a, b) => (Math.max(light(a), light(b)) + .05) / (Math.min(light(a), light(b)) + .05);
          const root = getComputedStyle(document.documentElement);
          return [...document.querySelectorAll('.chat-md-inline-code')].map(node => {
            const style = getComputedStyle(node), selected = getComputedStyle(node, '::selection');
            const range = document.createRange(); range.selectNodeContents(node);
            window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
            return { text: node.textContent, selected: window.getSelection().toString(), color: rgb(style.color), fill: rgb(style.backgroundColor), expectedColor: rgb(root.getPropertyValue('--inline-code-foreground')), expectedFill: rgb(root.getPropertyValue('--inline-code-background')), contrast: contrast(style.color, style.backgroundColor), fillContrast: contrast(style.backgroundColor, root.getPropertyValue('--background')), weight: style.fontWeight, scale: parseFloat(style.fontSize) / parseFloat(getComputedStyle(node.parentElement).fontSize), selectionContrast: contrast(selected.color, selected.backgroundColor), selectionVisible: contrast(selected.backgroundColor, style.backgroundColor), border: style.borderTopWidth, fragments: [...node.getClientRects()].map(rect => ({ left: rect.left, right: rect.right })), available: window.innerWidth };
          });
        });
        for (const result of results) {
          const label = [preset.name, material, width, result.text.slice(0, 20)].join('/');
          assert.deepEqual(result.color, result.expectedColor, label);
          assert.deepEqual(result.fill, result.expectedFill, label);
          assert.ok(result.contrast >= (['hc-light', 'porcelain-light'].includes(preset.name) ? 7 : 4.5), label);
          assert.equal(result.weight, '500', label);
          assert.ok(result.scale >= 0.959, label);
          if (preset.name === 'porcelain-light') {
            assert.ok(result.fillContrast >= 1.14 && result.fillContrast < 1.2, label);
            assert.ok(result.selectionContrast >= 7, label);
          }
          assert.ok(result.selectionContrast >= 4.5 && result.selectionVisible >= 1.5, label);
          assert.equal(result.selected, result.text, label);
          assert.equal(result.border, '0px', label);
          assert.ok(result.fragments.every(rect => rect.left >= 0 && rect.right <= result.available), label);
        }
        if (width === 320) assert.ok(results[0].fragments.length > 1, 'long paths wrap at narrow widths');
        assert.deepEqual(await page.locator('pre').evaluate(node => [getComputedStyle(node).backgroundColor, getComputedStyle(node).color]), fenced);
        if (preset.name === 'porcelain-light') {
          porcelain.push({ width, material, results });
          await page.evaluate(() => window.getSelection().removeAllRanges());
          await page.screenshot({ path: `.cache/inline-code/porcelain-${material}-${width}.png`, fullPage: true });
        }
        cases++;
      }
    }
  }
  await page.emulateMedia({ forcedColors: 'active' });
  const forced = await page.locator('.chat-md-inline-code').first().evaluate(node => {
    const style = getComputedStyle(node), selected = getComputedStyle(node, '::selection');
    const probe = document.createElement('span'); probe.style.cssText = 'color:CanvasText;background:Canvas'; document.body.append(probe);
    const expected = getComputedStyle(probe); const result = { text: style.color === expected.color, fill: style.backgroundColor === expected.backgroundColor, selected: selected.color !== selected.backgroundColor }; probe.remove(); return result;
  });
  assert.deepEqual(forced, { text: true, fill: true, selected: true });
  writeFileSync('.cache/inline-code/porcelain.json', JSON.stringify(porcelain, null, 2));
  console.log('PASS: ' + cases + ' inline-code theme/material/viewport cases, native selection, wrapping, fenced code and forced colors');
} finally {
  await browser.close();
}
