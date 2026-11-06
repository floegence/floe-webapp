/* global window, document, getComputedStyle, requestAnimationFrame, KeyboardEvent, Event, performance, DOMMatrixReadOnly, DataTransfer, File, DragEvent */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit, firefox } from 'playwright';
import solid from 'vite-plugin-solid';
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(require.resolve('vite'));
const { default: tailwind } = await import(require.resolve('@tailwindcss/vite'));
const root = fileURLToPath(new URL('../', import.meta.url));
const output = root + '.cache/prompt-card';
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  root: root + 'packages/core',
  plugins: [solid(), tailwind()],
  optimizeDeps: { entries: ['test/browser/prompt-card.html'] },
  resolve: { dedupe: ['solid-js'] },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } },
});
const report = [];
let browser;
try {
  await server.listen();
  await server.watcher.close();
  for (const [engine, launcher] of Object.entries(
    process.argv.includes('--all') ? { chromium, webkit, firefox } : { chromium }
  )) {
    browser = await launcher.launch({ headless: true });
    for (const width of [390, 1280])
      for (const dark of [false, true])
        for (const reducedMotion of ['no-preference', 'reduce']) {
          const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await page.goto(server.resolvedUrls.local[0] + 'test/browser/prompt-card.html');
          await page.evaluate((dark) => {
            document.documentElement.classList.toggle('dark', dark);
            document.documentElement.dataset.floeShellTheme = dark
              ? 'porcelain-dark'
              : 'porcelain-light';
          }, dark);
          const card = page.locator('[data-floe-prompt-card]');
          const trigger = page.locator('#trigger');
          for (const top of [160, 780]) {
            await page.evaluate((top) => window.promptCard.setTop(top), top);
            await trigger.evaluate((element) => {
              window.promptFrames = [];
              element.addEventListener(
                'click',
                () => {
                  const start = performance.now();
                  const record = () => {
                    const panel = document.querySelector('[data-floe-prompt-card]');
                    if (!panel) return;
                    const style = getComputedStyle(panel);
                    const matrix = new DOMMatrixReadOnly(style.transform);
                    window.promptFrames.push({
                      time: performance.now() - start,
                      opacity: +style.opacity,
                      y: matrix.m42,
                      scale: matrix.m11,
                      layout: panel.parentElement.getBoundingClientRect().toJSON(),
                    });
                    if (performance.now() - start < 360) requestAnimationFrame(record);
                  };
                  requestAnimationFrame(record);
                },
                { once: true }
              );
            });
            await trigger.focus();
            await trigger.click();
            try {
              await card.waitFor();
            } catch (error) {
              await page.screenshot({
                path: `${output}/opening-failure-${engine}-${width}-${dark}-${reducedMotion}-${top}.png`,
              });
              console.error({
                engine,
                width,
                dark,
                reducedMotion,
                top,
                errors,
                open: await page.evaluate(() =>
                  Boolean(document.querySelector('[data-floe-prompt-card]'))
                ),
              });
              throw error;
            }
            const response = await card.evaluate(async (element) => {
              const editor = element.querySelector('textarea');
              const focused = document.activeElement === editor;
              editor.value = 'Immediate draft';
              editor.dispatchEvent(new Event('input', { bubbles: true }));
              while (element.dataset.floatingPresence === 'entering')
                await new Promise((resolve) => requestAnimationFrame(resolve));
              await Promise.allSettled(
                element.getAnimations().map((animation) => animation.finished)
              );
              return {
                focused,
                draft: editor.value,
                side: element.dataset.floatingSide,
                bounds: element.getBoundingClientRect().toJSON(),
                font: getComputedStyle(editor).fontSize,
                question: !!element.querySelector('.floe-prompt-card-question'),
                referencesAbove:
                  element.querySelector('.floe-prompt-card-references').getBoundingClientRect()
                    .bottom <= editor.getBoundingClientRect().top,
                backgroundImage: getComputedStyle(element).backgroundImage,
                activeSurface: (() => {
                  const probe = document.createElement('div');
                  probe.style.background = 'var(--floe-plane-float)';
                  element.append(probe);
                  const expected = getComputedStyle(probe).backgroundColor;
                  probe.remove();
                  return { actual: getComputedStyle(element).backgroundColor, expected };
                })(),
                reference: (() => {
                  const style = getComputedStyle(
                    element.querySelector('[data-floe-prompt-reference]')
                  );
                  const sample = document.createElement('canvas').getContext('2d');
                  const luminance = (color) => {
                    sample.clearRect(0, 0, 1, 1);
                    sample.fillStyle = color;
                    sample.fillRect(0, 0, 1, 1);
                    const rgba = [...sample.getImageData(0, 0, 1, 1).data];
                    if (rgba[3] !== 255) return null;
                    const [r, g, b] = rgba.map((value) => {
                      const c = value / 255;
                      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
                    });
                    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
                  };
                  const chip = luminance(style.backgroundColor);
                  const card = luminance(getComputedStyle(element).backgroundColor);
                  return {
                    contrast:
                      chip === null
                        ? 0
                        : (Math.max(chip, card) + 0.05) / (Math.min(chip, card) + 0.05),
                    border: style.borderWidth,
                    shadow: style.boxShadow,
                  };
                })(),
                blur: getComputedStyle(element).backdropFilter,
                shadow: getComputedStyle(element).boxShadow,
                willChange: getComputedStyle(element).willChange,
              };
            });
            assert.equal(
              response.focused,
              true,
              `${engine}/${width}/${reducedMotion}: editor is ready while entrance runs`
            );
            assert.equal(response.draft, 'Immediate draft');
            assert.equal(response.side, top === 160 ? 'bottom' : 'top');
            assert.ok(
              response.bounds.width <= 384 && response.bounds.height <= 190,
              JSON.stringify(response)
            );
            assert.ok(
              response.bounds.x >= 7 &&
                response.bounds.right <= width - 7 &&
                response.bounds.bottom <= 892.5,
              JSON.stringify({ engine, width, top, reducedMotion, response })
            );
            assert.equal(response.font, '13px');
            assert.equal(response.question, false);
            assert.equal(response.referencesAbove, true);
            assert.equal(response.backgroundImage, 'none');
            assert.equal(
              response.activeSurface.actual,
              response.activeSurface.expected,
              'active editor uses the clean floating plane'
            );
            assert.notEqual(
              response.shadow,
              'none',
              'neutral elevation separates the active editor'
            );
            assert.ok(
              response.reference.contrast >= 1.12,
              `reference fill separates from the editor: ${JSON.stringify(response.reference)}`
            );
            assert.equal(response.reference.border, '0px');
            assert.equal(response.reference.shadow, 'none');
            assert.deepEqual(
              await card
                .locator('.floe-prompt-card-attach svg path')
                .evaluateAll((paths) => paths.map((path) => path.getAttribute('d'))),
              ['M5 12h14', 'M12 5v14'],
              'attachment action uses the shared plus icon'
            );
            assert.equal(response.blur, 'none');
            assert.equal(
              await card.evaluate((element) => getComputedStyle(element).borderWidth),
              '0px',
              'focus does not introduce a visible outer frame'
            );
            assert.equal(
              await card
                .locator('.floe-prompt-card-field')
                .evaluate((element) => getComputedStyle(element).borderBottomWidth),
              '0px',
              'frameless input has no separator'
            );
            assert.equal(await card.locator('textarea').getAttribute('placeholder'), null);
            await card.locator('textarea').evaluate((element) => element.setSelectionRange(4, 4));
            const model = card.getByRole('combobox', { name: 'Model' });
            await model.click();
            assert.equal(
              await page.getByRole('group', { name: 'Anthropic', exact: true }).count(),
              1
            );
            assert.equal(await page.getByRole('group', { name: 'OpenAI', exact: true }).count(), 1);
            await page.getByRole('searchbox', { name: 'Search models' }).fill('anthropic');
            assert.equal(
              await page.getByRole('option', { name: 'GPT-4.1', exact: true }).count(),
              0
            );
            const search = page.getByRole('searchbox', { name: 'Search models' });
            assert.equal(
              await search.evaluate((element) => document.activeElement === element),
              true
            );
            assert.equal(
              await page
                .getByRole('option', { name: 'Unavailable', exact: true })
                .getAttribute('aria-disabled'),
              'true'
            );
            await search.press('ArrowDown');
            await search.press('Enter');
            assert.equal(await page.evaluate(() => window.promptCard.model()), 'fast');
            assert.equal(
              await card
                .locator('textarea')
                .evaluate((element) => document.activeElement === element),
              true,
              'choosing a model returns to the writing caret'
            );
            assert.equal(
              await card.locator('textarea').evaluate((element) => element.selectionStart),
              4,
              'the original insertion point survives model selection'
            );
            assert.equal(
              await card.getAttribute('aria-hidden'),
              null,
              'model selection belongs to the card'
            );
            await model.click();
            await page.getByRole('searchbox', { name: 'Search models' }).press('Escape');
            assert.equal(
              await model.evaluate((element) => document.activeElement === element),
              true
            );
            assert.equal(await model.getAttribute('aria-expanded'), 'false');
            assert.equal(
              await card.getAttribute('aria-hidden'),
              null,
              'first Escape closes only the model menu'
            );
            await model.click();
            await page.getByRole('searchbox', { name: 'Search models' }).press('Tab');
            assert.equal(
              await card
                .locator('.floe-prompt-card-submit')
                .evaluate((element) => document.activeElement === element),
              true,
              'Tab continues after the model trigger instead of the portal: ' + engine
            );
            await model.click();
            await page.getByRole('searchbox', { name: 'Search models' }).press('Shift+Tab');
            assert.equal(
              await card
                .getByRole('button', { name: 'Capture view' })
                .evaluate((element) => document.activeElement === element),
              true,
              'Shift+Tab continues before the model trigger'
            );
            await card.locator('input[type=file]').setInputFiles({
              name: 'notes.txt',
              mimeType: 'text/plain',
              buffer: Buffer.from('Attached notes'),
            });
            assert.equal(
              await card
                .locator('textarea')
                .evaluate((element) => document.activeElement === element),
              true,
              'adding files returns to the writing caret'
            );
            assert.equal(
              await card.locator('textarea').evaluate((element) => element.selectionStart),
              4
            );
            await card.locator('.floe-prompt-card-attach').focus();
            await card.locator('input[type=file]').dispatchEvent('cancel');
            assert.equal(
              await card
                .locator('textarea')
                .evaluate((element) => document.activeElement === element),
              true,
              'cancelling the file picker resumes editing'
            );
            await card.locator('textarea').evaluate((element) => {
              const paste = new DataTransfer();
              paste.items.add(new File(['image'], 'pasted.png', { type: 'image/png' }));
              const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
              Object.defineProperty(pasteEvent, 'clipboardData', { value: paste });
              element.dispatchEvent(pasteEvent);
              const drop = new DataTransfer();
              drop.items.add(new File(['report'], 'report.csv', { type: 'text/csv' }));
              element.dispatchEvent(
                new DragEvent('drop', { dataTransfer: drop, bubbles: true, cancelable: true })
              );
            });
            assert.deepEqual(
              await page.evaluate(() =>
                window.promptCard
                  .files()
                  .slice(-3)
                  .map((file) => file.name)
              ),
              ['notes.txt', 'pasted.png', 'report.csv']
            );
            await card.locator('textarea').focus();
            assert.ok(
              !response.willChange.includes('transform'),
              'no retained transform promotion'
            );
            const frames = await page.evaluate(() => window.promptFrames);
            if (reducedMotion === 'no-preference') {
              assert.ok(
                frames.some((frame) => frame.opacity > 0 && frame.opacity < 1),
                'entrance paints intermediate opacity'
              );
              assert.ok(
                frames.some((frame) => frame.scale >= 0.975 && frame.scale < 1),
                'restrained scale follows shared presence'
              );
              assert.ok(
                frames.some((frame) => Math.abs(frame.y) >= 6),
                'entrance has a perceptible directional lift before settling'
              );
              const moving = frames.filter((frame) => frame.opacity > 0);
              assert.ok(
                moving.every(
                  (frame) =>
                    Math.abs(frame.layout.x - moving.at(-1).layout.x) < 1 &&
                    Math.abs(frame.layout.y - moving.at(-1).layout.y) < 1
                ),
                'positioning layer stays still during motion'
              );
            }
            const input = card.locator('textarea');
            // Product context menus consume this event. A native WebKit menu
            // would otherwise absorb a later click outside the DOM fixture.
            await page.locator('#outside').evaluate((element) => {
              element.addEventListener('contextmenu', (event) => event.preventDefault(), {
                once: true,
              });
            });
            await page.locator('#outside').click({ button: 'right' });
            assert.equal(
              await card.getAttribute('aria-hidden'),
              null,
              'context-menu invocation preserves the open prompt'
            );
            assert.equal(
              await input.inputValue(),
              await page.evaluate(() => window.promptCard.value())
            );
            await input.evaluate((element) => {
              element.dispatchEvent(new Event('compositionstart', { bubbles: true }));
              element.value = '即时草稿';
              element.dispatchEvent(new Event('compositionupdate', { bubbles: true }));
              element.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })
              );
            });
            assert.equal(await page.evaluate(() => window.promptCard.submits()), 0);
            assert.equal(await page.evaluate(() => window.promptCard.value()), '即时草稿');
            await input.evaluate((element) =>
              element.dispatchEvent(new Event('compositionend', { bubbles: true }))
            );
            await page.locator('#related button').click();
            assert.equal(await card.count(), 1, 'related surface remains owned');
            await page.locator('#related button').focus();
            await page.locator('#related button').press('Escape');
            assert.equal(
              await card.getAttribute('aria-hidden'),
              null,
              'related preview owns Escape'
            );
            await input.focus();
            if (reducedMotion === 'no-preference') {
              const reverse = await card.evaluate((element) => {
                const input = element.querySelector('textarea');
                window.promptCard.setOpen(false);
                const inert = element.inert && element.getAttribute('aria-hidden') === 'true';
                window.promptCard.setOpen(true);
                return {
                  inert,
                  same: input === element.querySelector('textarea'),
                  draft: input.value,
                };
              });
              assert.deepEqual(reverse, { inert: true, same: true, draft: '即时草稿' });
            }
            await input.press('Escape');
            await card.waitFor({ state: 'detached' });
            await page.waitForFunction(
              () => document.activeElement === document.querySelector('#trigger')
            );
            report.push({ engine, width, dark, reducedMotion, top, ...response, frames });
          }
          await trigger.focus();
          await trigger.click();
          await card.waitFor();
          await card.locator('textarea').fill('Submit one request');
          await card.evaluate(async (element) => {
            await Promise.allSettled(
              element.getAnimations().map((animation) => animation.finished)
            );
          });
          const before = await card
            .locator('.floe-prompt-card-submit')
            .evaluate((element) => ({ width: element.offsetWidth, height: element.offsetHeight }));
          const acknowledgement = await card
            .locator('.floe-prompt-card-submit')
            .evaluate((element) => {
              const before = window.promptCard.submits();
              element.click();
              element.click();
              return {
                before,
                after: window.promptCard.submits(),
                busy: element.getAttribute('aria-busy'),
                disabled: element.disabled,
              };
            });
          assert.deepEqual(
            acknowledgement,
            { before: 0, after: 0, busy: 'true', disabled: true },
            'UI acknowledgement precedes host work and duplicate dispatch'
          );
          await page.waitForFunction(() => window.promptCard.submits() === 1);
          assert.equal(
            await card.locator('.floe-prompt-card-submit').getAttribute('aria-busy'),
            'true'
          );
          assert.equal(await card.getByRole('combobox', { name: 'Model' }).isDisabled(), true);
          assert.equal(await card.getByRole('button', { name: 'Attach files' }).isDisabled(), true);
          const after = await card
            .locator('.floe-prompt-card-submit')
            .evaluate((element) => ({ width: element.offsetWidth, height: element.offsetHeight }));
          assert.equal(before.width, after.width);
          assert.equal(before.height, after.height);
          await page.locator('#outside').click();
          assert.equal(await card.count(), 1, 'busy card is retained');
          await page.evaluate(() => {
            window.promptCard.setBusy(false);
            window.promptCard.setFeedback('Unable to send. Your draft is retained.');
          });
          assert.equal(await card.locator('textarea').inputValue(), 'Submit one request');
          await card.getByRole('alert').waitFor();
          await page.screenshot({
            path: `${output}/${engine}-${width}-${dark ? 'dark' : 'light'}-${reducedMotion}.png`,
          });
          await page.locator('#outside').click();
          await card.waitFor({ state: 'detached' });
          assert.equal(
            await page.evaluate(() => window.promptCard.outside()),
            2,
            'outside click reaches its destination'
          );
          assert.equal(
            await trigger.evaluate((element) => element === document.activeElement),
            false,
            'outside click does not steal focus back'
          );
          assert.deepEqual(errors, []);
          await page.close();
        }
    // No explicit point: pointer/keyboard controls and frame-deferred opening
    // retain their own location, including viewport collision placement.
    const contextual = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    for (const query of ['implicit', 'implicit&frame', 'frame']) {
      await contextual.goto(
        server.resolvedUrls.local[0] + 'test/browser/prompt-card.html?' + query
      );
      const trigger = contextual.locator('#trigger');
      await trigger.evaluate((element) => {
        element.style.left = '1090px';
        element.style.top = '700px';
        window.contextualFrames = [];
        element.addEventListener(
          'click',
          () => {
            const start = performance.now();
            const sample = () => {
              const panel = document.querySelector('[data-floe-prompt-card]');
              if (panel) {
                const style = getComputedStyle(panel);
                const matrix = new DOMMatrixReadOnly(style.transform);
                window.contextualFrames.push({
                  time: performance.now() - start,
                  opacity: +style.opacity,
                  y: matrix.m42,
                });
              }
              if (performance.now() - start < 350) requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
          },
          { once: true }
        );
      });
      await trigger.click();
      const panel = contextual.locator('[data-floe-prompt-card]');
      await panel.waitFor();
      await panel.evaluate(async (element) => {
        while (element.dataset.floatingPresence === 'entering')
          await new Promise(requestAnimationFrame);
        await Promise.allSettled(element.getAnimations().map((animation) => animation.finished));
      });
      const geometry = await panel.evaluate((element) => ({
        panel: element.getBoundingClientRect().toJSON(),
        trigger: document.querySelector('#trigger').getBoundingClientRect().toJSON(),
        frames: window.contextualFrames,
      }));
      assert.ok(
        Math.abs(geometry.panel.right - 1268) < 1,
        'right edge clamps without losing the source'
      );
      assert.ok(
        Math.min(
          Math.abs(geometry.panel.top - geometry.trigger.bottom - 8),
          Math.abs(geometry.panel.bottom - geometry.trigger.bottom + 8)
        ) < 1,
        'card stays adjacent to the initiating control: ' + JSON.stringify(geometry)
      );
      assert.ok(
        geometry.frames.some(
          (frame) => frame.opacity > 0 && frame.opacity < 1 && Math.abs(frame.y) > 0.5
        ),
        'frame-deferred entry paints real movement'
      );
      const exit = await panel.evaluate(async (element) => {
        window.promptCard.setOpen(false);
        const frames = [];
        const start = performance.now();
        while (element.isConnected && performance.now() - start < 500) {
          const style = getComputedStyle(element);
          frames.push({
            opacity: +style.opacity,
            y: new DOMMatrixReadOnly(style.transform).m42,
            inert: element.inert,
          });
          await new Promise(requestAnimationFrame);
        }
        return { frames, detached: !element.isConnected };
      });
      assert.ok(exit.detached);
      assert.ok(
        exit.frames.every((frame) => frame.inert),
        'exit immediately releases pointer and keyboard ownership'
      );
      assert.ok(
        exit.frames.some(
          (frame) => frame.opacity > 0 && frame.opacity < 1 && Math.abs(frame.y) >= 1
        ),
        'exit visibly returns toward its source'
      );
      report.push({ engine, scope: query, ...geometry, exit });
    }
    await contextual.close();
    const scoped = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
    });
    await scoped.goto(server.resolvedUrls.local[0] + 'test/browser/prompt-card.html?surface');
    await scoped.locator('#trigger').click();
    const localCard = scoped.locator('[data-floe-prompt-card]');
    await localCard.waitFor();
    const localBounds = await localCard.evaluate((element) => {
      const host = element.closest('main');
      return {
        card: element.getBoundingClientRect().toJSON(),
        host: host?.getBoundingClientRect().toJSON(),
      };
    });
    assert.ok(localBounds.host, 'default portal belongs to the initiating surface');
    assert.ok(
      localBounds.card.left >= localBounds.host.left &&
        localBounds.card.right <= localBounds.host.right
    );
    assert.ok(
      localBounds.card.top >= localBounds.host.top &&
        localBounds.card.bottom <= localBounds.host.bottom
    );
    await localCard.locator('textarea').fill('Draft in a scaled surface');
    await localCard.locator('textarea').press('Escape');
    await localCard.waitFor({ state: 'detached' });
    report.push({ engine, scope: 'scaled-surface', ...localBounds });
    await scoped.close();
    const touch = await browser.newPage({
      viewport: { width: 390, height: 700 },
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    await touch.goto(server.resolvedUrls.local[0] + 'test/browser/prompt-card.html');
    await touch.locator('#trigger').click();
    const touchCard = touch.locator('[data-floe-prompt-card]');
    await touchCard.waitFor();
    const touchMetrics = await touchCard.evaluate((element) => ({
      font: getComputedStyle(element.querySelector('textarea')).fontSize,
      actions: [...element.querySelectorAll('button')].map((button) => ({
        width: button.offsetWidth,
        height: button.offsetHeight,
      })),
    }));
    assert.equal(touchMetrics.font, '16px');
    assert.ok(touchMetrics.actions.every((button) => button.width >= 44 && button.height >= 44));
    report.push({ engine, scope: 'touch', ...touchMetrics });
    await touch.close();
    await browser.close();
    browser = undefined;
  }
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`PromptCard: ${report.length} responsive/theme/motion/placement cases passed.`);
} finally {
  await browser?.close();
  await server.close();
}
