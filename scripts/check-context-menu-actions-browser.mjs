/* global document, requestAnimationFrame, window, performance, Element */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, firefox, webkit } from 'playwright';
import solid from 'vite-plugin-solid';
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(require.resolve('vite'));
const { default: tailwind } = await import(require.resolve('@tailwindcss/vite'));
const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
  configFile: false,
  root: root + 'packages/core',
  plugins: [solid(), tailwind()],
  resolve: { dedupe: ['solid-js'] },
  optimizeDeps: {
    entries: ['test/browser/context-menu-actions.html'],
    noDiscovery: true,
    include: ['solid-js', 'solid-js/web', 'solid-js/store', 'clsx', 'tailwind-merge'],
  },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } },
});
const results = [];
const output = root + '.cache/context-menu-actions';
await mkdir(output, { recursive: true });
try {
  await server.listen();
  await server.watcher.close();
  for (const [engine, launcher] of Object.entries(
    process.argv.includes('--all') ? { chromium, firefox, webkit } : { chromium }
  )) {
    const browser = await launcher.launch();
    try {
      for (const width of [390, 1280])
        for (const dark of [false, true]) {
          const page = await browser.newPage({ viewport: { width, height: 844 } });
          const errors = [];
          page.on('pageerror', (e) => errors.push(e.message));
          await page.goto(server.resolvedUrls.local[0] + 'test/browser/context-menu-actions.html');
          await page.evaluate(
            (dark) => document.documentElement.classList.toggle('dark', dark),
            dark
          );
          await page.locator('#blank').click({ button: 'right' });
          const ask = page.getByRole('menuitem', { name: 'Ask assistant' });
          await ask.waitFor();
          assert.equal(await page.getByRole('menu').count(), 1);
          await page.locator('#independent-scroll').evaluate(
            (element) =>
              new Promise((resolve) => {
                element.addEventListener('scroll', () => requestAnimationFrame(resolve), {
                  once: true,
                });
                element.scrollTop = 40;
              })
          );
          assert.equal(await ask.isVisible(), true, 'Independent pane scrolling retains the menu');
          await page.screenshot({
            path: `${output}/${engine}-${width}-${dark ? 'dark' : 'light'}.png`,
          });
          await page.keyboard.press('Enter');
          await page.waitForFunction(() =>
            document.querySelector('#result').textContent.includes('blank')
          );
          await page.locator('#blank').focus();
          await page.keyboard.press('Shift+F10');
          await ask.waitFor();
          await page.keyboard.press('Escape');
          assert.equal(
            await page.locator('#blank').evaluate((el) => el === document.activeElement),
            true
          );
          await page.locator('#local').click({ button: 'right' });
          await ask.waitFor();
          assert.equal(await page.getByRole('menu').count(), 1);
          const icon = await ask.locator('svg').boundingBox();
          assert.ok(
            icon && icon.width > 0 && icon.width <= 16 && icon.height <= 16,
            `Custom menu icon must remain compact: ${JSON.stringify(icon)}`
          );
          await page.getByRole('menuitem', { name: 'Original action' }).click();
          assert.equal(await page.locator('#result').textContent(), 'original');
          await page.locator('#reading').evaluate((el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            const selection = document.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          });
          await page.locator('#reading').click({ button: 'right' });
          await ask.click();
          assert.equal(
            JSON.parse(await page.locator('#result').textContent()).selection,
            'Selected document context'
          );
          await page.getByRole('textbox', { name: 'Editor' }).fill('Undoable text');
          await page.locator('#editor').click({ button: 'right' });
          await page.getByRole('menuitem', { name: 'Select all', exact: true }).click();
          assert.equal(
            await page
              .locator('#editor')
              .evaluate((el) => el.value.slice(el.selectionStart, el.selectionEnd)),
            'Undoable text'
          );
          await page.locator('#remote').click({ button: 'right' });
          assert.equal(await page.getByRole('menu').count(), 0);
          assert.deepEqual(errors, []);
          await page.goto(
            server.resolvedUrls.local[0] + 'test/browser/context-menu-actions.html?viewport'
          );
          await page.locator('#blank').click({ button: 'right', position: { x: 4, y: 40 } });
          await ask.waitFor();
          assert.equal(
            await ask.evaluate((element) => {
              const bounds = element.getBoundingClientRect();
              return element.contains(
                document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
              );
            }),
            true,
            'Global menus remain hit-testable above viewport prompts'
          );
          assert.equal(
            await page
              .getByRole('menu')
              .evaluate((element) => element.closest('[data-floe-dialog-surface-host]')),
            null
          );
          await ask.click();
          assert.ok((await page.locator('#result').textContent()).includes('blank'));
          results.push({ engine, width, dark, passed: true });
          await page.close();
        }
      for (const floating of [true, false]) {
        console.log('Editor menu', engine, floating);
        const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
        await page.goto(
          server.resolvedUrls.local[0] +
            `test/browser/context-menu-actions.html?editor&prompt${floating ? '&floating' : ''}`
        );
        await page.locator('.monaco-editor .view-lines').click();
        await page.keyboard.press('ControlOrMeta+a');
        assert.equal(
          await page.locator('#selection').textContent(),
          '  const selected = true;\n  const untouched = false;',
          'Selection exists before opening the menu'
        );
        await page
          .locator('.monaco-editor .view-lines')
          .click({ button: 'right', position: { x: 100, y: 9 } });
        const menu = page.getByRole('menuitem', { name: 'Ask assistant' });
        const bounds = await menu.boundingBox();
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, {
          steps: 16,
        });
        await menu.click({ delay: 80 });
        await page.waitForFunction(() =>
          document.querySelector('#result').textContent.includes('target')
        );
        assert.equal(
          JSON.parse(await page.locator('#result').textContent()).selection,
          '  const selected = true;\n  const untouched = false;',
          'Editor selection is frozen from its model'
        );
        await page
          .getByRole('textbox', { name: 'Question', exact: true })
          .fill('Retain this question');
        await page
          .locator('.monaco-editor .view-lines')
          .click({ button: 'right', position: { x: 100, y: 9 } });
        const repeatBounds = await menu.boundingBox();
        await page.mouse.move(
          repeatBounds.x + repeatBounds.width / 2,
          repeatBounds.y + repeatBounds.height / 2,
          { steps: 16 }
        );
        await menu.click({ delay: 80 });
        assert.equal(
          await page.locator('#closed').textContent(),
          '0',
          'Shadow menu does not dismiss the live prompt'
        );
        assert.equal(
          await page.getByRole('textbox', { name: 'Question', exact: true }).inputValue(),
          'Retain this question'
        );
        await page.waitForFunction(
          () => document.querySelector('#invocations').textContent === '2'
        );
        assert.equal(
          await page.locator('#invocations').textContent(),
          '2',
          'Each click invokes its action once'
        );
        results.push({ engine, editor: true, floating, passed: true });
        await page.close();
      }
      for (const disabled of [false, true]) {
        console.log('Dragged menu', engine, disabled);
        const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
        await page.goto(
          server.resolvedUrls.local[0] +
            `test/browser/context-menu-actions.html?editor&prompt&floating&long${disabled ? '&disabled' : ''}`
        );
        const editor = page.locator('.monaco-editor');
        await editor.locator('.view-line').filter({ hasText: 'dependency-01' }).click();
        await editor
          .locator('.view-line')
          .filter({ hasText: 'dependency-01' })
          .hover({ position: { x: 10, y: 9 } });
        await page.mouse.wheel(0, 160);
        await page.screenshot({ path: `${output}/${engine}-long-scroll.png` });
        await page.waitForFunction(
          () =>
            [...document.querySelectorAll('.view-lines .view-line')]
              .find((element) => element.textContent.includes('dependency-07'))
              ?.getBoundingClientRect().height > 0
        );
        await page.waitForFunction(
          () =>
            ![...document.querySelectorAll('.view-lines .view-line')].some((element) =>
              element.textContent.includes('module')
            )
        );
        // Start below Monaco's sticky scope header: the first rendered line can be covered.
        const first = editor.locator('.view-lines .view-line').filter({ hasText: 'dependency-10' });
        const last = editor.locator('.view-lines .view-line').filter({ hasText: 'dependency-24' });
        const start = await first.boundingBox();
        const end = await last.boundingBox();
        await page.mouse.move(start.x + 1, start.y + 9);
        await page.mouse.down();
        await page.mouse.move(end.x + 400, end.y + 9, { steps: 36 });
        await page.mouse.up();
        const selected = Array.from(
          { length: 15 },
          (_, index) =>
            `\texample.test/dependency-${String(index + 10).padStart(2, '0')} v1.2.${index + 9}`
        ).join('\n');
        try {
          await page.waitForFunction(
            (expected) => document.querySelector('#selection').textContent === expected,
            selected,
            { timeout: 5000 }
          );
        } catch (error) {
          await page.screenshot({ path: `${output}/${engine}-drag-selection-failure.png` });
          console.log({
            engine,
            start,
            end,
            actual: await page.locator('#selection').textContent(),
          });
          throw error;
        }
        assert.equal(
          await page.locator('#selection').textContent(),
          selected,
          'Real mouse drag captures exact multiline selection'
        );
        await page.evaluate(() => {
          window.menuClicks = [];
          let opened = 0;
          document.addEventListener(
            'contextmenu',
            () => {
              opened = performance.now();
            },
            true
          );
          document.addEventListener(
            'mousedown',
            (event) => {
              if (
                event.button === 0 &&
                event
                  .composedPath()
                  .some(
                    (node) => node instanceof Element && node.getAttribute('role') === 'menuitem'
                  )
              )
                window.menuClicks.push(performance.now() - opened);
            },
            true
          );
        });
        for (const mode of disabled
          ? ['pointer-travel']
          : ['pointer-travel', 'repeat', 'keyboard']) {
          await first.click({ button: 'right', position: { x: 100, y: 9 } });
          const action = page.getByRole('menuitem', { name: 'Ask assistant' });
          if (mode !== 'keyboard') {
            const bounds = await action.boundingBox();
            await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, {
              steps: 16,
            });
          }
          if (mode === 'keyboard') {
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
          } else await action.click({ delay: 80 });
          if (disabled) {
            assert.equal(await page.locator('#invocations').textContent(), '0');
            assert.equal(
              await page.getByRole('textbox', { name: 'Question', exact: true }).count(),
              0
            );
            await page.keyboard.press('Escape');
            continue;
          }
          await page.getByRole('textbox', { name: 'Question', exact: true }).waitFor();
          assert.equal(JSON.parse(await page.locator('#result').textContent()).selection, selected);
          if (mode === 'pointer-travel')
            await page
              .getByRole('textbox', { name: 'Question', exact: true })
              .fill('Keep dragged context draft');
          else
            assert.equal(
              await page.getByRole('textbox', { name: 'Question', exact: true }).inputValue(),
              'Keep dragged context draft'
            );
        }
        if (!disabled) {
          await page.waitForFunction(
            () => document.querySelector('#invocations').textContent === '3'
          );
          assert.equal(await page.locator('#invocations').textContent(), '3');
        }
        const clicks = await page.evaluate(() => window.menuClicks);
        results.push({ engine, dragged: true, disabled, clicks, passed: true });
        await page.screenshot({
          path: `${output}/${engine}-drag-${disabled ? 'disabled' : 'enabled'}.png`,
        });
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }
  await writeFile(output + '/report.json', JSON.stringify(results, null, 2));
  console.log(results);
} finally {
  await server.close();
}
