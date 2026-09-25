import { Buffer } from 'node:buffer';
/* global window, document, navigator, getSelection */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { pdfAssetsPlugin } from '../packages/core/scripts/pdf-assets.mjs';

const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const server = await createServer({ configFile: false, root: fileURLToPath(new URL('../packages/core/', import.meta.url)),
  plugins: [pdfAssetsPlugin()], server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch({ headless: true });
const artifacts = fileURLToPath(new URL('../.cache/pdf-surface/', import.meta.url));
mkdirSync(artifacts, { recursive: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1500, height: 1300 }, deviceScaleFactor: 2 });
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' || (message.type() === 'warning' && /font|TypeError|ReferenceError/i.test(message.text()))) errors.push(message.text());
});
await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
const measurements = [];
const waitText = () => page.locator('.textLayer span').first().waitFor();
async function select(text) {
  await page.evaluate(() => getSelection()?.removeAllRanges());
  const span = page.locator('.textLayer span').filter({ hasText: text }).first();
  const rect = await span.boundingBox();
  assert(rect);
  await page.mouse.move(rect.x + 1, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width - 1, rect.y + rect.height / 2, { steps: 12 });
  await page.mouse.up();
  return page.evaluate(() => getSelection()?.toString());
}
try {
  const url = `http://127.0.0.1:${server.httpServer.address().port}/test/browser/pdf.html`;
  // Compare actual embedded glyph pixels in the same browser, with and without
  // the API missing in Electron 41 / Chromium 146. Text selection alone still
  // succeeds when PDF.js silently substitutes a font after conversion fails.
  const reference = await browser.newPage({ viewport: { width: 1500, height: 1300 }, deviceScaleFactor: 2 });
  let referencePixels;
  try {
    await reference.goto(url);
    await reference.evaluate(() => window.pdfReady);
    referencePixels = await reference.locator('#viewer canvas').evaluate(canvas => canvas.toDataURL());
  } finally { await reference.close(); }
  await page.addInitScript(() => { Reflect.deleteProperty(Math, 'sumPrecise'); });
  let compatibilityWorkerRequests = 0;
  await page.route('**/pdf.worker.min.mjs', async route => {
    const response = await route.fetch();
    compatibilityWorkerRequests++;
    await route.fulfill({ response, body: 'globalThis.__floePdfMissingSumPrecise = Reflect.deleteProperty(Math, "sumPrecise") && typeof Math.sumPrecise === "undefined";\n' + await response.text() });
  });
  await page.goto(url);
  await page.evaluate(() => window.pdfReady);
  await waitText();
  assert(compatibilityWorkerRequests > 0, 'Compatibility coverage must load a real PDF worker');
  assert(await page.workers()[0].evaluate(() => globalThis.__floePdfMissingSumPrecise), 'The worker must begin without Math.sumPrecise');
  assert.deepEqual(errors, [], 'Embedded font conversion must not fall back with a warning');
  const embeddedFonts = await page.evaluate(() => Array.from(document.fonts).filter(font => font.family.startsWith('g_')).map(font => font.status));
  assert(embeddedFonts.length > 0 && embeddedFonts.every(status => status === 'loaded'), 'Embedded PDF fonts must load');
  assert.equal(await page.locator('#viewer canvas').evaluate(canvas => canvas.toDataURL()), referencePixels, 'Embedded Chinese and Latin glyph pixels must survive the missing API');
  for (const projection of [1, 0.65, 1.5]) {
    for (const zoom of [1, 1.5]) {
      await page.evaluate(async ({ projection, zoom }) => { window.pdfTest.project(projection); await window.pdfTest.zoom(zoom); }, { projection, zoom });
      await waitText();
      assert.match(await select('Redeven selection'), /Redeven selection test/);
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+c' : 'Control+c');
      assert.match(await page.evaluate(() => navigator.clipboard.readText()), /Redeven selection test/);
      assert.match(await select('中文合同'), /中文合同预览/);
      measurements.push({ projection, zoom, selection: 'English and Chinese passed' });
    }
  }
  await page.evaluate(async () => { window.pdfTest.project(1); await window.pdfTest.zoom(1); });
  await waitText();
  assert.match(await select('中文合同'), /中文合同预览/);
  await page.getByRole('button', { name: 'Highlight selection' }).click();
  await page.waitForFunction(() => window.pdfTest.state.dirty);
  const highlight = await page.evaluate(() => window.pdfTest.saved());
  assert(highlight.annotations.some(annotation => annotation.subtype === 'Highlight'));
  writeFileSync(`${artifacts}/highlight.pdf`, Buffer.from(highlight.bytes));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  assert(!(await page.evaluate(() => window.pdfTest.saved())).annotations.some(annotation => annotation.subtype === 'Highlight'));
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  assert((await page.evaluate(() => window.pdfTest.saved())).annotations.some(annotation => annotation.subtype === 'Highlight'));
  for (const projection of [0.65, 1.5]) {
    await page.evaluate(async projection => { await window.pdfTest.load(); window.pdfTest.project(projection); }, projection);
    await waitText();
    assert.match(await select('中文合同'), /中文合同预览/);
    await page.getByRole('button', { name: 'Highlight selection' }).click();
    await page.waitForFunction(() => window.pdfTest.state.dirty);
    const annotation = (await page.evaluate(() => window.pdfTest.saved())).annotations.find(item => item.subtype === 'Highlight');
    assert(annotation);
    assert(annotation.rect[3] - annotation.rect[1] < 22, 'Projection must not inflate highlight geometry');
  }
  await page.evaluate(async () => {
    window.pdfTest.project(1);
    await Promise.all([2, 1.3, 3, 0.8, 20].map(scale => window.pdfTest.zoom(scale)));
  });
  const canvasBudget = await page.locator('#viewer canvas').evaluateAll(canvases => canvases.map(canvas => [canvas.width, canvas.height]));
  assert.equal(canvasBudget.length, 1);
  assert(canvasBudget.every(([width, height]) => width * height <= 6_000_000 && width <= 16_384 && height <= 16_384));
  await page.evaluate(() => window.pdfTest.load('forms.pdf'));
  await page.locator('input[name="full_name"]').fill('After PDF surface');
  await page.locator('input[name="accepted"]').check();
  // Virtualization and zoom must preserve form values before persistence.
  await page.evaluate(() => window.pdfTest.zoom(1.25));
  assert.equal(await page.locator('input[name="full_name"]').inputValue(), 'After PDF surface');
  await page.evaluate(() => window.pdfTest.mount(1));
  assert.equal(await page.locator('input[name="full_name"]').inputValue(), 'After PDF surface');
  const form = await page.evaluate(() => window.pdfTest.saved());
  assert.equal(form.fields.full_name[0].value, 'After PDF surface');
  assert.equal(form.fields.accepted[0].value, 'Yes');
  writeFileSync(`${artifacts}/forms.pdf`, Buffer.from(form.bytes));
  await page.evaluate(() => window.pdfTest.load('mixed-unembedded.pdf'));
  await waitText();
  assert.match(await select('中文合同'), /中文合同预览/);
  await page.evaluate(() => window.pdfTest.search('selection'));
  await page.waitForFunction(() => window.pdfTest.state.searchState?.total > 0);
  await page.locator('#outside').fill('Outside copy survives');
  await page.locator('#outside').selectText();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+c' : 'Control+c');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'Outside copy survives');
  await page.screenshot({ path: `${artifacts}/surface.png` });
  assert.deepEqual(errors, []);
  writeFileSync(`${artifacts}/results.json`, JSON.stringify({ compatibilityWorkerRequests, embeddedFonts, matchingGlyphPixels: true, measurements, canvasBudget, search: await page.evaluate(() => window.pdfTest.state.searchState), errors }, null, 2));
  console.log('PDF surface: projection, selection/copy, CMaps, search, highlight undo/redo, form round-trip and input ownership passed.');
} finally { await browser.close(); await server.close(); }
