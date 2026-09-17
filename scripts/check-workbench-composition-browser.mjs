/* global window, document, getComputedStyle, requestAnimationFrame, CompositionEvent, InputEvent, KeyboardEvent */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium, webkit } from 'playwright';
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
const output = fileURLToPath(new URL('../.cache/workbench-composition/', import.meta.url));
mkdirSync(output, { recursive: true });
const results = [];
const zoomResults = [];
const focusResults = [];
const menuResults = [];
const interactionsOnly = process.argv.includes('--interactions-only');
try {
  for (const [engine, browserType] of [
    ['chromium-soft', chromium],
    ['webkit-soft', webkit],
    ['chromium-soft-projected', chromium],
    ['webkit-soft-projected', webkit],
    ['chromium', chromium],
    ['webkit', webkit],
    ['chromium-projected', chromium],
    ['webkit-projected', webkit],
  ]) {
    console.log(`Checking ${engine} interactions`);
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const errors = [];
      page.on('crash', () => console.log('Renderer crashed', engine));
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(
        `http://127.0.0.1:${server.httpServer.address().port}/test/browser/workbench-composition.html?projected=${engine.endsWith('projected') ? '1' : '0'}`
      );
      await page.evaluate((soft) => {
        document.documentElement.dataset.floeSurfaceStyle = soft ? 'soft-neumorphic' : 'standard';
      }, engine.includes('soft'));
      const note = page.locator('.workbench-sticky__body');
      await note.waitFor();
      await page.addStyleTag({
        content:
          '*,*::before,*::after { transition: none !important; animation: none !important; }',
      });
      const setMode = async (mode) => {
        if (
          (await page.locator('[data-workbench-mode]').getAttribute('data-workbench-mode')) === mode
        )
          return;
        await page.getByRole('button', { name: 'Switch canvas mode' }).click();
        await page
          .getByRole('menuitemradio', { name: mode === 'work' ? /Work Mode/ : /Composition Mode/ })
          .click();
      };
      // Verify native undo before snapshot-based scenarios replace editor contents.
      // Browser undo histories refer to the original DOM; fixture state resets are not user edits.
      const beforeUndo = await page.evaluate(() => window.workbenchFixture.state());
      await page.evaluate(
        (state) =>
          window.workbenchFixture.setState({
            ...state,
            mode: 'work',
            stickyNotes: state.stickyNotes.map((note) => ({
              ...note,
              title: 'Alpha target omega',
            })),
          }),
        beforeUndo
      );
      const undoEditor = page.getByRole('textbox', { name: 'Sticky note title', exact: true });
      await undoEditor.click();
      await undoEditor.evaluate((el) => {
        const range = document.createRange();
        range.setStart(el.firstChild, 6);
        range.setEnd(el.firstChild, 12);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(range);
      });
      await page.getByRole('button', { name: 'Insert emoji', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Insert emoji 🚀', exact: true }).click();
      assert.equal(await undoEditor.textContent(), 'Alpha 🚀 omega');
      await page.keyboard.press('ControlOrMeta+z');
      assert.equal(
        await undoEditor.textContent(),
        'Alpha target omega',
        'Emoji participates in native undo'
      );
      await page.keyboard.press('Escape');
      await page.evaluate((state) => window.workbenchFixture.setState(state), beforeUndo);
      const beforeIsolation = await page.evaluate(() => window.workbenchFixture.state());
      await setMode('work');
      const noteNode = await note.elementHandle();
      const widgetInput = page.getByRole('textbox', { name: 'Widget input' });
      const inputNode = await widgetInput.elementHandle();
      await widgetInput.fill('Keep widget state');
      await note.click();
      await note.fill('Save when mode changes');
      // A host can switch modes without moving focus; the active draft still commits.
      await page.evaluate(() =>
        window.workbenchFixture.setState((s) => ({
          ...s,
          mode: 'background',
          selectedObject: null,
          selectedWidgetId: null,
        }))
      );
      assert.equal(
        await page.evaluate(() => window.workbenchFixture.state().stickyNotes[0].body),
        'Save when mode changes'
      );
      assert.equal(await note.evaluate((el) => el.isContentEditable), false);
      assert.equal(await note.evaluate((el) => el === document.activeElement), false);
      assert.equal(
        await noteNode.evaluate((el) => el === document.querySelector('.workbench-sticky__body')),
        true
      );
      for (const selector of ['.workbench-sticky', '.workbench-widget']) {
        const object = page.locator(selector);
        assert.ok(
          await object.evaluate((el) => !!el.closest('[inert]')),
          `${selector}: work subtree is inert`
        );
        assert.ok(
          await object.evaluate(
            (el) =>
              Number(
                getComputedStyle(el.querySelector('[class$="__surface"]'), '::after').opacity
              ) > 0.8
          ),
          `${selector}: work object is muted`
        );
        const rect = await object.boundingBox();
        await page.mouse.click(rect.x + 80, rect.y + 65);
        const selection = await page.evaluate(() => window.workbenchFixture.state().selectedObject);
        assert.ok(
          !selection || !['sticky_note', 'widget'].includes(selection.kind),
          'Pointer cannot select work objects'
        );
        await page.mouse.move(rect.x + 80, rect.y + 65);
        await page.mouse.down();
        await page.mouse.move(rect.x + 130, rect.y + 90, { steps: 4 });
        await page.mouse.up();
        await page.mouse.click(rect.x + 80, rect.y + 65, { button: 'right' });
        const target = await page.evaluate(() => window.workbenchFixture.state().selectedObject);
        assert.ok(!target || !['sticky_note', 'widget'].includes(target.kind));
        await page.keyboard.press('Escape');
      }
      // Disabled objects cannot regain keyboard focus or expose a floating editing toolbar.
      await noteNode.evaluate((el) => el.focus());
      await inputNode.evaluate((el) => el.focus());
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('[inert]')), false);
      await page.mouse.click(30, 650);
      for (let i = 0; i < 18; i++) {
        await page.keyboard.press('Tab');
        assert.equal(
          await page.evaluate(() => !!document.activeElement.closest('[inert]')),
          false,
          'Tab skips work content'
        );
      }
      await page.mouse.click(30, 650);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Delete');
      assert.equal(
        await page.evaluate(() => window.workbenchFixture.state().mode),
        'background',
        'Navigation cannot switch back to a work object'
      );
      assert.equal(
        await page.locator('.workbench-composition-toolbar[data-kind="sticky"]').count(),
        0
      );
      const afterIsolation = await page.evaluate(() => window.workbenchFixture.state());
      assert.deepEqual(
        afterIsolation.widgets,
        beforeIsolation.widgets,
        'Work windows cannot be moved or deleted'
      );
      assert.equal(afterIsolation.stickyNotes.length, 1);
      for (const key of ['x', 'y', 'width', 'height'])
        assert.equal(
          afterIsolation.stickyNotes[0][key],
          beforeIsolation.stickyNotes[0][key],
          'Sticky geometry stays locked'
        );
      assert.equal(afterIsolation.stickyNotes[0].body, 'Save when mode changes');
      // Stale externally supplied selection is also safe against destructive shortcuts.
      await page.evaluate(() =>
        window.workbenchFixture.setState((s) => ({
          ...s,
          selectedObject: { kind: 'sticky_note', id: 'note' },
        }))
      );
      await page.keyboard.press('Delete');
      assert.equal(await page.locator('.workbench-sticky').count(), 1);
      await setMode('work');
      assert.equal(await note.evaluate((el) => el.isContentEditable), true);
      assert.equal(
        await inputNode.evaluate(
          (el) => el === document.querySelector('input[aria-label="Widget input"]')
        ),
        true,
        'Mode switching preserves mounted widget content'
      );
      assert.equal(await widgetInput.inputValue(), 'Keep widget state');
      await widgetInput.fill('Work restored');
      await note.click();
      await note.fill('Sticky restored');
      await page.keyboard.press('Escape');
      assert.equal(
        await page.evaluate(() => window.workbenchFixture.state().stickyNotes[0].body),
        'Sticky restored'
      );
      await page.evaluate((state) => window.workbenchFixture.setState(state), beforeIsolation);
      const beforeMenu = await page.evaluate(() => window.workbenchFixture.state());
      for (const [kind, collection, id, first, second, last] of [
        ['sticky_note', 'stickyNotes', 'note', 'tint', 'tab', 'ruled'],
        ['background_layer', 'backgroundLayers', 'region', 'solid', 'frame', 'glass'],
      ]) {
        for (const scale of [0.35, 1]) {
          for (const [x, y] of [
            [20, 80],
            [520, 360],
            [970, 620],
            [970, 740],
          ]) {
            await page.evaluate(
              ({ x, y, scale, kind, collection, id, first }) =>
                window.workbenchFixture.setState((state) => ({
                  ...state,
                  mode: kind === 'sticky_note' ? 'work' : 'background',
                  viewport: { x: 0, y: 0, scale },
                  selectedObject: { kind, id },
                  [collection]: state[collection].map((note) => ({
                    ...note,
                    x: x / scale,
                    y: y / scale,
                    material: first,
                  })),
                })),
              { x, y, scale, kind, collection, id, first }
            );
            // Let the fixture's object transform and anchored layer reach the screen
            // before measuring menu opening. Wall-clock delays can still read the
            // preceding scenario when WebKit defers animation frames under load.
            await page.evaluate(async () => {
              for (let frame = 0; frame < 3; frame++) await new Promise(requestAnimationFrame);
            });
            const geometry = await page.evaluate(async () => {
              const toolbar = document.querySelector('.workbench-composition-toolbar');
              const box = (element) => {
                const rect = element.getBoundingClientRect();
                return [rect.x, rect.y, rect.width, rect.height];
              };
              const before = box(toolbar);
              document.querySelector('.workbench-treatment-trigger').click();
              const frames = [];
              for (let frame = 0; frame < 8; frame++) {
                await new Promise(requestAnimationFrame);
                const panel = document.querySelector('.workbench-treatment-panel');
                frames.push({
                  toolbar: box(toolbar),
                  menu: getComputedStyle(panel).visibility === 'visible' ? box(panel) : null,
                });
              }
              return { before, frames };
            });
            for (const frame of geometry.frames) {
              assert.deepEqual(
                frame.toolbar,
                geometry.before,
                `${engine}/${kind}/${scale}/${x},${y}: opening a material menu keeps the toolbar fixed`
              );
            }
            const visible = geometry.frames
              .filter((frame) => frame.menu)
              .map((frame) => frame.menu);
            assert.ok(visible.length > 0, 'Material menu becomes visible');
            for (const rect of visible) {
              assert.deepEqual(
                rect,
                visible[0],
                'The menu never changes position after its first visible frame'
              );
              assert.ok(
                rect[2] <= 224 && rect[3] <= (kind === 'sticky_note' ? 160 : 340),
                'Material menu stays compact'
              );
              assert.ok(
                rect[0] >= 0 &&
                  rect[0] + rect[2] <= 1280 &&
                  rect[1] >= 0 &&
                  rect[1] + rect[3] <= 800,
                'Material menu stays within the canvas'
              );
            }
            await page.locator('.workbench-treatment-options > button').nth(1).click();
            assert.equal(
              await page.locator('.workbench-treatment-trigger').getAttribute('aria-expanded'),
              'false',
              'Selecting a material closes the menu'
            );
            assert.equal(
              await page.evaluate(
                (collection) => window.workbenchFixture.state()[collection][0].material,
                collection
              ),
              second
            );
            const trigger = page.locator('.workbench-treatment-trigger');
            await trigger.focus();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('End');
            await page.keyboard.press('Enter');
            assert.equal(
              await page.evaluate(
                (collection) => window.workbenchFixture.state()[collection][0].material,
                collection
              ),
              last,
              'Keyboard material selection works'
            );
            if (kind === 'background_layer') {
              if (scale === 1 && x === 520) {
                await trigger.click();
                const opacity = page.getByRole('slider', { name: 'Opacity', exact: true });
                const value = Number(await opacity.inputValue());
                const viewport = await page.evaluate(
                  () => window.workbenchFixture.state().viewport
                );
                await opacity.focus();
                await page.keyboard.press('ArrowLeft');
                assert.equal(
                  Number(await opacity.inputValue()),
                  value - 1,
                  'Slider keeps native arrow key control'
                );
                assert.deepEqual(
                  await page.evaluate(() => window.workbenchFixture.state().viewport),
                  viewport,
                  'Slider does not navigate the canvas'
                );
                await page.keyboard.press('Escape');
                assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
              }
              const region = await page.locator('.workbench-background-region').boundingBox();
              const grip = await page
                .getByRole('button', { name: 'Move region', exact: true })
                .boundingBox();
              assert.ok(
                Math.abs(grip.x + 29 - region.x) <= 1.2 && Math.abs(grip.y - region.y) <= 1.2,
                `Region grip sits outside the left edge, like text: ${JSON.stringify({ region, grip })}`
              );
              assert.ok(Math.abs(grip.width - 22) < 0.1, 'Region grip retains its screen size');
            }
            menuResults.push({ engine, kind, scale, x, y, stableFrames: visible.length });
          }
        }
      }
      await page.evaluate((state) => window.workbenchFixture.setState(state), beforeMenu);
      // Content keeps its world-space layout across zoom, including the former 50% threshold.
      const beforeZoom = await page.evaluate(() => window.workbenchFixture.state());
      await page.evaluate(() =>
        window.workbenchFixture.setState((s) => ({
          ...s,
          selectedObject: { kind: 'background_layer', id: 'region' },
          backgroundLayers: s.backgroundLayers.map((region) => ({ ...region, name: '' })),
        }))
      );
      await page.evaluate(() =>
        window.workbenchFixture.setState((s) => ({
          ...s,
          selectedObject: null,
          viewport: { x: 20, y: 40, scale: 0.35 },
        }))
      );
      await page.evaluate((state) => window.workbenchFixture.setState(state), beforeZoom);
      const readTextGeometry = () =>
        page.evaluate(() =>
          [
            '.workbench-sticky__title',
            '.workbench-sticky__body',
            '.workbench-background-region__label > div',
            '.workbench-text-annotation__content',
          ].map((selector) => {
            const node = document.querySelector(selector);
            const parent = node.closest('[data-wb-object-id]');
            const object = parent.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(node);
            const text = range.getBoundingClientRect();
            return {
              selector,
              x: text.x - object.x,
              y: text.y - object.y,
              width: text.width,
              height: text.height,
              lines: range.getClientRects().length,
              visible: getComputedStyle(node).display !== 'none' && text.height > 0,
            };
          })
        );
      for (const theme of ['paper', 'slate']) {
        await page.evaluate((theme) => {
          document.documentElement.dataset.floeShellTheme = theme;
          document.documentElement.classList.toggle('dark', theme === 'slate');
        }, theme);
        for (const material of ['tint', 'tab', 'ruled']) {
          await page.evaluate(
            (material) =>
              window.workbenchFixture.setState((s) => ({
                ...s,
                selectedObject: null,
                viewport: { x: 16, y: 48, scale: 1 },
                stickyNotes: s.stickyNotes.map((n) => ({
                  ...n,
                  title: 'A stable note title',
                  material,
                })),
              })),
            material
          );
          const baseline = await readTextGeometry();
          for (const scale of [0.8, 0.51, 0.5, 0.49, 0.35, 0.2, 1.5, 2]) {
            await page.evaluate(
              (scale) =>
                window.workbenchFixture.setState((s) => ({
                  ...s,
                  viewport: { ...s.viewport, scale },
                })),
              scale
            );
            const current = await readTextGeometry();
            current.forEach((actual, index) => {
              const expected = baseline[index];
              const label = `${engine}/${theme}/${material}/${scale}/${actual.selector}`;
              assert.equal(actual.visible, true, `${label}: content stays visible`);
              assert.equal(actual.lines, expected.lines, `${label}: wrapping stays stable`);
              for (const dimension of ['x', 'y', 'width', 'height'])
                assert.ok(
                  Math.abs(actual[dimension] - expected[dimension] * scale) <= 1.2,
                  `${label}: ${dimension} scales with canvas (${actual[dimension]} vs ${expected[dimension] * scale})`
                );
            });
            zoomResults.push({ engine, theme, material, scale });
          }
        }
      }
      // Screen-space tools keep their gap above the scaled region label.
      for (const scale of [0.2, 0.5, 1, 2]) {
        await page.evaluate(
          (scale) =>
            window.workbenchFixture.setState((s) => ({
              ...s,
              selectedObject: { kind: 'background_layer', id: 'region' },
              viewport: { x: 250 - 80 * scale, y: 350 - 140 * scale, scale },
            })),
          scale
        );
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        );
        const region = await page.locator('.workbench-background-region').boundingBox();
        const toolbar = await page.locator('.workbench-composition-toolbar').boundingBox();
        assert.ok(
          Math.abs(toolbar.y + toolbar.height + 12 + 34 * scale - region.y) <= 1.2,
          `${engine}/${scale}: toolbar clears the scaled region name`
        );
      }
      await page.evaluate((state) => {
        window.workbenchFixture.setState(state);
        document.documentElement.removeAttribute('data-floe-shell-theme');
        document.documentElement.classList.remove('dark');
      }, beforeZoom);
      // Editing must keep the chosen viewport, even at low zoom or near a clipped edge.
      for (const [label, collection] of [
        ['Sticky note title', 'stickyNotes'],
        ['Sticky note body', 'stickyNotes'],
        ['Canvas text', 'annotations'],
        ['Region name', 'backgroundLayers'],
      ]) {
        for (const scale of [0.35, 0.8, 1.4]) {
          for (const left of [110, 1160]) {
            const viewport = await page.evaluate(
              ({ collection, scale, left }) => {
                const item = window.workbenchFixture.state()[collection][0];
                const viewport = { x: left - item.x * scale, y: 300 - item.y * scale, scale };
                window.workbenchFixture.setState((s) => ({
                  ...s,
                  selectedObject: null,
                  mode: collection === 'stickyNotes' ? 'work' : 'background',
                  viewport,
                  stickyNotes: s.stickyNotes.map((note) => ({ ...note, title: 'Editable title' })),
                }));
                return viewport;
              },
              { collection, scale, left }
            );
            const editor = page.getByRole('textbox', { name: label, exact: true });
            const before = await editor.boundingBox();
            await page.mouse.click(
              before.x + Math.min(10, before.width / 2),
              before.y + Math.min(5, before.height / 2)
            );
            assert.equal(
              await editor.evaluate((el) => document.activeElement === el),
              true,
              `${label}: click places the caret`
            );
            assert.deepEqual(
              await page.evaluate(() => window.workbenchFixture.state().viewport),
              viewport,
              `${engine}/${label}/${scale}/${left}: clicking keeps the viewport`
            );
            const after = await editor.boundingBox();
            assert.ok(
              Math.abs(after.x - before.x) < 1 && Math.abs(after.y - before.y) < 1,
              `${label}: focus preserves the text position`
            );
            await page.keyboard.type('x');
            await page.keyboard.press('Escape');
            assert.deepEqual(
              await page.evaluate(() => window.workbenchFixture.state().viewport),
              viewport,
              `${label}: typing and saving keep the viewport`
            );
            const saved = await editor.boundingBox();
            assert.ok(
              Math.abs(saved.x - before.x) < 1 && Math.abs(saved.y - before.y) < 1,
              `${label}: typing and saving do not scroll the canvas DOM`
            );
            focusResults.push({ engine, label, scale, left });
          }
        }
      }
      // The primary emoji action serves every text field and remembers the native selection.
      for (const [label, collection, field] of [
        ['Sticky note title', 'stickyNotes', 'title'],
        ['Sticky note body', 'stickyNotes', 'body'],
        ['Canvas text', 'annotations', 'text'],
        ['Region name', 'backgroundLayers', 'name'],
      ]) {
        for (const scale of [0.35, 1]) {
          await page.evaluate(
            ({ state, collection, field, scale }) => {
              const object = state[collection][0];
              const next = {
                ...state,
                mode: collection === 'stickyNotes' ? 'work' : 'background',
                selectedObject: null,
                stickyNotes: state.stickyNotes.map((note) => ({
                  ...note,
                  title: 'Editable title',
                })),
                viewport: { x: 520 - object.x * scale, y: 380 - object.y * scale, scale },
              };
              // Start with persisted content so browser typing coalescence cannot merge the fixture setup with emoji insertion.
              next[collection] = next[collection].map((item) => ({
                ...item,
                [field]: 'Alpha target omega',
              }));
              window.workbenchFixture.setState(next);
            },
            { state: beforeZoom, collection, field, scale }
          );
          const editor = page.getByRole('textbox', { name: label, exact: true });
          await editor.click();
          await editor.evaluate((el) => {
            const range = document.createRange();
            range.setStart(el.firstChild, 6);
            range.setEnd(el.firstChild, 12);
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(range);
          });
          const viewport = await page.evaluate(() => window.workbenchFixture.state().viewport);
          const editorBox = await editor.boundingBox();
          const toolbar = page.locator('.workbench-composition-toolbar');
          const trigger = toolbar.getByRole('button', { name: 'Insert emoji', exact: true });
          assert.equal(
            await toolbar.getByRole('button', { name: 'Edit text', exact: true }).count(),
            0
          );
          assert.equal(
            await trigger.evaluate((el) => !!el.closest('.workbench-toolbar-main')),
            true,
            'Emoji is a primary action'
          );
          await page.waitForTimeout(60);
          const toolbarBox = await toolbar.boundingBox();
          await trigger.click();
          const frames = await page.evaluate(async () => {
            const frames = [];
            for (let i = 0; i < 6; i++) {
              await new Promise(requestAnimationFrame);
              const menu = document.querySelector('.workbench-emoji-panel');
              const rect = menu.getBoundingClientRect();
              frames.push([rect.x, rect.y, rect.width, rect.height]);
            }
            return frames;
          });
          for (const rect of frames)
            assert.deepEqual(rect, frames[0], 'Emoji menu never jumps after opening');
          assert.deepEqual(
            await toolbar.boundingBox(),
            toolbarBox,
            'Emoji menu does not resize its toolbar'
          );
          await page.getByRole('menuitem', { name: 'Insert emoji 🚀', exact: true }).click();
          assert.equal(
            await editor.textContent(),
            'Alpha 🚀 omega',
            `${label}: emoji replaces the selected text`
          );
          assert.equal(
            await editor.evaluate((el) => el === document.activeElement),
            true,
            'Insertion restores the field'
          );
          await page.keyboard.press('Shift+ArrowLeft');
          await trigger.click();
          await page.keyboard.press('End');
          await page.keyboard.press('Enter');
          assert.equal(
            await editor.textContent(),
            'Alpha 🎉 omega',
            `${engine}/${label}/${scale}: keyboard choice restores the same selection`
          );
          await page.keyboard.type('!');
          await page.keyboard.press('Escape');
          assert.equal(
            await page.evaluate(
              ({ collection, field }) => window.workbenchFixture.state()[collection][0][field],
              { collection, field }
            ),
            'Alpha 🎉! omega',
            `${label}: emoji saves on exit`
          );
          assert.deepEqual(
            await page.evaluate(() => window.workbenchFixture.state().viewport),
            viewport,
            'Emoji insertion preserves the viewport'
          );
          const afterBox = await editor.boundingBox();
          assert.ok(
            Math.abs(afterBox.x - editorBox.x) < 1 && Math.abs(afterBox.y - editorBox.y) < 1,
            'Emoji does not scroll the canvas DOM'
          );
          await trigger.click();
          await page.keyboard.press('Escape');
          assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
          assert.equal(
            await trigger.evaluate((el) => el === document.activeElement),
            true,
            'Escape returns to the picker trigger'
          );
          assert.equal(
            await editor.textContent(),
            'Alpha 🎉! omega',
            'Closing the picker inserts nothing'
          );
        }
      }
      // An unnamed region can receive an emoji name without an intermediate edit button.
      await page.evaluate(
        (state) =>
          window.workbenchFixture.setState({
            ...state,
            mode: 'background',
            selectedObject: { kind: 'background_layer', id: 'region' },
            backgroundLayers: state.backgroundLayers.map((region) => ({ ...region, name: '' })),
          }),
        beforeZoom
      );
      await page.getByRole('button', { name: 'Insert emoji', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Insert emoji 💡', exact: true }).click();
      await page.keyboard.type(' Ideas');
      await page.keyboard.press('Escape');
      assert.equal(
        await page.evaluate(() => window.workbenchFixture.state().backgroundLayers[0].name),
        '💡 Ideas'
      );
      // Materials and emoji share one floating panel; switching never leaves stacked menus.
      await page.getByRole('button', { name: 'Treatment', exact: true }).click();
      await page.getByRole('button', { name: 'Insert emoji', exact: true }).click();
      assert.equal(await page.locator('.workbench-treatment-panel').count(), 0);
      assert.equal(await page.locator('.workbench-emoji-panel').count(), 1);
      await page.getByRole('button', { name: 'Treatment', exact: true }).click();
      assert.equal(await page.locator('.workbench-emoji-panel').count(), 0);
      assert.equal(await page.locator('.workbench-treatment-panel').count(), 1);
      await page.mouse.click(30, 700);
      assert.equal(await page.locator('.workbench-composition-menu').count(), 0);
      // Keyboard and direct pointer entry follow the same focus-only contract.
      await page.evaluate(
        (state) =>
          window.workbenchFixture.setState({
            ...state,
            mode: 'work',
            viewport: { x: 100, y: 120, scale: 0.35 },
            stickyNotes: state.stickyNotes.map((note) => ({ ...note, title: 'Editable title' })),
          }),
        beforeZoom
      );
      const focusViewport = await page.evaluate(() => window.workbenchFixture.state().viewport);
      await page.getByRole('textbox', { name: 'Sticky note title', exact: true }).focus();
      await page.keyboard.press('Tab');
      assert.equal(
        await note.evaluate((el) => document.activeElement === el),
        true,
        'Tab enters the note body'
      );
      assert.deepEqual(
        await page.evaluate(() => window.workbenchFixture.state().viewport),
        focusViewport,
        'Tab keeps the viewport'
      );
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('button', { name: 'Edit text', exact: true }).count(), 0);
      await note.click();
      assert.equal(
        await note.evaluate((el) => document.activeElement === el),
        true,
        'Direct click enters the note body'
      );
      assert.deepEqual(
        await page.evaluate(() => window.workbenchFixture.state().viewport),
        focusViewport,
        'Direct editing keeps the viewport'
      );
      await page.setViewportSize({ width: 1240, height: 780 });
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      );
      assert.deepEqual(
        await page.evaluate(() => window.workbenchFixture.state().viewport),
        focusViewport,
        'Resizing during editing keeps the viewport'
      );
      await page.keyboard.press('Escape');
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.evaluate(
        (state) => window.workbenchFixture.setState({ ...state, mode: 'work' }),
        beforeZoom
      );
      const initial = await note.textContent();
      await note.click({ position: { x: 40, y: 15 } });
      await page.keyboard.press('End');
      await page.keyboard.type(' draft');
      assert.equal(
        await page.evaluate(() => window.workbenchFixture.state().stickyNotes[0].body),
        initial,
        'typing stays in the edit transaction'
      );
      await page.keyboard.press('Escape');
      assert.match(
        await page.evaluate(() => window.workbenchFixture.state().stickyNotes[0].body),
        /draft/,
        'Escape saves content'
      );
      assert.equal(await note.evaluate((el) => el === document.activeElement), false);
      await note.click();
      await page.keyboard.press('ControlOrMeta+End');
      await page.keyboard.type(' committed');
      await page.keyboard.press('ControlOrMeta+Enter');
      assert.match(
        await page.evaluate(() => window.workbenchFixture.state().stickyNotes[0].body),
        /committed/
      );
      // Native selection is allowed on the first pointer gesture in Work mode.
      const box = await note.boundingBox();
      await page.mouse.move(box.x + 4, box.y + 12);
      await page.mouse.down();
      await page.mouse.move(box.x + 126, box.y + 12, { steps: 6 });
      await page.mouse.up();
      assert.ok(
        (await page.evaluate(() => document.getSelection()?.toString())).length > 2,
        'native text selection'
      );
      await page.keyboard.press('Escape');
      await setMode('background');
      const name = page.getByRole('textbox', { name: 'Region name' });
      await name.click({ position: { x: 5, y: 10 } });
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Enter');
      assert.equal(
        await page.evaluate(() => window.workbenchFixture.state().backgroundLayers[0].name),
        ''
      );
      await page.getByRole('button', { name: 'Add name', exact: true }).click();
      assert.equal(
        await name.evaluate((el) => el === document.activeElement),
        true,
        'unnamed regions can be named again'
      );
      await page.keyboard.type('Review');
      await page.keyboard.press('Enter');
      assert.equal(
        await page.evaluate(() => window.workbenchFixture.state().backgroundLayers[0].name),
        'Review'
      );
      await name.click();
      await name.evaluate((el) => {
        el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        el.textContent = '中文';
        el.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
        el.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', isComposing: true })
        );
      });
      assert.equal(
        await name.evaluate((el) => el === document.activeElement),
        true,
        'IME Enter does not commit'
      );
      await name.evaluate((el) =>
        el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
      );
      await page.keyboard.press('Enter');
      assert.equal(
        await page.evaluate(() => window.workbenchFixture.state().backgroundLayers[0].name),
        '中文'
      );
      // All fields complete without an explicit confirmation or native blur from the canvas.
      await page.evaluate(() =>
        window.workbenchFixture.setState((s) => ({
          ...s,
          stickyNotes: s.stickyNotes.map((note) => ({ ...note, title: 'Note title' })),
        }))
      );
      for (const [label, collection, field] of [
        ['Sticky note title', 'stickyNotes', 'title'],
        ['Sticky note body', 'stickyNotes', 'body'],
        ['Canvas text', 'annotations', 'text'],
        ['Region name', 'backgroundLayers', 'name'],
      ]) {
        await setMode(collection === 'stickyNotes' ? 'work' : 'background');
        const editor = page.getByRole('textbox', { name: label, exact: true });
        for (const finish of ['Escape', 'outside pointer']) {
          await editor.click();
          const toolbar = page.locator('.workbench-composition-toolbar');
          assert.equal(await toolbar.getByRole('button', { name: 'Done', exact: true }).count(), 0);
          assert.equal(await toolbar.locator('.workbench-editing-caption').count(), 0);
          await page.keyboard.press('ControlOrMeta+A');
          const value = `${label} saved on ${finish}`;
          await page.keyboard.type(value);
          if (finish === 'Escape') await page.keyboard.press('Escape');
          else await page.mouse.click(30, 700);
          assert.equal(await editor.evaluate((el) => el === document.activeElement), false);
          assert.equal(
            await page.evaluate(
              ({ collection, field }) => window.workbenchFixture.state()[collection][0][field],
              { collection, field }
            ),
            value,
            `${label}: ${finish} saves`
          );
        }
      }
      // Moving between fields commits the first field without stealing focus from the second.
      await setMode('work');
      const title = page.getByRole('textbox', { name: 'Sticky note title', exact: true });
      await title.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.type('Switch fields');
      await note.click();
      assert.equal(await note.evaluate((el) => el === document.activeElement), true);
      assert.equal(
        await page.evaluate(() => window.workbenchFixture.state().stickyNotes[0].title),
        'Switch fields'
      );
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.type('Save before recoloring');
      await page.getByRole('button', { name: 'Use sticky color Coral', exact: true }).click();
      assert.equal(
        await page.evaluate(() => window.workbenchFixture.state().stickyNotes[0].body),
        'Save before recoloring'
      );
      assert.equal(
        await page.evaluate(() => window.workbenchFixture.state().stickyNotes[0].color),
        'coral'
      );
      assert.equal(await note.evaluate((el) => el === document.activeElement), false);
      await page.evaluate(
        (body) =>
          window.workbenchFixture.setState((s) => ({
            ...s,
            stickyNotes: s.stickyNotes.map((note) => ({
              ...note,
              title: undefined,
              body,
              color: 'sage',
            })),
          })),
        initial
      );
      // Toolbar follows live object transforms and lives in the shared surface portal.
      await note.click();
      await page.keyboard.press('Escape');
      await page.evaluate(() =>
        window.workbenchFixture.setState((s) => ({ ...s, viewport: { x: 0, y: 0, scale: 1 } }))
      );
      const grip = page.getByRole('button', { name: 'Drag sticky note' });
      await page.waitForTimeout(100);
      const before = await page.locator('.workbench-object-tools').boundingBox();
      const g = await grip.boundingBox();
      await page.mouse.move(g.x + 10, g.y + 10);
      await page.mouse.down();
      await page.mouse.move(g.x + 130, g.y + 90, { steps: 6 });
      await page.waitForTimeout(60);
      const after = await page.locator('.workbench-object-tools').boundingBox();
      const movedNote = await page.locator('.workbench-sticky').boundingBox();
      assert.ok(
        Math.abs(after.x - before.x - 120) < 3 &&
          Math.abs(after.y + after.height + 12 - movedNote.y) < 3,
        `tools follow live drag: ${JSON.stringify({ before, after, g })}`
      );
      await page.mouse.up();
      assert.ok(
        await page
          .locator('.workbench-object-tools')
          .evaluate(
            (el) =>
              !!el.closest('.workbench-surface') &&
              el.hasAttribute('data-floe-surface-floating-layer')
          ),
        'shared floating host'
      );
      // Pan from a region does not move its boundary or swallow canvas gestures.
      const regionBefore = await page.evaluate(() => ({
        ...window.workbenchFixture.state().backgroundLayers[0],
      }));
      await page.mouse.move(680, 470);
      await page.keyboard.down('Space');
      await page.mouse.down();
      await page.mouse.move(720, 495, { steps: 4 });
      await page.mouse.up();
      await page.keyboard.up('Space');
      assert.deepEqual(
        await page.evaluate(() => window.workbenchFixture.state().backgroundLayers[0]),
        regionBefore
      );
      assert.ok(
        await page.evaluate(() => window.workbenchFixture.state().viewport.x !== 0),
        'Space drag pans'
      );
      await page.evaluate(() =>
        window.workbenchFixture.setState((s) => ({ ...s, viewport: { x: 0, y: 0, scale: 0.35 } }))
      );
      const resizeTarget = await page
        .getByRole('button', { name: 'Resize sticky note' })
        .boundingBox();
      assert.ok(
        Math.abs(resizeTarget.width - 24) < 0.1 && Math.abs(resizeTarget.height - 24) < 0.1,
        'overview resize target stays 24 screen pixels without covering text'
      );
      await note.click();
      assert.deepEqual(
        await page.evaluate(() => window.workbenchFixture.state().viewport),
        { x: 0, y: 0, scale: 0.35 },
        'overview click preserves the chosen viewport'
      );
      await page.keyboard.press('Escape');
      const themes = interactionsOnly
        ? []
        : await page.evaluate(() =>
            window.workbenchFixture.themes.map(({ name, mode }) => ({ name, mode }))
          );
      for (const theme of themes) {
        console.log(engine, theme.name);
        await page.evaluate((theme) => {
          document.documentElement.dataset.floeShellTheme = theme.name;
          document.documentElement.classList.toggle('dark', theme.mode === 'dark');
        }, theme);
        for (const material of ['tint', 'tab', 'ruled']) {
          for (const color of ['amber', 'sage', 'azure', 'coral', 'rose', 'graphite']) {
            await page.evaluate(
              ({ material, color }) =>
                window.workbenchFixture.setState((s) => ({
                  ...s,
                  viewport: { x: 0, y: 0, scale: 1 },
                  mode: 'work',
                  selectedObject: { kind: 'sticky_note', id: 'note' },
                  stickyNotes: s.stickyNotes.map((n) => ({ ...n, material, color })),
                })),
              { material, color }
            );
            const sample = await page.evaluate(
              ({ color, material }) => {
                const face = document.querySelector('.workbench-sticky__surface');
                const preview = document.querySelector(
                  `.workbench-style-choice:not(.is-material) [data-note-color="${color}"]`
                );
                const style = getComputedStyle(face),
                  sample = getComputedStyle(preview);
                const ctx = document.createElement('canvas').getContext('2d');
                const rgb = (value) => {
                  ctx.fillStyle = value;
                  ctx.fillRect(0, 0, 1, 1);
                  return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
                };
                const lum = (value) =>
                  rgb(value)
                    .map((v) => {
                      v /= 255;
                      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
                    })
                    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
                const a = lum(style.color),
                  b = lum(style.backgroundColor);
                return {
                  color,
                  material,
                  fill: style.backgroundColor,
                  sample: sample.backgroundColor,
                  contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
                  filter: style.backdropFilter,
                };
              },
              { color, material }
            );
            assert.equal(sample.fill, sample.sample, `${theme.name}: exact sticky preview`);
            assert.ok(
              sample.contrast >= 4.5,
              `${theme.name}/${color}/${material}: text contrast ${sample.contrast}`
            );
            assert.ok(!sample.filter || sample.filter === 'none');
            results.push({ engine, ...theme, ...sample });
          }
        }
        for (const material of ['solid', 'frame', 'hatched', 'dotted', 'grid', 'glass']) {
          for (const fill of ['#9da8a1', '#a79d8e', '#8fa1aa', '#a78f86', '#b58fa2', '#999999']) {
            await page.evaluate(
              ({ material, fill }) =>
                window.workbenchFixture.setState((s) => ({
                  ...s,
                  mode: 'background',
                  selectedObject: { kind: 'background_layer', id: 'region' },
                  backgroundLayers: s.backgroundLayers.map((r) => ({ ...r, fill, material })),
                })),
              { material, fill }
            );
            const region = await page.evaluate(() => {
              const face = getComputedStyle(document.querySelector('.workbench-background-region'));
              const sample = getComputedStyle(
                document.querySelector(
                  '.workbench-style-choice[aria-pressed="true"] .workbench-region-material__sample'
                )
              );
              return {
                fill: face.backgroundColor,
                sample: sample.backgroundColor,
                pattern: face.backgroundImage,
                samplePattern: sample.backgroundImage,
                filter: face.backdropFilter,
              };
            });
            assert.equal(
              region.fill,
              region.sample,
              `${theme.name}/${material}: exact region color preview`
            );
            assert.equal(
              region.pattern.split('(')[0],
              region.samplePattern.split('(')[0],
              `${theme.name}/${material}: exact region texture preview`
            );
            assert.ok(!region.filter || region.filter === 'none');
            results.push({ engine, ...theme, regionMaterial: material, ...region });
          }
        }
        for (const appearance of [
          'default',
          'vibrancy',
          'mica',
          'midnight',
          'aurora',
          'terminal',
        ]) {
          await page.evaluate(
            (theme) => window.workbenchFixture.setState((s) => ({ ...s, theme })),
            appearance
          );
          const paint = await page.evaluate(() => {
            const widget = getComputedStyle(document.querySelector('.workbench-widget'));
            const canvas = getComputedStyle(document.querySelector('.workbench-canvas'));
            return {
              window: widget.backgroundColor,
              canvas: canvas.backgroundColor,
              filter: widget.backdropFilter,
              shadow: widget.boxShadow,
            };
          });
          assert.notEqual(
            paint.window,
            paint.canvas,
            `${theme.name}/${appearance}: separate window and canvas`
          );
          assert.ok(!paint.filter || paint.filter === 'none', `${appearance}: no window blur`);
        }
        await page.evaluate(() =>
          window.workbenchFixture.setState((s) => ({
            ...s,
            theme: 'default',
            mode: 'work',
            selectedObject: { kind: 'sticky_note', id: 'note' },
          }))
        );
        await page.screenshot({ path: `${output}/${engine}-${theme.name}.png` });
      }
      await page.setViewportSize({ width: 390, height: 760 });
      await page.waitForTimeout(100);
      const tools = await page.locator('.workbench-object-tools').boundingBox();
      assert.ok(tools.x >= 0 && tools.x + tools.width <= 391, 'toolbar fits narrow viewport');
      assert.deepEqual(errors, []);
      if (engine.startsWith('chromium')) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Performance.enable');
        const first = await cdp.send('Performance.getMetrics');
        await page.waitForTimeout(300);
        const last = await cdp.send('Performance.getMetrics');
        const value = (metrics, name) =>
          metrics.metrics.find((item) => item.name === name)?.value ?? 0;
        assert.equal(
          value(last, 'LayoutCount') - value(first, 'LayoutCount'),
          0,
          'no idle layout work'
        );
        assert.equal(
          value(last, 'RecalcStyleCount') - value(first, 'RecalcStyleCount'),
          0,
          'no idle style work'
        );
      }
    } finally {
      await browser.close();
    }
  }
  writeFileSync(
    `${output}/${interactionsOnly ? 'interactions' : 'results'}.json`,
    JSON.stringify(
      {
        mode: interactionsOnly ? 'interactions' : 'full',
        configurations: 8,
        zoomResults,
        focusResults,
        results,
      },
      null,
      2
    )
  );
  console.log(
    `Workbench composition: ${focusResults.length} focus cases, ${zoomResults.length} zoom cases, ${results.length} theme/color/material cases and interaction checks passed.`
  );
  writeFileSync(
    `${output}/menu-stability-results.json`,
    `${JSON.stringify(menuResults, null, 2)}\n`
  );
} finally {
  await server.close();
}
