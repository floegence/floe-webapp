/* global window, document, getComputedStyle, requestAnimationFrame, objectById, patchObject, syncToolbarAppearance, themes, applyTheme, theme:writable */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium } from 'playwright';

const repo = fileURLToPath(new URL('../', import.meta.url));
const reference = `${repo}apps/demo/public/workbench-reference`;
const manifest = JSON.parse(readFileSync(`${reference}/manifest.json`, 'utf8'));
for (const [file, hash] of Object.entries(manifest.files)) {
  assert.equal(
    createHash('sha256')
      .update(readFileSync(`${reference}/${file}`))
      .digest('hex'),
    hash,
    `Frozen reference: ${file}`
  );
}
const require = createRequire(new URL('../apps/demo/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = process.env.FLOE_PARITY_URL
  ? null
  : await createServer({
      root: `${repo}apps/demo`,
      configFile: `${repo}apps/demo/vite.config.ts`,
      server: { host: '127.0.0.1', port: 0 },
    });
await server?.listen();
const origin =
  process.env.FLOE_PARITY_URL ?? `http://127.0.0.1:${server.httpServer.address().port}`;
const output = `${repo}.cache/workbench-parity`;
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const interactionsOnly = process.argv.includes('--interactions-only');
const errors = [];
const fills = {
  amber: '#a79d8e',
  sage: '#9da8a1',
  azure: '#8fa1aa',
  coral: '#a78f86',
  rose: '#b58fa2',
  graphite: '#999999',
};
const nextFrame = (page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
const close = (actual, expected, label, tolerance = 1) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} vs reference ${expected}`
  );
function compareColor(actual, expected, label) {
  actual.forEach((value, index) => close(value, expected[index], label, 1));
}
async function read(page, source, kind, id) {
  return page.evaluate(
    ({ source, kind, id }) => {
      const face = source
        ? document.querySelector(`[data-object="${id}"]`)
        : document.querySelector(
            kind === 'sticky'
              ? `.workbench-sticky[data-wb-object-id="${id}"] .workbench-sticky__surface`
              : `.workbench-background-region[data-wb-object-id="${id}"]`
          );
      const style = getComputedStyle(face);
      const ctx = document.createElement('canvas').getContext('2d');
      const rgb = (value) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = value;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data];
      };
      const preview = document.querySelector(
        source
          ? `#object-toolbar .color-choice[aria-pressed="true"] .surface-preview`
          : `.workbench-style-choice[aria-pressed="true"] ${kind === 'sticky' ? '.workbench-note-preview' : '.workbench-region-material__sample'}`
      );
      const tools = document.querySelector(
        source ? '#object-toolbar' : '.workbench-composition-toolbar'
      );
      return {
        fill: rgb(style.backgroundColor),
        edge: rgb(style.borderTopColor),
        ink: rgb(style.color),
        preview: rgb(getComputedStyle(preview).backgroundColor),
        border: style.borderTopStyle,
        radius: style.borderRadius,
        pattern: style.backgroundImage,
        filter: style.backdropFilter,
        tools: tools.getBoundingClientRect().toJSON(),
      };
    },
    { source, kind, id }
  );
}
try {
  const a = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const b = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  for (const page of [a, b]) page.on('pageerror', (e) => errors.push(e.message));
  const themeNames = [];
  for (const [kind, sample, id, materials] of interactionsOnly
    ? []
    : [
        ['sticky', 'composition', 'principle', ['tint', 'tab', 'ruled']],
        ['region', 'regions', 'blank-region', ['solid', 'frame', 'hatched']],
      ]) {
    const query = `?scene=composition&design=proposed&theme=paper&sample=${sample}&object=${id}&tools=style&scale=.8&lang=zh-CN`;
    await Promise.all([
      a.goto(`${origin}/workbench-reference/embed.html${query}`),
      b.goto(`${origin}/workbench-composition.html${query}`),
    ]);
    await b.locator('.workbench-treatment-trigger[aria-expanded="true"]').waitFor();
    await a.locator('#object-toolbar .treatment-panel:visible').waitFor();
    await nextFrame(b);
    const presets = await b.evaluate(() =>
      window.compositionExample.themes.map(({ name, mode }) => ({ name, mode }))
    );
    for (const preset of presets) {
      if (kind === 'sticky') themeNames.push(preset.name);
      await a.evaluate((name) => {
        theme = themes.find((t) => t.name === name);
        applyTheme(theme);
      }, preset.name);
      await b.evaluate((p) => {
        document.documentElement.dataset.floeShellTheme = p.name;
        document.documentElement.classList.toggle('dark', p.mode === 'dark');
      }, preset);
      for (const material of materials)
        for (const [color, fill] of Object.entries(fills)) {
          await a.evaluate(
            ({ id, material, color }) => {
              const o = objectById(id);
              o.color = color;
              o.treatment = { solid: 'area', hatched: 'hatch' }[material] ?? material;
              patchObject(o);
              syncToolbarAppearance();
            },
            { id, material, color }
          );
          await b.evaluate(
            ({ kind, id, material, color, fill }) =>
              window.compositionExample.setState((s) => ({
                ...s,
                [kind === 'sticky' ? 'stickyNotes' : 'backgroundLayers']: s[
                  kind === 'sticky' ? 'stickyNotes' : 'backgroundLayers'
                ].map((o) => (o.id === id ? { ...o, material, color, fill } : o)),
              })),
            { kind, id, material, color, fill }
          );
          const [expected, actual] = await Promise.all([
            read(a, true, kind, id),
            read(b, false, kind, id),
          ]);
          const label = `${preset.name}/${kind}/${material}/${color}`;
          compareColor(actual.fill, expected.fill, `${label} fill`);
          compareColor(actual.edge, expected.edge, `${label} edge`);
          compareColor(actual.ink, expected.ink, `${label} ink`);
          compareColor(actual.fill, actual.preview, `${label} preview`);
          assert.equal(actual.border, expected.border, `${label} border style`);
          assert.equal(actual.radius, expected.radius, `${label} radius`);
          assert.equal(actual.filter, 'none', `${label} no blur`);
          results.push({ label, fill: actual.fill, edge: actual.edge });
        }
    }
    console.log(`${kind}: all ${presets.length} themes × 3 materials × 6 colors match reference`);
  }
  // Compare toolbar geometry and text hierarchy in real A/B frames, at desktop and narrow widths.
  const review = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  for (const [sample, id, themeName, scale] of interactionsOnly
    ? []
    : [
        ['regions', 'blank-region', 'paper', '.8'],
        ['regions', 'field-region', 'slate', '1'],
        ['composition', 'principle', 'slate', '.8'],
        ['composition', 'next', 'paper', '.8'],
        ['composition', 'reference', 'hc-light', '.8'],
        ['composition', 'board-title', 'paper', '.8'],
        ['composition', 'board-subtitle', 'slate', '1'],
        ['composition', 'principle', 'paper', '.35'],
      ]) {
    await review.goto(
      `${origin}/workbench-comparison.html?sample=${sample}&object=${id}&theme=${themeName}&scale=${scale}`
    );
    const frames = review.frames();
    const ref = frames.find((f) => f.url().includes('/workbench-reference/'));
    const actual = frames.find((f) => f.url().includes('/workbench-composition.html'));
    await actual.locator('.workbench-composition-toolbar').waitFor();
    if (!id.startsWith('board-'))
      await actual.locator('.workbench-treatment-trigger[aria-expanded="true"]').waitFor();
    if (!id.startsWith('board-')) {
      // Material menus float independently; compare the unchanged compact row.
      await ref.locator('#object-toolbar .treatment-trigger').click();
    }
    await nextFrame(actual);
    const x = await ref.locator('#object-toolbar').boundingBox();
    const y = await actual.locator('.workbench-composition-toolbar').boundingBox();
    // Region now includes an emoji action; the frozen reference keeps its original width.
    const hasAddedEmojiAction =
      (await actual.locator('.workbench-composition-toolbar').getAttribute('data-kind')) ===
      'region';
    if (hasAddedEmojiAction)
      close(y.width, x.width + 32, `${id}/${scale}: width includes one emoji action and gap`);
    for (const dimension of hasAddedEmojiAction ? ['height', 'y'] : ['width', 'height', 'y'])
      close(y[dimension], x[dimension], `${id}/${scale} toolbar ${dimension}`);
    const referenceText = ref
      .locator(`[data-object="${id}"]`)
      .locator('.sticky-title,.sticky-body,.region-name,.free-text-content');
    const productionText = actual
      .locator(`[data-wb-object-id="${id}"]`)
      .locator(
        '.workbench-sticky__title,.workbench-sticky__body,.workbench-background-region__label>div,.workbench-text-annotation__content'
      );
    const typography = (nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node);
        return Object.fromEntries(
          ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'].map((key) => [key, style[key]])
        );
      });
    let expectedTypography = await referenceText.evaluateAll(typography);
    if (Number(scale) <= 0.5) {
      // Production keeps the approved full-size typography at every zoom; the frozen
      // reference still switches to enlarged titles and hidden bodies below 50%.
      await a.goto(
        `${origin}/workbench-reference/embed.html?sample=${sample}&object=${id}&theme=${themeName}&scale=1&scene=composition&design=proposed&lang=zh-CN`
      );
      expectedTypography = await a
        .locator(`[data-object="${id}"]`)
        .locator('.sticky-title,.sticky-body,.region-name,.free-text-content')
        .evaluateAll(typography);
    }
    assert.deepEqual(
      await productionText.evaluateAll(typography),
      expectedTypography,
      `${id}/${scale} text hierarchy`
    );
    const resize = await actual
      .locator(`[data-wb-object-id="${id}"] .workbench-layer-resize`)
      .boundingBox();
    assert.ok(
      Math.abs(resize.width - 24) < 0.1 && Math.abs(resize.height - 24) < 0.1,
      `${id}/${scale} resize target stays 24 screen pixels`
    );
    await review.screenshot({ path: `${output}/${themeName}-${id}-${scale}.png` });
  }
  // Exercise production editing, clearing, duplication, dragging and idle behavior.
  await b.goto(
    `${origin}/workbench-composition.html?theme=paper&sample=composition&object=principle&tools=style&scale=.8&lang=en-US`
  );
  await b.locator('.workbench-treatment-trigger[aria-expanded="true"]').waitFor();
  const note = b.locator('.workbench-sticky[data-wb-object-id="principle"]');
  const title = note.locator('.workbench-sticky__title');
  const body = note.locator('.workbench-sticky__body');
  const editViewport = await b.evaluate(() => window.compositionExample.state().viewport);
  await title.click();
  assert.deepEqual(
    await b.evaluate(() => window.compositionExample.state().viewport),
    editViewport,
    'Clicking the sticky title keeps the example viewport'
  );
  await b.keyboard.press('ControlOrMeta+A');
  await b.keyboard.type('Edited title');
  await b.keyboard.press('Escape');
  assert.equal(await title.innerText(), 'Edited title', 'Escape saves title');
  assert.equal(await title.evaluate((el) => el === document.activeElement), false);
  await title.click();
  await b.keyboard.press('ControlOrMeta+A');
  await b.keyboard.type('Edited title');
  await body.click();
  await b.keyboard.press('ControlOrMeta+A');
  await b.keyboard.type('Edited body');
  await b.keyboard.press('Escape');
  assert.equal(await body.evaluate((el) => el === document.activeElement), false);
  assert.equal(await b.getByRole('button', { name: 'Done', exact: true }).count(), 0);
  assert.equal(
    await b.evaluate(
      () => window.compositionExample.state().stickyNotes.find((o) => o.id === 'principle').title
    ),
    'Edited title'
  );
  assert.equal(await body.innerText(), 'Edited body');
  assert.deepEqual(
    await b.evaluate(() => window.compositionExample.state().viewport),
    editViewport,
    'Sticky typing and saving keep the example viewport'
  );
  await b.getByRole('button', { name: 'Duplicate', exact: true }).click();
  const copy = await b.evaluate(() => window.compositionExample.state().stickyNotes.at(-1));
  assert.equal(copy.title, 'Edited title');
  assert.equal(copy.body, 'Edited body');
  assert.equal(copy.material, 'tint');
  assert.equal(copy.color, 'sage');
  await b.goto(
    `${origin}/workbench-composition.html?theme=paper&sample=regions&object=board-title&scale=.35&lang=en-US`
  );
  const text = b.locator('[data-wb-object-id="board-title"] .workbench-text-annotation__content');
  await text.waitFor();
  const textViewport = await b.evaluate(() => window.compositionExample.state().viewport);
  const textBefore = await text.boundingBox();
  await text.click({ position: { x: 10, y: 8 } });
  await b.keyboard.type('Edited ');
  await b.keyboard.press('Escape');
  assert.deepEqual(
    await b.evaluate(() => window.compositionExample.state().viewport),
    textViewport,
    'Text editing keeps the example viewport'
  );
  const textAfter = await text.boundingBox();
  close(textAfter.x, textBefore.x, 'Text editing keeps its screen x');
  close(textAfter.y, textBefore.y, 'Text editing keeps its screen y');
  await b.goto(
    `${origin}/workbench-composition.html?theme=paper&sample=regions&object=blank-region&tools=style&scale=.8&lang=en-US`
  );
  await b.locator('.workbench-treatment-trigger[aria-expanded="true"]').waitFor();
  await b.getByRole('button', { name: 'Add name', exact: true }).click();
  const name = b.locator('[data-wb-object-id="blank-region"] [contenteditable]');
  assert.equal(
    await name.evaluate((el) => el === document.activeElement),
    true,
    'Add name focuses the editable label'
  );
  await b.keyboard.type('Optional name');
  await b.keyboard.press('Enter');
  if ((await b.locator('.workbench-treatment-trigger').getAttribute('aria-expanded')) !== 'true')
    await b.locator('.workbench-treatment-trigger').click();
  await b.getByRole('button', { name: 'Clear name', exact: true }).click();
  assert.equal(
    await b.evaluate(
      () =>
        window.compositionExample.state().backgroundLayers.find((o) => o.id === 'blank-region').name
    ),
    ''
  );
  assert.equal(await name.isVisible(), false, 'Cleared region is an unlabelled color field');
  if ((await b.locator('.workbench-treatment-trigger').getAttribute('aria-expanded')) !== 'true')
    await b.locator('.workbench-treatment-trigger').click();
  await nextFrame(b);
  const region = b.locator('.workbench-background-region[data-wb-object-id="blank-region"]');
  const grip = region.locator('.workbench-region-grip');
  const g = await grip.boundingBox();
  const before = await region.boundingBox();
  await b.mouse.move(g.x + 12, g.y + 12);
  await b.mouse.down();
  await b.mouse.move(g.x + 72, g.y + 42, { steps: 6 });
  await b.mouse.up();
  await nextFrame(b);
  const after = await region.boundingBox();
  close(after.x - before.x, 60, 'Region drag');
  const toolbar = await b.locator('.workbench-composition-toolbar').boundingBox();
  close(toolbar.y + toolbar.height + 12, after.y, 'Expanded toolbar follows region');
  await b.setViewportSize({ width: 390, height: 760 });
  await nextFrame(b);
  const narrow = await b.locator('.workbench-composition-toolbar').boundingBox();
  assert.ok(narrow.x >= 0 && narrow.x + narrow.width <= 390, 'Narrow toolbar stays inside canvas');
  await nextFrame(b);
  const cdp = await b.context().newCDPSession(b);
  await cdp.send('Performance.enable');
  const first = await cdp.send('Performance.getMetrics');
  await b.waitForTimeout(350);
  const last = await cdp.send('Performance.getMetrics');
  for (const name of ['LayoutCount', 'RecalcStyleCount'])
    assert.equal(
      last.metrics.find((m) => m.name === name).value -
        first.metrics.find((m) => m.name === name).value,
      0,
      `No idle ${name}`
    );
  assert.deepEqual(errors, [], 'No renderer errors');
  writeFileSync(
    `${output}/${interactionsOnly ? 'interactions' : 'results'}.json`,
    JSON.stringify({ themes: themeNames, cases: results.length, results }, null, 2)
  );
  console.log(
    interactionsOnly
      ? 'Production interaction checks passed: editing, duplication, empty names, drag, mobile and idle checks.'
      : `A/B parity passed: ${results.length} material/color cases, toolbar geometry, native editing, duplication, empty names, drag, mobile and idle checks.`
  );
} finally {
  await browser.close();
  await server?.close();
}
