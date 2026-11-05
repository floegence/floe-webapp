/* global document, window, getComputedStyle, FormData */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { URL, fileURLToPath } from 'node:url';
import { chromium, webkit, firefox } from 'playwright';
import solid from 'vite-plugin-solid';
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(require.resolve('vite'));
const { default: tailwind } = await import(require.resolve('@tailwindcss/vite'));
const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
  configFile: false,
  root: root + 'packages/core',
  plugins: [solid(), tailwind()],
  optimizeDeps: { entries: ['test/browser/business-controls.html'] },
  resolve: {
    dedupe: ['solid-js'],
    alias: [
      { find: '@floegence/floe-webapp-core/ui', replacement: root + 'packages/core/src/ui.ts' },
      { find: '@floegence/floe-webapp-core', replacement: root + 'packages/core/src/index.ts' },
    ],
  },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } },
});
const axePath = fileURLToPath(new URL('../node_modules/axe-core/axe.min.js', import.meta.url));
let browser;
try {
  await server.listen();
  for (const [name, engine] of Object.entries(
    process.argv.includes('--all') ? { chromium, webkit, firefox } : { chromium }
  )) {
    browser = await engine.launch({ headless: true });
    for (const width of [390, 430, 768, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      page.setDefaultTimeout(12000);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(server.resolvedUrls.local[0] + 'test/browser/business-controls.html');
      await page.getByRole('heading', { name: 'Project settings' }).waitFor();
      const project = page.getByRole('textbox', { name: 'Project name', exact: true });
      await project.fill('ab');
      await page.getByRole('button', { name: 'Save settings', exact: true }).click();
      await page.getByText('Use at least three characters.', { exact: true }).waitFor();
      assert.equal(await project.getAttribute('aria-invalid'), 'true');
      assert.equal(await project.evaluate((node) => node === document.activeElement), true);
      const described = await project.evaluate((node) =>
        (node.getAttribute('aria-describedby') ?? '')
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent)
      );
      assert(described.includes('Choose a descriptive project name.'));
      assert(described.includes('Use at least three characters.'));
      await project.fill('Atlas');
      const environment = page.getByRole('combobox', { name: 'Environment', exact: true });
      await environment.focus();
      await page.keyboard.press('ArrowDown');
      await page.getByRole('listbox').waitFor();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      assert.equal(await environment.textContent(), 'Production');
      const search = page.getByRole('combobox', { name: 'Search environment', exact: true });
      await search.fill('Prod');
      await page.getByRole('option', { name: 'Production', exact: true }).click();
      assert.equal(await search.inputValue(), 'Production');
      const regions = page.getByRole('combobox', { name: 'Regions', exact: true });
      await regions.click();
      await page.getByRole('option', { name: 'Asia Pacific', exact: true }).click();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Save settings', exact: true }).click();
      await page.waitForFunction(() =>
        document.querySelector('output[aria-label="Submitted settings"]')?.textContent.includes('"environment","prod"')
      );
      const submitted = JSON.parse(await page.getByLabel('Submitted settings').textContent());
      assert.deepEqual(
        submitted.filter(([key]) => key === 'regions'),
        [
          ['regions', 'eu'],
          ['regions', 'ap'],
        ]
      );
      await page.getByRole('button', { name: 'Reset settings', exact: true }).click();
      await page.waitForFunction(
        () => document.querySelector('[name="environment"]').value === 'dev'
      );
      assert.equal(await environment.textContent(), 'Development');
      await environment.focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Tab');
      await page.getByRole('listbox').waitFor({ state: 'detached' });
      assert.equal(await search.evaluate((node) => node === document.activeElement), true);
      await page.getByRole('button', { name: 'Sort Name descending', exact: true }).click();
      assert.equal(await page.locator('tbody tr').filter({ hasText: 'Cirrus' }).count(), 1);
      await page.getByRole('checkbox', { name: 'Select all rows', exact: true }).focus();
      await page.keyboard.press('Space');
      await page.getByText('2 selected', { exact: true }).waitFor();
      await page.getByRole('textbox', { name: 'Filter projects', exact: true }).fill('Atlas');
      await page.getByRole('cell', { name: 'Atlas', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Toggle region column', exact: true }).click();
      assert.equal(
        await page.getByRole('columnheader', { name: 'Region', exact: true }).count(),
        0
      );
      const calendar = page.getByRole('grid', { name: 'Release calendar' });
      const day = calendar.getByRole('button', { name: 'Monday, November 2, 2026', exact: true });
      await day.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      assert.equal(
        await page.getByLabel('Release date', { exact: true }).inputValue(),
        '2026-11-03'
      );
      await page.getByRole('button', { name: 'Deployment details', exact: false }).click();
      await page.getByRole('textbox', { name: 'Retained deployment note' }).fill('Retain me');
      await page.getByRole('button', { name: 'Deployment details', exact: false }).click();
      await page.getByRole('button', { name: 'Deployment details', exact: false }).click();
      assert.equal(
        await page.getByRole('textbox', { name: 'Retained deployment note' }).inputValue(),
        'Retain me'
      );
      await page.getByRole('button', { name: 'Toggle direction', exact: true }).click();
      assert.equal(await environment.evaluate((node) => getComputedStyle(node).direction), 'rtl');
      assert.equal(await page.getByRole('combobox',{name:'Default choice',exact:true}).textContent(),'Use default');
      const asyncInput = page.getByLabel('Async field', { exact: true });
      await page.getByRole('button', { name: 'Toggle field error', exact: true }).click();
      assert.equal(await asyncInput.getAttribute('aria-invalid'), 'true');
      await page.getByRole('button', { name: 'Toggle field error', exact: true }).click();
      assert.equal(await asyncInput.getAttribute('aria-invalid'), null);
      await page.getByRole('button', { name: 'Validate asynchronously', exact: true }).click();
      assert.equal(
        await asyncInput.locator('xpath=ancestor::form').getAttribute('aria-busy'),
        'true'
      );
      await page.getByRole('button', { name: 'Reset async form', exact: true }).click();
      await page.getByRole('button', { name: 'Complete validation', exact: true }).click();
      assert.equal(await page.getByText('Late validation', { exact: true }).count(), 0);
      assert.equal(await page.getByLabel('Async submissions').textContent(), '0');
      assert.equal(
        await page
          .getByLabel('Remote selection', { exact: true })
          .locator('xpath=ancestor::form')
          .evaluate((form) => new FormData(form).get('remote')),
        'retained'
      );
      await page.addScriptTag({ path: axePath });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document.querySelector('main'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        });
        return result.violations.map((item) => ({
          id: item.id,
          impact: item.impact,
          nodes: item.nodes.map((node) => node.target),
        }));
      });
      assert.deepEqual(violations, [], name + ' accessibility');
      await environment.click();
      const popupViolations = await page.evaluate(async () =>
        (
          await window.axe.run(document.body, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          })
        ).violations.map((item) => item.id)
      );
      assert.deepEqual(popupViolations, [], name + ' open listbox accessibility');
      await page.keyboard.press('Escape');
      const dateTrigger = page.getByRole('button', { name: 'Choose date', exact: true }).first();
      await dateTrigger.click();
      await page.getByRole('dialog').waitFor();
      assert.equal(
        await page.getByRole('dialog').evaluate((node) => node.contains(document.activeElement)),
        true
      );
      await page.keyboard.press('Escape');
      assert.equal(await dateTrigger.evaluate((node) => node === document.activeElement), true);
      const table = page.getByRole('table', { name: 'Projects', exact: true });
      const before = await table.boundingBox();
      await page.getByRole('button', { name: 'Toggle loading', exact: true }).click();
      assert.deepEqual(
        await table.boundingBox(),
        before,
        name + ' retained table loading geometry'
      );
      await page.getByRole('button', { name: 'Toggle loading', exact: true }).click();
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        true,
        name + ' page overflow'
      );
      await page.getByRole('button', { name: 'Toggle error', exact: true }).click();
      assert.deepEqual(await table.boundingBox(), before, name + ' retained table error geometry');
      await page.getByRole('button', { name: 'Toggle error', exact: true }).click();
      await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
      await page.evaluate(() => {document.documentElement.classList.add('dark');document.documentElement.dataset.floeShellTheme='porcelain-dark';});
      await page.waitForFunction(() => getComputedStyle(document.querySelector('button')).color === 'rgb(242, 241, 238)');
      assert.deepEqual(await page.evaluate(async () => (await window.axe.run(document.body,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}))),[],name+' dark accessibility');
      assert.deepEqual(errors, [], name + ' console errors');
      console.log(
        name +
          ' ' +
          width +
          ': field relations, validation, selection, reset, keyboard, table, calendar, retention, RTL and axe passed'
      );
      await page.close();
    }
    await browser.close();
    browser = undefined;
  }
} finally {
  await browser?.close();
  await server.close();
}
