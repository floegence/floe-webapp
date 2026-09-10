/* global window, document, getComputedStyle, requestAnimationFrame, setTimeout, Event, PointerEvent */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openSurfaceBrowser, openFixture, artifactRoot } from './surface-browser-utils.mjs';

const runtime = await openSurfaceBrowser();
const output = resolve(artifactRoot, 'visual');
mkdirSync(output, { recursive: true });
const report = {
  browser: runtime.browser.version(),
  renderer: runtime.renderer,
  entries: [],
  checks: [],
};
const geometry = (el) => {
  const s = getComputedStyle(el),
    r = el.getBoundingClientRect();
  return {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    border: s.borderWidth,
    padding: s.padding,
    shadow: s.boxShadow,
    outline: s.outlineStyle,
    color: s.borderColor,
    topColor: s.borderTopColor,
    transition: s.transitionProperty,
    backdrop: s.backdropFilter,
  };
};
try {
  for (const entry of ['styles', 'tailwind']) {
    const { page, errors } = await openFixture(runtime.browser, runtime.baseURL, 'current', entry);
    await page.evaluate((fn) => {
      window.surfaceSnapshot = new Function(`return (${fn})`)();
    }, geometry.toString());
    const baseline = await openFixture(runtime.browser, runtime.baseURL, 'baseline', entry);
    await baseline.page.screenshot({ path: resolve(output, `${entry}-A-light.png`) });
    await page.screenshot({ path: resolve(output, `${entry}-B-light.png`) });
    const samples = [
      '[data-case="card"]',
      '[data-case="secondary"]',
      '[data-case="glass"]',
      '[data-case="lift"]',
      '.workbench-widget',
      '[aria-label="Workspace name"]',
    ];
    const readStyles = async (target) =>
      target.evaluate(
        ({ samples, source }) => {
          const snapshot = new Function(`return (${source})`)();
          return samples.map((selector) => {
            const result = snapshot(document.querySelector(selector));
            delete result.transition;
            return { selector, ...result };
          });
        },
        { samples, source: geometry.toString() }
      );
    assert.deepEqual(
      await readStyles(page),
      await readStyles(baseline.page),
      `${entry}: default geometry and style compatibility`
    );
    assert.equal(await page.locator('.workbench-widget').count(), 2);
    await baseline.page.close();

    await page.evaluate(() => window.surfaceFixture.theme.setSurfaceStyle('soft-neumorphic'));
    const input = page.getByRole('textbox', { name: 'Workspace name', exact: true });
    await input.fill('Keep my draft');
    await input.evaluate((el) => {
      el.focus();
      el.setSelectionRange(2, 6);
      window.savedInput = el;
    });
    const before = await page.evaluate(() => ({
      state: window.surfaceFixture.state(),
      lifecycle: { ...window.surfaceFixture.lifecycle },
      nodes: document.querySelectorAll('*').length,
    }));
    await page.evaluate(() => {
      for (let i = 0; i < 50; i++) {
        window.surfaceFixture.theme.setSurfaceStyle('standard');
        window.surfaceFixture.theme.setSurfaceStyle('soft-neumorphic');
      }
    });
    assert.deepEqual(
      await page.evaluate(() => ({
        state: window.surfaceFixture.state(),
        lifecycle: { ...window.surfaceFixture.lifecycle },
        nodes: document.querySelectorAll('*').length,
      })),
      before
    );
    assert.equal(
      await input.evaluate(
        (el) =>
          el === window.savedInput &&
          document.activeElement === el &&
          el.value === 'Keep my draft' &&
          el.selectionStart === 2
      ),
      true
    );

    const themes = await page.evaluate(() =>
      window.surfaceFixture.themes.map(({ name, mode }) => ({ name, mode }))
    );
    for (const theme of themes) {
      await page.evaluate(
        (theme) => window.surfaceFixture.theme.selectShellTheme(theme.mode, theme.name),
        theme
      );
      await page.waitForTimeout(320);
      for (const label of ['Workspace name', 'Description', 'Endpoint']) {
        const field = page.getByRole('textbox', { name: label, exact: true });
        const result = await field.evaluate(async (el) => {
          document.activeElement?.blur();
          const owner = el.closest('[data-floe-input-surface]') ?? el;
          await new Promise((r) => setTimeout(r, 160));
          const before = window.surfaceSnapshot(owner);
          el.focus();
          const samples = [window.surfaceSnapshot(owner)];
          await new Promise((r) => requestAnimationFrame(() => r()));
          samples.push(window.surfaceSnapshot(owner));
          await new Promise((r) => setTimeout(r, 180));
          samples.push(window.surfaceSnapshot(owner));
          return { before, samples };
        });
        for (const sample of result.samples)
          for (const key of ['x', 'y', 'width', 'height', 'border', 'padding', 'shadow', 'outline'])
            assert.equal(
              sample[key],
              result.before[key],
              `${entry}/${theme.name}/${label}: focus ${key}`
            );
        assert.notEqual(
          result.samples.at(-1).color,
          result.before.color,
          `${entry}/${theme.name}/${label}: visible focus`
        );
        assert.ok(!result.samples.at(-1).transition.includes('box-shadow'));
        if (theme.name !== 'hc-light')
          assert.equal(
            result.samples.at(-1).topColor,
            result.before.topColor,
            `${entry}/${theme.name}/${label}: focus does not restore a rectangular frame`
          );
      }
    }

    await page.evaluate(() =>
      window.surfaceFixture.theme.selectShellTheme('light', 'classic-light')
    );
    await input.blur();
    await page.waitForTimeout(350);
    await page.screenshot({ path: resolve(output, `${entry}-C-light.png`) });
    const secondary = page.locator('[data-case="secondary"]');
    const unfocused = await secondary.evaluate((el) => getComputedStyle(el).boxShadow);
    await page.keyboard.press('Tab');
    await secondary.focus();
    assert.notEqual(
      await secondary.evaluate((el) => getComputedStyle(el).boxShadow),
      unfocused,
      'independent keyboard focus remains visible'
    );
    const numberButton = page.getByRole('button', { name: 'Increase value' });
    await numberButton.focus();
    assert.equal(
      await numberButton.evaluate((el) => getComputedStyle(el).boxShadow),
      'none',
      'compound button uses local fill'
    );

    await page.getByRole('button', { name: 'Open windows', exact: true }).click();
    await page.waitForTimeout(200);
    const windowSurface = page.locator('[data-floe-floating-window-surface]').first();
    assert.equal(await windowSurface.evaluate((el) => getComputedStyle(el).backdropFilter), 'none');
    assert.equal(
      await windowSurface
        .locator('pre')
        .evaluate((el) =>
          getComputedStyle(el).getPropertyValue('--floe-surface-decoration').trim()
        ),
      '0 0 transparent',
      'private decoration must not inherit into content'
    );
    for (const reason of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) {
      const title = page.locator('[data-floe-floating-window-titlebar]').first();
      const rect = await title.boundingBox();
      await page.mouse.move(rect.x + 100, rect.y + 12);
      await page.mouse.down();
      assert.equal(await windowSurface.getAttribute('data-floe-surface-interacting'), 'true');
      assert.equal(
        await page
          .locator('[data-floe-floating-window-surface]')
          .nth(1)
          .getAttribute('data-floe-surface-interacting'),
        null
      );
      assert.equal(
        await windowSurface.evaluate((el) => getComputedStyle(el).transitionProperty),
        'none'
      );
      if (reason === 'pointerup') await page.mouse.up();
      else {
        await page.evaluate((reason) => {
          if (reason === 'blur') window.dispatchEvent(new Event('blur'));
          else
            document.querySelector('[data-floe-geometry-surface="floating-window"]').dispatchEvent(
              new PointerEvent(reason, {
                bubbles: true,
                pointerId: 1,
                clientX: 230,
                clientY: 172,
              })
            );
        }, reason);
        await page.mouse.up();
      }
      assert.equal(
        await page.locator('html').getAttribute('data-floe-hot-interaction'),
        null,
        reason
      );
      assert.equal(await windowSurface.getAttribute('data-floe-surface-interacting'), null, reason);
    }
    await page.screenshot({ path: resolve(output, `${entry}-C-windows.png`) });
    await page.evaluate(() => window.surfaceFixture.setWindows(false));
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Review settings', exact: true }).click();
    await page.getByRole('textbox', { name: 'Review name' }).fill('Dialog remains usable');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.waitForTimeout(150);

    for (const mode of ['canvas', 'projected']) {
      const editor = page.getByRole('textbox', { name: `${mode} editor` });
      await editor.click();
      await page.keyboard.press('ControlOrMeta+A');
      const inputSession = await page.context().newCDPSession(page);
      await inputSession.send('Input.imeSetComposition', {
        text: '中文草稿',
        selectionStart: 4,
        selectionEnd: 4,
      });
      await inputSession.send('Input.insertText', { text: '中文草稿' });
      assert.equal(
        await editor.inputValue(),
        '中文草稿',
        `${mode}: composition commits in the editor`
      );
      assert.equal(await editor.evaluate((el) => document.activeElement === el), true);
      await editor.dblclick();
      assert.ok(
        await editor.evaluate((el) => el.selectionEnd > el.selectionStart),
        `${mode}: native word selection`
      );
      const body = page.locator(`[data-body="widget-${mode === 'canvas' ? 0 : 1}"]`);
      const reading = body.locator('p');
      const readingRect = await reading.boundingBox();
      await page.mouse.move(readingRect.x + 2, readingRect.y + 8);
      await page.mouse.down();
      await page.mouse.move(readingRect.x + 150, readingRect.y + 8, { steps: 12 });
      await page.mouse.up();
      assert.ok(
        await page.evaluate(() => window.getSelection()?.toString().length > 3),
        `${mode}: reading drag selection`
      );
      assert.equal(
        await reading.evaluate((el) => {
          const event = new window.KeyboardEvent('keydown', {
            key: 'c',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          });
          el.dispatchEvent(event);
          return event.defaultPrevented;
        }),
        false,
        `${mode}: copy remains browser-owned`
      );
      await page.evaluate(() => {
        window.getSelection()?.removeAllRanges();
        window.surfaceFixture.setOutput('Readable log line\n'.repeat(40));
        window.surfaceFixture.setState((state) => ({
          ...state,
          selectedWidgetId: null,
          selectedObject: null,
          viewport: { x: 0, y: 0, scale: 1 },
        }));
      });
      const localScroll = body.locator('pre');
      const scrollRect = await localScroll.boundingBox();
      await page.mouse.move(scrollRect.x + 40, scrollRect.y + 20);
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(150);
      assert.notEqual(
        await page.evaluate(() => window.surfaceFixture.state().viewport.scale),
        1,
        `${mode}: unselected wheel belongs to canvas`
      );
      await page.evaluate(
        (id) =>
          window.surfaceFixture.setState((state) => ({
            ...state,
            selectedWidgetId: id,
            selectedObject: { kind: 'widget', id },
            viewport: { x: 0, y: 0, scale: 1 },
          })),
        `widget-${mode === 'canvas' ? 0 : 1}`
      );
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(150);
      assert.equal(
        await page.evaluate(() => window.surfaceFixture.state().viewport.scale),
        1,
        `${mode}: selected widget guards canvas zoom`
      );
      assert.ok(
        await localScroll.evaluate((el) => el.scrollTop > 0),
        `${mode}: constrained local log scrolls`
      );
      await page.evaluate(() => window.surfaceFixture.setOutput('Ready for streaming output.'));
      await page.getByRole('button', { name: `${mode} actions`, exact: true }).click();
      const menu = page.getByRole('menu');
      await menu.waitFor();
      assert.equal(
        await menu.evaluate(
          (el) => !!el.closest('[data-floe-dialog-surface-host], [data-floe-surface-portal-layer]')
        ),
        true,
        'widget menu stays in local host'
      );
      await page.keyboard.press('Escape');
    }
    for (const palette of ['default', 'vibrancy', 'mica', 'midnight', 'aurora', 'terminal']) {
      for (const mode of ['light', 'dark']) {
        await page.evaluate(
          ({ palette, mode }) => {
            window.surfaceFixture.setState((state) => ({ ...state, theme: palette }));
            window.surfaceFixture.theme.selectShellTheme(mode, `classic-${mode}`);
          },
          { palette, mode }
        );
        const widget = page.locator('.workbench-widget').first();
        assert.equal(
          await widget.evaluate((el) => getComputedStyle(el).backdropFilter),
          'none',
          `${palette}/${mode}: no material blur`
        );
        const background = await widget.evaluate((el) => getComputedStyle(el).backgroundColor);
        assert.ok(!background.startsWith('rgba'), `${palette}/${mode}: opaque base`);
      }
    }
    await page.evaluate(() =>
      window.surfaceFixture.setState((state) => ({ ...state, theme: 'default' }))
    );
    const session = await page.context().newCDPSession(page);
    let layerCount;
    session.on('LayerTree.layerTreeDidChange', (event) => {
      if (event.layers) layerCount = event.layers.length;
    });
    await session.send('LayerTree.enable');
    const cycleWindows = async () => {
      await page.evaluate(() => window.surfaceFixture.setWindows(true));
      await page.waitForTimeout(160);
      await page.evaluate(() => window.surfaceFixture.setWindows(false));
      await page.waitForTimeout(160);
    };
    await cycleWindows();
    await session.send('HeapProfiler.collectGarbage');
    const countersBefore = await session.send('Memory.getDOMCounters');
    const layersBefore = layerCount;
    assert.equal(typeof layersBefore, 'number', 'compositor layer tree is observable');
    for (let i = 0; i < 12; i++) await cycleWindows();
    await session.send('HeapProfiler.collectGarbage');
    const countersAfter = await session.send('Memory.getDOMCounters');
    assert.ok(layerCount <= layersBefore, 'window cycles do not accumulate compositor layers');
    assert.ok(countersAfter.nodes <= countersBefore.nodes, 'window cycles do not accumulate DOM');
    assert.ok(
      countersAfter.jsEventListeners <= countersBefore.jsEventListeners,
      'window cycles do not accumulate listeners'
    );
    await page.evaluate(() => window.surfaceFixture.theme.selectShellTheme('dark', 'classic-dark'));
    await page.waitForTimeout(350);
    await page.screenshot({ path: resolve(output, `${entry}-C-dark.png`) });
    await page.evaluate(() => window.surfaceFixture.theme.selectShellTheme('light', 'hc-light'));
    await page.waitForTimeout(350);
    assert.match(
      await page.locator('[data-case="card"]').evaluate((el) => getComputedStyle(el).boxShadow),
      /rgba\(0, 0, 0, 0\)/,
      'high contrast is flat'
    );
    await page.emulateMedia({ forcedColors: 'active' });
    await input.focus();
    assert.equal(await input.evaluate((el) => getComputedStyle(el).outlineStyle), 'none');
    await page.screenshot({ path: resolve(output, `${entry}-forced-colors.png`) });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
    assert.equal(
      await page
        .locator('[data-case="card"]')
        .evaluate((el) => getComputedStyle(el).transitionProperty),
      'none'
    );
    for (const width of [390, 430, 768]) {
      await page.setViewportSize({
        width,
        height: width === 768 ? 1024 : width === 430 ? 932 : 844,
      });
      await page.evaluate(() =>
        window.surfaceFixture.theme.selectShellTheme('light', 'classic-light')
      );
      await page.waitForTimeout(350);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        true,
        `${width}: no horizontal overflow`
      );
      await page.screenshot({ path: resolve(output, `${entry}-C-${width}.png`) });
    }
    assert.deepEqual(errors, []);
    await page.close();
    report.entries.push({ entry, themes: themes.length, status: 'passed' });
  }
  report.checks = [
    'default compatibility',
    'focus geometry with animations enabled',
    'persistence and identity (unit/browser)',
    'local hot interaction recovery',
    'local portals',
    'native composition, text selection/copy and selected wheel ownership',
    'DOM, listeners and compositor layers after window cycles',
    'forced colors',
    'reduced motion',
    '390/430/768/1440 viewports',
  ];
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await runtime.close();
}
