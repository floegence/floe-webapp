/* global document, window, getComputedStyle */
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
const fixture = await mkdtemp(resolve(root, 'packages/core/.settings-heading-test-'));
let server;
let browser;
try {
  await writeFile(resolve(fixture, 'index.html'), '<div id="root"></div><script type="module" src="./main.tsx"></script>');
  await writeFile(resolve(fixture, 'main.tsx'), `
import { Show, createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { Dialog, Select, SettingRow, SettingsSection, ThemePicker } from '../dist/ui.js';
import '../dist/styles.css';
import { builtInShellThemePresets, getShellThemePresetsForMode } from '../dist/themes.js';
function App() {
  const [hosted, setHosted] = createSignal(true);
  const [metadata, setMetadata] = createSignal('');
  const [title, setTitle] = createSignal('Terminal');
  const [rowVisible, setRowVisible] = createSignal(true);
  const [choiceOpen, setChoiceOpen] = createSignal(false);
  const [choice, setChoice] = createSignal('balanced');
  const changes = [];
  const [mode, setMode] = createSignal('system');
  const [preset, setPreset] = createSignal('porcelain-dark');
  window.settingsHeadingFixture = { setHosted, setMetadata, setTitle, setRowVisible, setChoiceOpen, changes };
  return <Dialog open onOpenChange={() => {}} title={hosted() ? title() : 'Settings'} closeLabel="Close settings">
    <SettingsSection data-page title={title()} variant="page" showHeading={!hosted()}
      description={metadata() === 'description' || metadata() === 'all' ? 'Session preferences' : undefined}
      badge={<Show when={metadata() === 'badge' || metadata() === 'all'}><span>Managed</span></Show>}
      actions={<Show when={metadata() === 'actions' || metadata() === 'all'}><button type="button">Reset</button></Show>}>
      <input aria-label="Shell" />
      <SettingsSection title="Appearance"><p>Retained detail</p>
        <ThemePicker mode={mode()} modes={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          modeLabel="Color mode" presetsLabel="Themes" pendingLabel="Switching appearance" selectedPreset={preset()} presetLabel={p => p.displayName}
          presets={getShellThemePresetsForMode(builtInShellThemePresets, mode() === 'light' ? 'light' : 'dark')}
          onModeChange={setMode} onPresetChange={p => setPreset(p.name)} />
      </SettingsSection>
      <Show when={rowVisible()}>
        <SettingRow title="Picture quality" control={<Select ariaLabel="Picture quality"
          value={choice()} onChange={(value) => { changes.push(value); setChoice(value); }}
          open={choiceOpen()} onOpenChange={setChoiceOpen}
          options={[{ value: 'balanced', label: 'Balanced' }, { value: 'smooth', label: 'Motion first' }]} />} />
      </Show>
    </SettingsSection>
  </Dialog>;
}
render(() => <App />, document.getElementById('root'));
`);
  server = await createServer({ configFile: false, root: resolve(root, 'packages/core'), plugins: [solid()],
    optimizeDeps: { entries: [resolve(fixture, 'index.html')] },
    server: { host: '127.0.0.1', port: 0, watch: null } });
  await server.listen();
  browser = process.env.FLOE_TEST_BROWSER_WS
    ? await chromium.connect(process.env.FLOE_TEST_BROWSER_WS, { exposeNetwork: '<loopback>' })
    : await chromium.launch({ headless: true, ...(process.env.FLOE_TEST_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.FLOE_TEST_CHROMIUM_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${server.resolvedUrls.local[0]}${fixture.split('/').at(-1)}/`);
  const dialog = page.getByRole('dialog', { name: 'Terminal', exact: true });
  await dialog.waitFor();
  const section = page.locator('[data-page]');
  const header = section.locator(':scope > header');
  assert.equal(await page.getByRole('heading', { name: 'Terminal', exact: true }).count(), 1);
  assert.equal(await header.count(), 0, 'a hosted page without metadata has no empty header');
  assert.equal(await page.getByRole('region', { name: 'Terminal', exact: true }).count(), 1);
  assert.equal(await page.getByRole('heading', { name: 'Appearance', exact: true }).count(), 1);
  const picker = page.getByRole('combobox', { name: 'Picture quality', exact: true });
  await picker.click();
  await page.getByRole('listbox', { name: 'Picture quality', exact: true }).waitFor();
  assert.equal(await page.getByRole('listbox', { name: 'Picture quality', exact: true }).count(), 1);
  await page.getByRole('option', { name: 'Motion first', exact: true }).click();
  await page.getByRole('listbox').waitFor({ state: 'detached' });
  assert.deepEqual(await page.evaluate(() => window.settingsHeadingFixture.changes), ['smooth']);
  assert.equal(await picker.textContent(), 'Motion first');
  await picker.click();
  await page.getByRole('listbox').waitFor();
  await page.evaluate(() => window.settingsHeadingFixture.setMetadata('all'));
  assert.equal(await page.getByRole('listbox').count(), 1);
  await page.evaluate(() => window.settingsHeadingFixture.setChoiceOpen(false));
  await page.getByRole('listbox').waitFor({ state: 'detached' });
  await page.evaluate(() => window.settingsHeadingFixture.setChoiceOpen(true));
  await page.getByRole('listbox').waitFor();
  await page.evaluate(() => window.settingsHeadingFixture.setRowVisible(false));
  await page.getByRole('listbox').waitFor({ state: 'detached' });
  assert.equal(await picker.count(), 0);
  await page.evaluate(() => {
    window.settingsHeadingFixture.setChoiceOpen(false);
    window.settingsHeadingFixture.setMetadata('');
  });
  await page.getByLabel('Shell', { exact: true }).fill('Retained draft');
  await page.evaluate(() => { window.retainedSettingsInput = document.querySelector('[aria-label="Shell"]'); });
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForFunction((viewportWidth) => {
      const box = document.querySelector('[data-page]').getBoundingClientRect();
      return box.left >= 0 && box.right <= viewportWidth + 1;
    }, width);
    for (const metadata of ['description', 'badge', 'actions', 'all', '']) {
      await page.evaluate((value) => window.settingsHeadingFixture.setMetadata(value), metadata);
      assert.equal(await header.count(), metadata ? 1 : 0);
      assert.equal(await section.locator(':scope > header h1, :scope > header h2').count(), 0);
      if (metadata === 'description') {
        assert.equal(await header.locator('p').textContent(), 'Session preferences');
        assert.equal(await header.locator('p').evaluate((el) => getComputedStyle(el).marginTop), '0px');
      }
      if (metadata === 'badge') assert.equal(await header.textContent(), 'Managed');
      if (metadata === 'actions') assert.equal(await header.getByRole('button', { name: 'Reset' }).count(), 1);
      const box = await section.boundingBox();
      assert(box.x >= 0 && box.x + box.width <= width + 1, `hosted page overflows ${width}: ${JSON.stringify(box)}`);
      assert(await page.evaluate(() => document.querySelector('[aria-label="Shell"]') === window.retainedSettingsInput));
      assert.equal(await page.getByLabel('Shell', { exact: true }).inputValue(), 'Retained draft');
    }
  }
  await page.evaluate(() => window.settingsHeadingFixture.setTitle('Host applications'));
  assert.equal(await page.getByRole('dialog', { name: 'Host applications', exact: true }).count(), 1);
  assert.equal(await page.getByRole('region', { name: 'Host applications', exact: true }).count(), 1);
  await page.evaluate(() => window.settingsHeadingFixture.setHosted(false));
  assert.equal(await section.locator('h1').textContent(), 'Host applications');
  assert.equal(await page.getByRole('dialog', { name: 'Settings', exact: true }).count(), 1);
  assert.equal(await page.getByRole('heading', { name: 'Appearance', exact: true }).count(), 1);

  // IMPORTANT: Qualify the published controlled picker, including intrinsic
  // sizing and keyboard selection; source-class checks cannot prove geometry.
  const modeRail = page.getByRole('radiogroup', { name: 'Color mode' });
  await modeRail.getByRole('radio', { name: 'System', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await modeRail.getByRole('radio', { name: 'Light', exact: true }).getAttribute('aria-checked'), 'true');
  const modeBox = await modeRail.boundingBox();
  assert.ok(modeBox.width < 300 && modeBox.height <= 36, JSON.stringify(modeBox));
  await page.getByRole('radiogroup', { name: 'Themes' }).getByRole('radio').first().click();
  assert.equal(await page.getByRole('radiogroup', { name: 'Themes' }).getByRole('radio').first().getAttribute('aria-checked'), 'true');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    assert.ok(await page.locator('.floe-theme-picker').evaluate(e => e.scrollWidth <= e.clientWidth + 1));
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  assert.deepEqual(errors, []);
  console.log('Settings ownership passed: real dialog, single controlled Select portal, selection and disposal, accessible naming, heading ownership, retained input and three widths.');
} finally {
  await browser?.close();
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
