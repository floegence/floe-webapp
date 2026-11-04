/* global window, document, getComputedStyle */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium, webkit, firefox } from 'playwright';
import solid from 'vite-plugin-solid';

const root = fileURLToPath(new URL('../packages/core/', import.meta.url));
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: tailwind } = await import(
  pathToFileURL(require.resolve('@tailwindcss/vite')).href
);
const server = await createServer({
  configFile: false,
  root,
  plugins: [solid(), tailwind()],
  optimizeDeps: { entries: ['test/browser/button-contrast.html'] },
  resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0 },
});
const results = [];
let browser;
try {
  await server.listen();
  for (const [engineName, engine] of Object.entries(
    process.argv.includes('--all') ? { chromium, webkit, firefox } : { chromium }
  )) {
    browser = await engine.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 900, height: 500 },
      reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(server.resolvedUrls.local[0] + 'test/browser/button-contrast.html');
    await page.locator('[data-variant="primary"]').waitFor();
    const themes = await page.evaluate(() => window.buttonThemes);
    for (const theme of themes) {
      await page.evaluate(({ name, mode }) => {
        document.documentElement.dataset.floeShellTheme = name;
        document.documentElement.classList.toggle('dark', mode === 'dark');
        document.documentElement.classList.toggle('light', mode === 'light');
      }, theme);
      for (const variant of ['default', 'primary']) {
        const button = page.locator('[data-variant="' + variant + '"]');
        const read = () =>
          button.evaluate((node) => {
            const style = getComputedStyle(node);
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const luminance = (color) => {
              context.fillStyle = color;
              context.fillRect(0, 0, 1, 1);
              const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data]
                .slice(0, 3)
                .map((value) => {
                  value /= 255;
                  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
                });
              return 0.2126 * r + 0.7152 * g + 0.0722 * b;
            };
            const foreground = luminance(style.color),
              background = luminance(style.backgroundColor);
            return {
              contrast:
                (Math.max(foreground, background) + 0.05) /
                (Math.min(foreground, background) + 0.05),
              color: style.color,
              background: style.backgroundColor,
              shadow: style.boxShadow,
              focused: document.activeElement === node,
              width: node.getBoundingClientRect().width,
              overflow: node.scrollWidth > node.clientWidth,
            };
          });
        await page.mouse.move(890, 490);
        await button.evaluate((node) => node.blur());
        await page.waitForTimeout(180);
        const idle = await read();
        await button.hover();
        await page.waitForTimeout(180);
        const hover = await read();
        await page.mouse.down();
        const pressed = await read();
        await page.mouse.up();
        await page.mouse.move(890, 490);
        await button.focus();
        await page.waitForTimeout(180);
        const focus = await read();
        results.push({
          engine: engineName,
          theme: theme.name,
          variant,
          idle,
          hover,
          pressed,
          focus,
        });
        for (const [state, sample] of Object.entries({ idle, hover, pressed, focus })) {
          assert(
            sample.contrast >= 4.5,
            engineName + '/' + theme.name + '/' + variant + '/' + state + ': ' + sample.contrast
          );
          assert.equal(sample.overflow, false);
        }
        assert.notEqual(hover.background, idle.background, 'hover remains visible');
        assert.equal(focus.focused, true);
        assert.notEqual(focus.shadow, 'none', 'keyboard focus remains visible');
        assert.equal(focus.width, idle.width, 'focus does not move layout');
      }
    }
    assert.deepEqual(errors, []);
    await browser.close();
    browser = undefined;
  }
} finally {
  await browser?.close();
  await server.close();
  if (process.env.FLOE_BUTTON_CONTRAST_REPORT)
    writeFileSync(process.env.FLOE_BUTTON_CONTRAST_REPORT, JSON.stringify(results, null, 2));
}
console.log(
  JSON.stringify({
    cases: results.length,
    minimumContrast: Math.min(
      ...results.flatMap((r) => [
        r.idle.contrast,
        r.hover.contrast,
        r.pressed.contrast,
        r.focus.contrast,
      ])
    ),
  })
);
