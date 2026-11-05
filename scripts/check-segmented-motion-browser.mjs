/* global window, document, getComputedStyle, requestAnimationFrame, performance */
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
          animation.currentTime = 60;
        }
        const early = geometry();
        if (animation) animation.currentTime = 140;
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
        return {
          initial,
          early,
          middle,
          reversal,
          returned,
          final: geometry(),
          animated: !!animation,
        };
      });
      if (reducedMotion === 'no-preference') {
        assert.ok(result.animated, engineName + ': travelling face');
        const travel = result.final.x - result.initial.x;
        const earlyProgress = (result.early.x - result.initial.x) / travel;
        const middleProgress = (result.middle.x - result.initial.x) / travel;
        assert.ok(
          earlyProgress > 0 && earlyProgress < 0.45,
          engineName + ': visible departure instead of a first-frame jump ' + earlyProgress
        );
        assert.ok(
          middleProgress > 0.25 && middleProgress < 0.85,
          engineName + ': perceptible travel at 140ms ' + middleProgress
        );
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
      await page.waitForTimeout(300);
      await page.evaluate(() => {
        const pill = document.querySelector('.floe-segmented-control__pill');
        window.segmented.frames = new Promise((resolve) => {
          document.addEventListener(
            'click',
            () => {
              const start = performance.now();
              const frames = [];
              const sample = () => {
                frames.push({ t: performance.now() - start, x: pill.getBoundingClientRect().x });
                if (performance.now() - start < 360) requestAnimationFrame(sample);
                else resolve(frames);
              };
              sample();
            },
            { once: true }
          );
        });
      });
      await page.getByRole('radio', { name: 'Working directory', exact: true }).click();
      const frames = await page.evaluate(() => window.segmented.frames);
      const startX = frames[0].x,
        endX = frames.at(-1).x;
      if (reducedMotion === 'no-preference') {
        const travelling = frames.filter((frame) => frame.x > startX + 1 && frame.x < endX - 1);
        assert.ok(travelling.length >= 5, engineName + ': at least five painted travel frames');
        assert.ok(
          travelling.at(-1).t - travelling[0].t >= 100,
          engineName + ': visible sustained travel'
        );
        for (let i = 1; i < frames.length; i++)
          assert.ok(frames[i].x >= frames[i - 1].x - 0.5, engineName + ': monotonic live movement');
      } else assert.ok(frames.every((frame) => Math.abs(frame.x - endX) < 1));
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
