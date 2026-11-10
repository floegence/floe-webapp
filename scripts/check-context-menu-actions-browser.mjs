/* global document, requestAnimationFrame */
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
      if (engine === 'chromium')
        for (const floating of [true, false]) {
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
          // Monaco intentionally arms pointer selection 100 ms after opening.
          await page.waitForTimeout(120);
          await page.getByRole('menuitem', { name: 'Ask assistant' }).click();
          await page.waitForFunction(() =>
            document.querySelector('#result').textContent.includes('target')
          );
          assert.equal(
            JSON.parse(await page.locator('#result').textContent()).selection,
            '  const selected = true;\n  const untouched = false;',
            'Editor selection is frozen from its model'
          );
          await page.getByRole('textbox', { name: 'Question', exact: true }).fill('Retain this question');
          await page.locator('.monaco-editor .view-lines').click({ button: 'right', position: { x: 100, y: 9 } });
          await page.waitForTimeout(120);
          await page.getByRole('menuitem', { name: 'Ask assistant' }).click();
          assert.equal(await page.locator('#closed').textContent(), '0', 'Shadow menu does not dismiss the live prompt');
          assert.equal(await page.getByRole('textbox', { name: 'Question', exact: true }).inputValue(), 'Retain this question');
          results.push({ engine, editor: true, floating, passed: true });
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
