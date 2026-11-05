/* global window, document, getComputedStyle, requestAnimationFrame */
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
  optimizeDeps: { entries: ['test/browser/segmented-motion.html'] },
  resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } },
});
let browser;
let cases = 0;
try {
  await server.listen();
  for (const [engineName, engine] of Object.entries(
    process.argv.includes('--all') ? { chromium, webkit, firefox } : { chromium }
  )) {
    browser = await engine.launch({ headless: true });
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width: 700, height: 400 }, reducedMotion });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(server.resolvedUrls.local[0] + 'test/browser/segmented-motion.html');
      await page.waitForFunction(() =>
        document.querySelector('[data-floe-segmented-motion="ready"]')
      );
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      const result = await page.evaluate(async () => {
        const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
        const pill = document.querySelector('.floe-segmented-control__pill');
        const geometry = () => ({
          x: pill.getBoundingClientRect().x,
          width: pill.getBoundingClientRect().width,
        });
        const initial = geometry();
        window.segmented.setValue('directory');
        void getComputedStyle(pill).transform;
        await frame();
        const animation = pill
          .getAnimations()
          .find((value) => value.id === 'floe-segmented-selection');
        if (animation) {
          animation.pause();
          animation.currentTime = 90;
        }
        const middle = geometry();
        window.segmented.setValue('time');
        const reversal = geometry();
        await frame();
        pill.getAnimations().forEach((value) => value.finish());
        await frame();
        const returned = geometry();
        window.segmented.setValue('directory');
        await frame();
        pill.getAnimations().forEach((value) => value.finish());
        await frame();
        return { initial, middle, reversal, returned, final: geometry(), animated: !!animation };
      });
      if (reducedMotion === 'no-preference') {
        assert.ok(result.animated, engineName + ': travelling face');
        assert.ok(
          result.middle.x > result.initial.x && result.middle.x < result.final.x,
          engineName + ': intermediate geometry'
        );
        assert.ok(
          Math.abs(result.middle.x - result.reversal.x) < 1,
          engineName + ': continuous reversal ' + JSON.stringify(result)
        );
      } else assert.equal(result.animated, false, engineName + ': reduced motion');
      assert.ok(
        Math.abs(result.returned.x - result.initial.x) < 1,
        engineName + ': returns to first slot'
      );
      await page.evaluate(() => {
        window.segmented.setTranslated(true);
        window.segmented.setWide(true);
      });
      await page.waitForTimeout(250);
      const geometry = await page.evaluate(() => {
        const pill = document
          .querySelector('.floe-segmented-control__pill')
          .getBoundingClientRect();
        const selected = document.querySelector('[aria-checked="true"]').getBoundingClientRect();
        return { x: Math.abs(pill.x - selected.x), width: Math.abs(pill.width - selected.width) };
      });
      assert.ok(
        geometry.x <= 1 && geometry.width <= 1,
        engineName + ': translated scaled geometry'
      );
      await page.getByRole('radio', { name: 'Creation time', exact: true }).focus();
      await page.keyboard.press('Space');
      assert.equal(
        await page
          .getByRole('radio', { name: 'Creation time', exact: true })
          .getAttribute('aria-checked'),
        'true'
      );
      assert.equal(
        await page.getByRole('radio', { name: 'Disabled', exact: true }).isDisabled(),
        true
      );
      assert.deepEqual(errors, []);
      cases++;
      await page.close();
    }
    await browser.close();
    browser = undefined;
  }
  console.log(
    `PASS segmented motion: ${cases} browser/motion cases, scaled resize, reversal and keyboard selection`
  );
} finally {
  await browser?.close();
  await server.close();
}
