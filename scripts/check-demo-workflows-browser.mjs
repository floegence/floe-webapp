/* global document, innerWidth, navigator */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const origin = process.env.FLOE_DEMO_URL ?? 'http://127.0.0.1:61340/';
const output = '.cache/design-review/acceptance';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.FLOE_TEST_CHROMIUM_EXECUTABLE ??
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const results = [];
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
  ]) {
    const context = await browser.newContext({
      viewport,
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    console.log('Starting workflows at width ' + viewport.width);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const route = (query) => new URL(query, origin).href;
    await page.goto(route('?view=showcase&section=scenarios&scenario=overview&mode=light'));
    await page.getByRole('heading', { name: 'Deployment health', exact: true }).waitFor();
    const metric = page.locator('[data-metric="Deployments"] dd').first();
    const seven = await metric.textContent();
    await page.getByRole('radio', { name: '30 days', exact: true }).click();
    await page.waitForFunction(
      (value) => document.querySelector('[data-metric="Deployments"] dd').textContent !== value,
      seven
    );
    await page.getByLabel('Search deployments', { exact: true }).fill('no-such-service');
    await page.getByText('No deployments match', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    const detail = page.getByRole('button', { name: /^Inspect / }).first();
    await detail.click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.screenshot({ path: output + '/overview-' + viewport.width + '.png' });
    await page.locator('#scenario-tab-files').click();
    const editor = page.getByRole('textbox', { name: 'Edit release.md', exact: true });
    await editor.fill('# Acceptance draft');
    await page.getByRole('button', { name: /checklist.md/ }).click();
    await page.getByRole('button', { name: /release.md/ }).click();
    assert.equal(await editor.inputValue(), '# Acceptance draft');
    await page.getByLabel('Simulate a save failure').focus();
    await page.keyboard.press('Space');
    const save = page.getByRole('button', { name: 'Save file', exact: true });
    await save.scrollIntoViewIfNeeded();
    const before = await save.boundingBox();
    await save.click();
    const during = await save.boundingBox();
    assert.equal(before.width, during.width);
    assert.equal(before.height, during.height);
    await page.getByRole('alert').filter({ hasText: 'example save failed' }).waitFor();
    assert.equal(await editor.inputValue(), '# Acceptance draft');
    await page.getByLabel('Simulate a save failure').focus();
    await page.keyboard.press('Space');
    await save.click();
    await page.waitForFunction(() =>
      document.querySelector('[data-scenario="files"]').textContent.includes('Saved locally')
    );
    await page.waitForTimeout(750);
    await page.reload();
    await editor.waitFor();
    assert.equal(await editor.inputValue(), '# Acceptance draft');
    await page.getByRole('tab', { name: 'Overview', exact: true }).click();
    await page.locator('#scenario-tab-files').click();
    assert.equal(await editor.inputValue(), '# Acceptance draft');
    await page.screenshot({ path: output + '/files-' + viewport.width + '.png' });
    await page.getByRole('tab', { name: 'Tasks', exact: true }).click();
    await page.getByRole('button', { name: 'Run check', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel task', exact: true }).click();
    await page
      .getByText('Cancelled by you. No further work is scheduled.', { exact: true })
      .waitFor();
    await page.waitForTimeout(1000);
    assert.match(
      await page.locator('[data-scenario="task"] [role="status"]').textContent(),
      /Cancelled/
    );
    await page.getByLabel('Example outcome', { exact: true }).selectOption('failure');
    await page.getByRole('button', { name: 'Run check', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Accessibility check failed' }).waitFor();
    await page.getByLabel('Example outcome', { exact: true }).selectOption('success');
    await page.getByRole('button', { name: 'Run check', exact: true }).click();
    await page.getByRole('button', { name: 'View report', exact: true }).waitFor();
    await page.getByRole('button', { name: 'View report', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    console.log('Core workflows passed at width ' + viewport.width);
    await page.getByRole('tab', { name: 'Examples', exact: true }).click();
    await page.getByRole('heading', { name: 'Everyday building blocks', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Create project', exact: true }).click();
    await page.getByText('Use at least 3 characters.', { exact: true }).waitFor();
    const projectName =
      'release-preview-' + viewport.width + '-long-project-name-for-responsive-review';
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill(projectName);
    await page.getByRole('button', { name: 'Visibility', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Internal', exact: true }).click();
    const create = page.getByRole('button', { name: 'Create project', exact: true });
    await create.scrollIntoViewIfNeeded();
    const createBefore = await create.boundingBox();
    await create.click();
    const createDuring = await create.boundingBox();
    assert.equal(createBefore.width, createDuring.width);
    assert.equal(createBefore.height, createDuring.height);
    await page.getByText(projectName, { exact: true }).waitFor();
    await page
      .getByRole('textbox', { name: 'Search example projects', exact: true })
      .fill('no-match');
    await page.getByText('No matching projects.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Clear project search', exact: true }).click();
    await page.getByRole('button', { name: 'Copy example link', exact: true }).click();
    assert.match(
      await page.evaluate(() => navigator.clipboard.readText()),
      /scenario=compositions/
    );
    await page
      .getByRole('textbox', { name: 'Reply to release thread', exact: true })
      .fill('Acceptance message');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await page
      .getByRole('list', { name: 'Local conversation', exact: true })
      .getByText('Acceptance message')
      .waitFor();
    await page.getByRole('button', { name: 'Save checklist snapshot', exact: true }).click();
    const check = page.getByRole('checkbox', { name: 'Verify narrow layout', exact: true });
    await check.focus();
    await page.keyboard.press('Space');
    assert.equal(await check.isChecked(), true);
    await page.getByRole('button', { name: 'Restore snapshot', exact: true }).click();
    assert.equal(await check.isChecked(), false);
    await page.getByRole('button', { name: 'Mark all read', exact: true }).click();
    assert.equal(await page.getByText('Unread', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'View usage details', exact: true }).click();
    await page.getByRole('dialog', { name: 'Example usage', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page
      .getByRole('heading', { name: 'Everyday building blocks', exact: true })
      .scrollIntoViewIfNeeded();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false
    );
    await page.screenshot({ path: output + '/compositions-' + viewport.width + '.png' });
    for (const mode of ['light', 'dark']) {
      await page.goto(route('?view=showcase&section=home&mode=' + mode));
      await page.getByRole('heading', { name: 'Floe Webapp', exact: true }).waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, 'page has no horizontal overflow');
      await page.screenshot({ path: output + '/home-' + mode + '-' + viewport.width + '.png' });
    }
    await page.goto(route('?view=showcase&section=scenarios&scenario=compositions&mode=dark'));
    await page.getByRole('heading', { name: 'Everyday building blocks', exact: true }).waitFor();
    await page.waitForFunction(() => {
      const tab = document.getElementById('scenario-tab-compositions');
      const target = tab.getBoundingClientRect();
      const rail = tab.closest('[role="tablist"]').getBoundingClientRect();
      return target.left >= rail.left - 1 && target.right <= rail.right + 1;
    });
    await page.screenshot({ path: output + '/compositions-dark-' + viewport.width + '.png' });
    assert.deepEqual(errors, []);
    results.push({ viewport, workflows: 'passed', errors });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
  writeFileSync(output + '/report.json', JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
