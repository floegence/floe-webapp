/* global document, window, getComputedStyle, requestAnimationFrame, DOMMatrixReadOnly */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { chromium, webkit, firefox } from 'playwright';
import solid from 'vite-plugin-solid';
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(require.resolve('vite'));
const { default: tailwind } = await import(require.resolve('@tailwindcss/vite'));
const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
  configFile: false,
  root: root + 'packages/core',
  plugins: [solid(), tailwind()],
  optimizeDeps: { entries: ['test/browser/select-motion.html'] },
  resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } },
});
let browser;
let cases = 0;
try {
  await server.listen();
  for (const [name, engine] of Object.entries(
    process.argv.includes('--all') ? { chromium, webkit, firefox } : { chromium }
  )) {
    browser = await engine.launch({ headless: true });
    for (const width of [390, 1280])
      for (const reducedMotion of ['no-preference', 'reduce']) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(server.resolvedUrls.local[0] + 'test/browser/select-motion.html');
        await page.getByRole('combobox').waitFor();
        for (const kind of ['Select', 'Combobox', 'MultiSelect'])
          for (const top of [200, 800]) {
            await page.evaluate(
              ({ kind, top }) => {
                window.selectMotion.setKind(kind);
                window.selectMotion.setTop(top);
              },
              { kind, top }
            );
            await page.getByRole('combobox').click();
            const panel = page.locator('.floe-floating-menu');
            await panel.waitFor();
            const samples = await panel.evaluate(async (el) => {
              const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
              for (let i = 0; i < 8 && !el.getAnimations().length; i++) await frame();
              const animations = el
                .getAnimations()
                .filter((a) => ['opacity', 'transform'].includes(a.transitionProperty));
              const read = () => ({
                opacity: +getComputedStyle(el).opacity,
                scale: new DOMMatrixReadOnly(getComputedStyle(el).transform).m11,
                bounds: el.parentElement.getBoundingClientRect().toJSON(),
              });
              animations.forEach((a) => {
                a.pause();
                a.currentTime = 0;
              });
              const start = read();
              animations.forEach((a) => {
                a.currentTime = 100;
              });
              const middle = read();
              animations.forEach((a) => a.finish());
              await frame();
              await frame();
              return {
                start,
                middle,
                end: read(),
                side: el.dataset.floatingSide,
                durations: animations.map((a) => a.effect.getTiming().duration),
              };
            });
            const label = `${name}/${width}/${reducedMotion}/${kind}/${top}`;
            assert.equal(samples.side, top === 200 ? 'bottom' : 'top', label + ': collision side');
            assert.equal(samples.end.opacity, 1, label + ': settled opacity');
            assert.equal(samples.end.scale, 1, label + ': sharp content');
            if (reducedMotion === 'reduce')
              assert.ok(
                samples.durations.every((ms) => ms <= 1),
                label + ': reduced motion'
              );
            else {
              assert.ok(
                samples.start.opacity < samples.middle.opacity && samples.middle.opacity < 1,
                label + ': visible fade'
              );
              assert.ok(
                samples.start.scale < samples.middle.scale && samples.middle.scale < 1,
                label + ': subtle shared scale'
              );
              assert.deepEqual(
                samples.start.bounds,
                samples.middle.bounds,
                label + ': stable position layer'
              );
              await page.evaluate(() => {
                window.savedSelectPanel = document.querySelector('.floe-floating-menu');
                window.selectMotion.setOpen(false);
              });
              assert.equal(
                await panel.evaluate((el) => el.inert && el.getAttribute('aria-hidden') === 'true'),
                true,
                label + ': immediate input revocation'
              );
              await page.evaluate(() => window.selectMotion.setOpen(true));
              assert.equal(
                await panel.evaluate((el) => el === window.savedSelectPanel),
                true,
                label + ': reverse same panel'
              );
              await page.waitForTimeout(270);
            }
            await page.evaluate(() => window.selectMotion.setOpen(false));
            await panel.waitFor({ state: 'detached' });
            cases++;
          }
        assert.deepEqual(errors, [], `${name}: console errors`);
        await page.close();
      }
    await browser.close();
    browser = undefined;
  }
  console.log(`Select, Combobox and MultiSelect motion passed: ${cases} browser cases.`);
} finally {
  await browser?.close();
  await server.close();
}
