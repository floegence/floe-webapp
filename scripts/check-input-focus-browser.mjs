/* global window, document, getComputedStyle */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium } from 'playwright';
const root = fileURLToPath(new URL('../packages/core/', import.meta.url));
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: solid } = await import('vite-plugin-solid');
const { default: tailwind } = await import(
  pathToFileURL(require.resolve('@tailwindcss/vite')).href
);
const server = await createServer({
  configFile: false,
  root,
  plugins: [solid(), tailwind()],
  resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0 },
});
await server.listen();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
try {
  await page.goto(
    `http://127.0.0.1:${server.httpServer.address().port}/test/browser/input-focus.html`
  );
  await page.locator('[data-case="text"] input').waitFor();
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; } .host-field { border: 1px solid var(--input); padding: 8px; background:var(--background); }',
  });
  const themes = await page.evaluate(() => window.inputFocusThemes);
  for (const theme of themes) {
    await page.evaluate((theme) => {
      document.documentElement.dataset.floeShellTheme = theme.name;
      document.documentElement.classList.toggle('dark', theme.mode === 'dark');
    }, theme);
    const results = await page.evaluate(() => {
      const snapshot = (el) => {
        const s = getComputedStyle(el),
          r = el.getBoundingClientRect();
        return {
          width: r.width,
          height: r.height,
          border: s.borderWidth,
          padding: s.padding,
          outline: s.outlineStyle,
          outlineWidth: s.outlineWidth,
          shadow: s.boxShadow,
          color: s.borderBottomColor,
        };
      };
      return [...document.querySelectorAll('[data-case]')]
        .filter((el) => !['button', 'switch'].includes(el.dataset.case))
        .map((section) => {
          document.activeElement?.blur();
          const input = section.querySelector('input,textarea,select,button');
          const owner = input.closest('[data-floe-input-surface]') || input;
          const before = snapshot(owner),
            innerBefore = snapshot(input);
          input.focus();
          return {
            name: section.dataset.case,
            before,
            after: snapshot(owner),
            innerBefore,
            innerAfter: snapshot(input),
            focused: document.activeElement === input,
          };
        });
    });
    for (const result of results) {
      const label = `${theme.name}/${result.name}`;
      for (const key of ['width', 'height', 'border', 'padding', 'shadow'])
        assert.equal(result.after[key], result.before[key], `${label}: focus changes ${key}`);
      assert.ok(
        result.after.outline === 'none' || result.after.outlineWidth === '0px',
        `${label}: outer outline`
      );
      assert.ok(
        result.innerAfter.outline === 'none' || result.innerAfter.outlineWidth === '0px',
        `${label}: inner outline`
      );
      assert.equal(
        result.innerAfter.shadow,
        result.innerBefore.shadow,
        `${label}: inner focus shadow`
      );
      if (result.name === 'disabled') assert.equal(result.focused, false, label);
      else assert.equal(result.focused, true, label);
      if (!['disabled', 'invalid', 'aria-invalid', 'number-invalid'].includes(result.name))
        assert.notEqual(result.after.color, result.before.color, `${label}: focus is invisible`);
    }
  }
  await page.locator('[data-case="text"] input').click();
  const selected = await page
    .locator('[data-case="text"] input')
    .evaluate((el) => ({
      outline: getComputedStyle(el).outlineStyle,
      shadow: getComputedStyle(el).boxShadow,
    }));
  assert.equal(selected.outline, 'none');
  await page.keyboard.press('Tab');
  assert.equal(
    await page
      .locator('[data-case="password"] input')
      .evaluate((el) => el === document.activeElement),
    true
  );
  await page.locator('[data-case="button"] button').focus();
  const button = await page
    .locator('[data-case="button"] button')
    .evaluate((el) => getComputedStyle(el).boxShadow);
  assert.notEqual(button, 'none', 'ordinary buttons retain keyboard focus indicators');
  await page.locator('[data-case="switch"] input').focus();
  assert.notEqual(
    await page
      .locator('[data-case="switch"] input')
      .evaluate((el) => getComputedStyle(el.nextElementSibling).boxShadow),
    'none',
    'switch focus remains visible'
  );
  const internal = page.locator('[data-case="number"] button').first();
  await internal.focus();
  assert.equal(
    await internal.evaluate((el) => getComputedStyle(el).boxShadow),
    'none',
    'compound buttons do not add an outer ring'
  );
  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('[data-case="text"] input').focus();
  assert.equal(
    await page
      .locator('[data-case="text"] input')
      .evaluate((el) => getComputedStyle(el).outlineStyle),
    'none'
  );
  for (const name of [
    'text',
    'invalid',
    'aria-invalid',
    'number',
    'number-invalid',
    'select',
    'underline',
  ]) {
    const result = await page.locator(`[data-case="${name}"]`).evaluate((section) => {
      const input = section.querySelector('input,select');
      input.focus();
      const owner = input.closest('[data-floe-input-surface]') || input;
      const probe = document.createElement('div');
      probe.style.borderColor = 'Highlight';
      document.body.append(probe);
      const expected = getComputedStyle(probe).borderBottomColor;
      probe.remove();
      const style = getComputedStyle(owner);
      return { color: style.borderBottomColor, expected, outline: style.outlineStyle };
    });
    assert.equal(result.color, result.expected, `${name}: system focus border`);
    assert.equal(result.outline, 'none');
  }
  await page.emulateMedia({ forcedColors: 'none' });
  const standaloneCSS = readFileSync(new URL('../packages/core/src/styles/input-focus.css', import.meta.url), 'utf8');
  await page.setContent(`<style>${standaloneCSS}
    :root { --ring: rgb(20, 100, 180); --accent: #eee; --accent-foreground: #111; }
    .address { border: 1px solid #888; padding: 8px; }
    input { border: 0; background: transparent; }
  </style><div class="address" data-floe-input-surface><input aria-label="Address" /></div>`);
  await page.locator('input').focus();
  const standalone = await page.locator('.address').evaluate(el => ({border:getComputedStyle(el).borderColor,outline:getComputedStyle(el).outlineStyle}));
  assert.equal(standalone.border, 'rgb(20, 100, 180)');
  assert.equal(standalone.outline, 'none');
  assert.deepEqual(pageErrors, []);
  console.log(JSON.stringify({ themes: themes.length, fields: 17, status: 'passed' }));
} finally {
  await browser.close();
  await server.close();
}
