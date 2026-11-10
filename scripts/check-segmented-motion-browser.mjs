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
    for (const { hasTouch, reducedMotion } of [false, true].flatMap((hasTouch) =>
      ['no-preference', 'reduce'].map((reducedMotion) => ({ hasTouch, reducedMotion }))
    )) {
      const page = await browser.newPage({
        viewport: { width: 700, height: 400 },
        reducedMotion,
        hasTouch,
      });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(server.resolvedUrls.local[0] + 'test/browser/segmented-motion.html');
      await page.waitForFunction(() =>
        document.querySelector('[data-floe-segmented-motion="ready"]')
      );
      await page.evaluate(() => document.fonts.ready);
      // Production CSS minification may serialize 280ms as .28s.
      await page.evaluate(() =>
        document.documentElement.style.setProperty('--floe-duration-slow', '.28s')
      );
      await page.waitForTimeout(250);
      const continuity = await page.evaluate(async () => {
        window.segmented.setValue('directory');
        await new Promise(requestAnimationFrame);
        const pill = document.querySelector('.floe-segmented-control__pill');
        pill.getAnimations().forEach((animation) => {
          animation.pause();
          animation.currentTime = 0;
        });
        const selected = document.querySelector('[aria-checked="true"]');
        const label = selected.querySelector('.floe-segmented-control__label');
        return {
          color: getComputedStyle(label).color,
          rail: getComputedStyle(pill.parentElement).backgroundColor,
          overlays: pill.querySelectorAll('[data-segmented-label]').length,
        };
      });
      assert.equal(
        continuity.overlays,
        3,
        engineName + ': travelling face owns clipped readable labels'
      );
      await page.evaluate(() => {
        window.segmented.setValue('time');
        document.getAnimations().forEach((animation) => animation.finish());
      });
      const result = await page.evaluate(async () => {
        const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
        const pill = document.querySelector('.floe-segmented-control__pill');
        const geometry = () => ({
          labelDeltas: [...pill.querySelectorAll('[data-segmented-label]')].map((label) => {
            const button = [...document.querySelectorAll('.floe-segmented-control__item')].find(
              (button) => button.getAttribute('aria-label') === label.textContent
            );
            return Math.abs(label.getBoundingClientRect().x - button.getBoundingClientRect().x);
          }),
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
        pill
          .querySelector('.floe-segmented-control__ink')
          .getAnimations()
          .forEach((ink) => {
            ink.pause();
            ink.currentTime = 60;
          });
        const early = geometry();
        if (animation) animation.currentTime = 140;
        pill
          .querySelector('.floe-segmented-control__ink')
          .getAnimations()
          .forEach((ink) => {
            ink.currentTime = 140;
          });
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
      for (const sample of [result.early, result.middle])
        assert.ok(
          sample.labelDeltas.every((delta) => delta < 1.1),
          engineName + ': label positions stay fixed during travel ' + JSON.stringify(sample)
        );
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
      // Validate the actually painted ink as well as the native buttons. A hidden
      // native label alone does not prove icon-only presentation inside the face.
      await page.evaluate(() => window.segmented.setWide(false));
      for (const forcedColors of ['none', 'active']) {
        await page.emulateMedia({ forcedColors });
        for (const dark of [false, true]) {
          await page.evaluate(
            (value) => document.documentElement.classList.toggle('dark', value),
            dark
          );
          for (const width of [240, 260, 261, 360, 361, 380, 240]) {
            await page.locator('.segmented-fixture').evaluate((node, value) => {
              node.style.width = `${value}px`;
            }, width);
            for (const value of ['time', 'directory', 'time']) {
              const samples = await page.evaluate(
                async ({ value }) => {
                  const frame = () => new Promise(requestAnimationFrame);
                  await frame();
                  await frame();
                  window.segmented.setValue(value);
                  await frame();
                  const animations = document.getAnimations();
                  animations.forEach((animation) => {
                    animation.pause();
                    animation.currentTime = 140;
                  });
                  const inspect = () =>
                    [...document.querySelectorAll('[data-segmented-label]')].map((ink) => {
                      const button = [...document.querySelectorAll('button[role="radio"]')].find(
                        (node) => node.getAttribute('aria-label') === ink.textContent
                      );
                      const nativeText = button.querySelector('.floe-segmented-control__label');
                      const paintedText = ink.firstElementChild.lastElementChild;
                      const nativeIcon = button.querySelector('svg');
                      const paintedIcon = ink.querySelector('svg');
                      const nativeBounds = nativeIcon?.getBoundingClientRect();
                      const paintedBounds = paintedIcon?.getBoundingClientRect();
                      return {
                        name: button.getAttribute('aria-label'),
                        title: button.title,
                        hidden: getComputedStyle(nativeText).display === 'none',
                        paintedHidden: getComputedStyle(paintedText).display === 'none',
                        iconDelta: nativeBounds
                          ? Math.max(
                              Math.abs(nativeBounds.x - paintedBounds.x),
                              Math.abs(nativeBounds.y - paintedBounds.y)
                            )
                          : 0,
                        hasIcon: !!nativeIcon,
                        ariaHidden: ink.closest('[aria-hidden="true"]') !== null,
                      };
                    });
                  const moving = inspect();
                  // Interrupt at the currently painted position, then settle both layers.
                  window.segmented.setValue(value === 'time' ? 'directory' : 'time');
                  document.getAnimations().forEach((animation) => animation.finish());
                  await frame();
                  await frame();
                  return [...moving, ...inspect()];
                },
                { value }
              );
              for (const sample of samples) {
                const context = `${engineName} ${reducedMotion} touch=${hasTouch} forced=${forcedColors} dark=${dark} width=${width} ${sample.name}`;
                assert.equal(
                  sample.hidden,
                  sample.hasIcon && width <= (hasTouch ? 360 : 260),
                  context + ': compact policy'
                );
                assert.equal(
                  sample.paintedHidden,
                  sample.hidden,
                  context + ': painted and native labels agree'
                );
                assert.ok(
                  sample.iconDelta <= 1.1,
                  context +
                    ': stationary icons align during travel and reversal ' +
                    JSON.stringify(sample)
                );
                assert.equal(
                  sample.title,
                  sample.name,
                  context + ': full accessible name and tooltip'
                );
                assert.equal(
                  sample.ariaHidden,
                  true,
                  context + ': decorative ink stays inaccessible'
                );
              }
            }
          }
        }
      }
      assert.deepEqual(errors, []);
      cases++;
      await page.close();
    }
    await browser.close();
    browser = undefined;
  }
  console.log(
    `PASS segmented motion: ${cases} browser/motion cases, scaled resize, compact native/painted labels, reversal, touch, forced colors and keyboard selection`
  );
} finally {
  await browser?.close();
  await server.close();
}
