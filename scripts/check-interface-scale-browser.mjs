/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { chromium } from 'playwright';
const require = createRequire(new URL('../apps/demo/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = await createServer({ root: fileURLToPath(new URL('../apps/demo/', import.meta.url)), configFile: fileURLToPath(new URL('../apps/demo/vite.config.ts', import.meta.url)), server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch();
try {
  for (const touch of [false, true]) {
    const page = await browser.newPage({ viewport: { width: touch ? 320 : 1280, height: 900 }, hasTouch: touch });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/density.html`);
    const surface = page.getByTestId('interface-scale');
    await surface.getByRole('heading').waitFor();

    /* The scale itself is the contract, so measure it from the tokens rather than
     * restating today's pixel values here. A probe inside <body> resolves the
     * tokens where controls inherit them, including the coarse-pointer overrides
     * that primitives.css declares on `body`. Every assertion below then asks the
     * same question: does the rendered component actually consume the shared
     * token, or did it hard-code its own size?
     *
     * What stays absolute is the accessibility floor, because that is not a
     * design choice: 44px touch targets, a 16px touch input font so mobile
     * Safari does not zoom on focus, and no horizontal overflow. */
    const tokens = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;box-sizing:content-box;padding:0;border:0;width:0;height:0';
      document.body.appendChild(probe);
      const readFont = (name) => {
        probe.style.fontSize = `var(${name})`;
        return parseFloat(getComputedStyle(probe).fontSize);
      };
      const readLength = (name) => {
        probe.style.fontSize = '';
        probe.style.width = `var(${name})`;
        const value = parseFloat(getComputedStyle(probe).width);
        probe.style.width = '';
        return value;
      };
      const resolved = {
        control: readFont('--floe-type-control'),
        body: readFont('--floe-type-body'),
        heading: readFont('--floe-type-heading'),
        lineControl: readLength('--floe-line-control'),
        lineBody: readLength('--floe-line-body'),
        row: readLength('--floe-row-height'),
        controlSm: readLength('--floe-control-height-sm'),
        controlMd: readLength('--floe-control-height-md'),
      };
      probe.remove();
      return resolved;
    });
    const px = (value) => `${value}px`;
    const near = (actual, expected) => Math.abs(actual - expected) < 0.5;
    assert.ok(tokens.control >= 12 && tokens.control <= 14, `control type stays compact (measured ${tokens.control}px)`);
    assert.ok(tokens.body >= 12 && tokens.body <= 15, `reading type stays legible (measured ${tokens.body}px)`);
    assert.ok(tokens.heading >= 15 && tokens.heading <= 20, `heading stays a heading (measured ${tokens.heading}px)`);
    // A line-height below 1.4× its own type is cramped, whatever the type scale is.
    assert.ok(tokens.lineControl >= tokens.control * 1.4, `control line box tracks control type (${tokens.lineControl}px for ${tokens.control}px)`);
    assert.ok(tokens.lineBody >= tokens.body * 1.4, `reading line box tracks body type (${tokens.lineBody}px for ${tokens.body}px)`);

    const metrics = await surface.evaluate(element => {
      const measure = selector => {
        const node = element.querySelector(selector), css = getComputedStyle(node);
        return { height: node.getBoundingClientRect().height, size: css.fontSize, weight: css.fontWeight };
      };
      return { heading: measure('h1'), input: measure('input'), buttons: [...element.querySelectorAll('button')].map(node => node.getBoundingClientRect().height), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
    });
    assert.equal(metrics.heading.size, px(tokens.heading), 'heading consumes --floe-type-heading');
    assert.equal(metrics.heading.weight, '500');
    // Touch input font is the platform floor, not the token: below 16px iOS zooms on focus.
    assert.equal(metrics.input.size, touch ? '16px' : px(tokens.control), 'field consumes --floe-type-control on pointer-precise input');
    assert.deepEqual(
      metrics.buttons,
      touch ? [Math.max(44, tokens.controlSm), Math.max(44, tokens.controlMd)] : [tokens.controlSm, tokens.controlMd],
      'buttons consume the control-height scale and never fall under the touch target floor'
    );
    assert.equal(metrics.input.height, touch ? Math.max(44, tokens.controlMd) : tokens.controlMd, 'field consumes --floe-control-height-md');
    assert.equal(metrics.overflow, false);
    const input = surface.getByRole('textbox');
    await input.fill('Retained draft');
    const before = await input.boundingBox();
    await input.focus();
    assert.deepEqual(await input.boundingBox(), before);
    assert.equal(await input.inputValue(), 'Retained draft');
    const compounds = page.getByTestId('compound-scale');
    for (const field of await compounds.locator('input, textarea').all()) {
      assert.equal(await field.evaluate(node => getComputedStyle(node).fontSize), touch ? '16px' : px(tokens.control));
    }
    if (touch) {
      for (const button of await compounds.locator('button').all()) {
        const box = await button.boundingBox();
        assert.ok(box.height >= 44 && box.width >= 44, 'Compound controls retain touch targets');
      }
    }
    const reading = await page.getByTestId('reading-scale').evaluate(node => {
      const css = getComputedStyle(node);
      return { size: css.fontSize, line: css.lineHeight, root: getComputedStyle(document.documentElement).fontSize };
    });
    assert.deepEqual(
      reading,
      { size: px(tokens.body), line: px(tokens.lineBody), root: '16px' },
      'reading text consumes --floe-type-body / --floe-line-body'
    );
    const rows = await page.getByTestId('navigation-scale').locator('button').evaluateAll(nodes => nodes.map(node => {
      const bounds = node.getBoundingClientRect(), css = getComputedStyle(node);
      return { top: bounds.top, height: bounds.height, size: css.fontSize, line: css.lineHeight };
    }));
    assert.equal(rows.length, 20);
    for (const [index, row] of rows.entries()) {
      assert.ok(near(row.height, touch ? Math.max(44, tokens.row) : tokens.row), `navigation row consumes --floe-row-height (measured ${row.height}px)`);
      assert.equal(row.size, px(tokens.control), 'navigation label consumes --floe-type-control');
      assert.equal(row.line, px(tokens.lineControl), 'navigation label consumes --floe-line-control');
      if (index) assert.equal(row.top - rows[index - 1].top, row.height, 'navigation rows keep an even pitch');
    }
    await page.close();
  }
  console.log('Interface scale passed: components consume the shared type, line and control-height tokens; touch targets, readable input and retained draft hold.');
} finally { await browser.close(); await server.close(); }
