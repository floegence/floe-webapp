/* global document, window, performance, requestAnimationFrame, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, URL } from 'node:url';
import solid from 'vite-plugin-solid';
import { chromium } from 'playwright';

const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const root = resolve(import.meta.dirname, '..');
const fixture = await mkdtemp(resolve(root, 'packages/core/.companion-test-'));
let server;
let browser;
try {
  await writeFile(
    resolve(fixture, 'index.html'),
    '<div id="root"></div><script type="module" src="./main.tsx"></script>'
  );
  await writeFile(
    resolve(fixture, 'main.tsx'),
    `
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { BottomBarCompanion } from '../dist/layout.js';
import '../dist/styles.css';
function App() {
  const [open, setOpen] = createSignal(false);
  const [anchor, setAnchor] = createSignal(null);
  const [host, setHost] = createSignal(null);
  window.setCompanionOpen = setOpen;
  return <>
    <div ref={setAnchor} data-anchor style={{position:'fixed',bottom:'3px',left:'calc(50% - 160px)',width:'320px',height:'22px'}} />
    <div ref={setHost} />
    <BottomBarCompanion retained visible open={open()} anchor={anchor()} mount={host()}
      expandedWidth={544} maxHeight={410} id="companion" label="Companion" onDismiss={() => setOpen(false)}>
      <textarea aria-label="Message" onFocus={() => setOpen(true)} />
    </BottomBarCompanion>
    <button data-outside>Outside</button>
  </>;
}
render(() => <App />, document.getElementById('root'));
`
  );
  server = await createServer({
    configFile: false,
    root: resolve(root, 'packages/core'),
    plugins: [solid()],
    optimizeDeps: { entries: [resolve(fixture, 'index.html')] },
    server: { host: '127.0.0.1', port: 0 },
  });
  await server.listen();
  browser = process.env.FLOE_TEST_BROWSER_WS
    ? await chromium.connect(process.env.FLOE_TEST_BROWSER_WS, { exposeNetwork: '<loopback>' })
    : await chromium.launch({
        headless: true,
        ...(process.env.FLOE_TEST_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.FLOE_TEST_CHROMIUM_EXECUTABLE }
          : {}),
      });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${server.resolvedUrls.local[0]}${fixture.split('/').at(-1)}/`);
  const surface = page.locator('[data-floe-bottom-bar-companion]');
  await surface.waitFor();
  await page.waitForFunction(
    () => document.querySelector('#companion')?.getBoundingClientRect().height === 22
  );
  const samples = await page.evaluate(async () => {
    const surface = document.querySelector('#companion');
    const input = surface.querySelector('textarea');
    window.originalInput = input;
    input.value = 'Keep this selected draft';
    const samples = [];
    input.focus();
    input.setSelectionRange(5, 9);
    const start = performance.now();
    while (performance.now() - start < 500) {
      await new Promise(requestAnimationFrame);
      const box = surface.getBoundingClientRect();
      samples.push({ width: box.width, height: box.height, bottom: box.bottom, phase: surface.dataset.companionPhase });
    }
    return samples;
  });
  if (!samples.some(s => s.width > 322 && s.width < 542)) console.log(samples.slice(0, 12));
  assert(
    samples.some((s) => s.width > 322 && s.width < 542 && s.height > 24 && s.height < 408),
    'width and height must interpolate together'
  );
  assert(
    samples.every((s) => Math.abs(s.bottom - 897) < 0.1),
    'bottom edge must stay attached throughout growth'
  );
  assert.equal(await surface.getAttribute('data-companion-phase'), 'expanded');
  // Interrupt after the CSS target has committed, including a resize during reversal.
  await page.evaluate(() => window.setCompanionOpen(false));
  await page.waitForTimeout(80);
  const interrupted = await surface.boundingBox();
  assert(interrupted.height > 22 && interrupted.height < 410);
  await page.evaluate(() => window.setCompanionOpen(true));
  await page.waitForFunction(
    () => document.querySelector('#companion')?.dataset.companionPhase === 'expanded'
  );
  await page.waitForTimeout(400);
  await page.evaluate(() => window.setCompanionOpen(false));
  await page.waitForTimeout(80);
  await page.setViewportSize({ width: 390, height: 600 });
  await page.waitForFunction(
    () => document.querySelector('#companion')?.dataset.companionPhase === 'collapsed'
  );
  await page.waitForTimeout(400);
  assert.equal((await surface.boundingBox()).height, 22);
  await page.evaluate(() => window.setCompanionOpen(true));
  await page.waitForFunction(
    () => document.querySelector('#companion')?.dataset.companionPhase === 'expanded'
  );
  const narrow = await surface.boundingBox();
  assert(
    Math.abs(narrow.width - 366) < 0.1 &&
      narrow.x >= 12 &&
      Math.abs(narrow.y + narrow.height - 597) < 0.1
  );
  assert(
    await page.evaluate(() => {
      const input = document.querySelector('textarea');
      return (
        input === window.originalInput &&
        document.activeElement === input &&
        input.value === 'Keep this selected draft' &&
        input.selectionStart === 5 &&
        input.selectionEnd === 9 &&
        document.querySelectorAll('textarea').length === 1
      );
    }),
    'native input, draft, selection and focus must survive expansion, reversal and resize'
  );
  await page.locator('textarea').dispatchEvent('keydown', { key: 'Escape', isComposing: true });
  assert.equal(
    await surface.getAttribute('data-companion-phase'),
    'expanded',
    'IME Escape must not dismiss'
  );
  await page.locator('textarea').press('Escape');
  await page.waitForFunction(
    () => document.querySelector('#companion')?.dataset.companionPhase === 'collapsed'
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => window.setCompanionOpen(true));
  await page.waitForFunction(
    () => document.querySelector('#companion')?.dataset.companionPhase === 'expanded'
  );
  assert.equal(await surface.evaluate((el) => getComputedStyle(el).transitionDuration), '0s');
  await page.locator('[data-outside]').click();
  await page.waitForFunction(
    () => document.querySelector('#companion')?.dataset.companionPhase === 'collapsed'
  );
  assert.deepEqual(errors, []);
  console.log(
    'Companion morph, fixed bottom edge, reversal, resize, native input, IME and reduced motion passed in Chromium.'
  );
} finally {
  await browser?.close();
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
