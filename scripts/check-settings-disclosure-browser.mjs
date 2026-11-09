/* global document, window, getComputedStyle, requestAnimationFrame */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import solid from 'vite-plugin-solid';
import { createServer } from 'vite';
import { chromium, firefox, webkit } from 'playwright';
const root = resolve(import.meta.dirname, '..');
const fixture = await mkdtemp(resolve(root, 'packages/core/.settings-disclosure-test-'));
let server;
let browser;
let cases = 0;
try {
  await writeFile(resolve(fixture, 'index.html'), '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="./main.tsx"></script>');
  await writeFile(resolve(fixture, 'main.tsx'), `
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { SettingsDisclosure, SettingsList, SettingRow } from '../dist/ui.js';
import '../dist/styles.css';
function App() {
  const [open, setOpen] = createSignal(false);
  const [large, setLarge] = createSignal(false);
  window.disclosure = { setOpen, setLarge, mounts: 0 };
  function Body() { window.disclosure.mounts++; return <><input aria-label="Draft"/><SettingsDisclosure title="Recovery"><p style={{height: large() ? '180px' : '60px'}}>Nested guidance</p><button>Recover</button></SettingsDisclosure></>; }
  return <main style={{padding:'16px'}}><SettingsList><SettingRow title="Reference setting" /></SettingsList>
    <SettingsDisclosure title="Permission settings" description="Optional controls" open={open()} onOpenChange={setOpen}><Body /></SettingsDisclosure>
    <button>Following action</button>
  </main>;
}
render(() => <App />, document.getElementById('root'));
`);
  server = await createServer({ configFile: false, root: resolve(root, 'packages/core'), plugins: [solid()],
    optimizeDeps: { entries: [resolve(fixture, 'index.html')] }, server: { host: '127.0.0.1', port: 0, watch: null } });
  await server.listen();
  for (const [name, engine] of Object.entries(process.argv.includes('--all') ? { chromium, firefox, webkit } : { chromium })) {
    browser = await engine.launch({ headless: true });
    for (const width of [320, 1280]) for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${server.resolvedUrls.local[0]}${fixture.split('/').at(-1)}/`);
      const trigger = page.getByRole('button', { name: 'Permission settings', exact: true });
      await trigger.waitFor();
      assert.equal(await page.evaluate(() => window.disclosure.mounts), 0, 'lazy content before first expansion');
      const sample = async (open) => page.evaluate(async (open) => {
        const panel = document.querySelector('.floe-settings-disclosure__panel');
        const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
        void getComputedStyle(panel).gridTemplateRows;
        window.disclosure.setOpen(open);
        void getComputedStyle(panel).gridTemplateRows;
        await frame();
        const animations = panel.getAnimations().filter(a => a.transitionProperty === 'grid-template-rows');
        const read = () => panel.getBoundingClientRect().height;
        animations.forEach(a => { a.pause(); a.currentTime = 0; });
        const start = read();
        animations.forEach(a => { a.currentTime = Number(a.effect.getTiming().duration) / 2; });
        const middle = read();
        animations.forEach(a => a.finish());
        await frame(); await frame();
        return { start, middle, end: read(), count: animations.length };
      }, open);
      const opening = await sample(true);
      if (reducedMotion === 'no-preference') {
        assert.equal(opening.count, 1, `${name}: opening transition`);
        assert.ok(opening.middle > opening.start && opening.middle < opening.end, JSON.stringify(opening));
      } else assert.equal(opening.count, 0, 'reduced motion opens immediately');
      await page.getByLabel('Draft').fill('Retained draft');
      await page.getByRole('button', { name: 'Recovery', exact: true }).click();
      await page.getByRole('button', { name: 'Recover', exact: true }).waitFor();
      await page.waitForFunction(() => !document.querySelector('.floe-settings-disclosure__panel').getAnimations({ subtree: true }).length);
      const initialHeight = await page.locator('main > .floe-settings-disclosure').evaluate(e => e.getBoundingClientRect().height);
      await page.evaluate(() => window.disclosure.setLarge(true));
      assert.ok(await page.locator('main > .floe-settings-disclosure').evaluate(e => e.getBoundingClientRect().height) > initialHeight + 100, 'nested dynamic content uses natural height');
      await page.getByLabel('Draft').focus();
      const closing = await sample(false);
      if (reducedMotion === 'no-preference') {
        assert.equal(closing.count, 1, `${name}: closing transition`);
        assert.ok(closing.middle < closing.start && closing.middle > closing.end, JSON.stringify(closing));
      }
      assert.equal(closing.end, 0, 'collapsed height');
      assert.equal(await trigger.evaluate(e => e === document.activeElement), true, 'collapse restores focus');
      assert.equal(await page.locator('main > .floe-settings-disclosure > .floe-settings-disclosure__panel').evaluate(e => e.inert), true);
      await page.keyboard.press('Enter');
      await page.getByLabel('Draft').waitFor();
      assert.equal(await page.getByLabel('Draft').inputValue(), 'Retained draft');
      assert.equal(await page.evaluate(() => window.disclosure.mounts), 1, 'content owner retained');
      await page.evaluate(async () => { for (let i = 0; i < 8; i++) { window.disclosure.setOpen(i % 2 === 0); await new Promise(resolve => requestAnimationFrame(resolve)); } window.disclosure.setOpen(true); });
      await page.waitForFunction(() => !document.querySelector('.floe-settings-disclosure__panel').getAnimations().length);
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      assert.ok(await page.getByRole('button', { name: 'Recover', exact: true }).isVisible(), 'nested state survives reversal');
      const geometry = await page.evaluate(() => {
        const reference = getComputedStyle(document.querySelector('.floe-settings-list'));
        const group = getComputedStyle(document.querySelector('.floe-settings-disclosure'));
        return { radius: group.borderRadius, referenceRadius: reference.borderRadius, border: group.borderTopStyle, width: document.documentElement.scrollWidth };
      });
      assert.equal(geometry.radius, geometry.referenceRadius); assert.equal(geometry.border, 'solid'); assert.ok(geometry.width <= width);
      assert.deepEqual(errors, []);
      cases++;
      await page.close();
    }
    await browser.close(); browser = undefined;
  }
  console.log(`Settings disclosure: ${cases} browser/width/motion cases passed; bidirectional motion, nested height, retention, reversal, focus and shared boundaries.`);
} finally { await browser?.close(); await server?.close(); await rm(fixture, { recursive: true, force: true }); }
