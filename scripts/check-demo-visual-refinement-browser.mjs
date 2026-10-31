/* global window, document, getComputedStyle */
import assert from 'node:assert/strict';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const baseURL = process.env.FLOE_DEMO_URL ?? 'http://127.0.0.1:61210/';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.FLOE_TEST_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.FLOE_TEST_CHROMIUM_EXECUTABLE }
    : { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.goto(new URL('?view=showcase&section=ui-buttons', baseURL).href);
  await page.waitForTimeout(350);

  await page.getByRole('heading', { name: 'Buttons', exact: true }).waitFor();

  const primary = page.getByRole('button', { name: 'Primary', exact: true }).first();
  await primary.scrollIntoViewIfNeeded();
  const before = await primary.evaluate((element) => window.getComputedStyle(element).transform);
  const bounds = await primary.boundingBox();
  assert.ok(bounds, 'primary action is visible in the showcase');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  const duringPress = await primary.evaluate(
    (element) => window.getComputedStyle(element).transform
  );
  await page.mouse.up();
  assert.equal(duringPress, before, 'primary action keeps stable geometry while pressed');
  // A one-sided layout border used to shift every label and close icon up 1px.
  // Check the real catalog in both modes, including sm/slider and closable tabs.
  for (const mode of ['light', 'dark']) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(new URL('?view=showcase&section=ui-tabs&mode=' + mode, baseURL).href);
      const tab = page.getByRole('tab', { name: 'App.tsx Close App.tsx', exact: true });
      await tab.click();
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[role="tab"]')].some(
          (el) => el.textContent.includes('App.tsx') && el.getAttribute('aria-selected') === 'true'
        )
      );
      const geometry = await page.locator('[data-floe-surface-part="tab"]').evaluateAll((tabs) =>
        tabs.map((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          const content = [...el.children].filter(
            (child) =>
              getComputedStyle(child).position !== 'absolute' &&
              child.getBoundingClientRect().height > 0
          );
          return {
            label: el.textContent,
            top: style.borderTopWidth,
            bottom: style.borderBottomWidth,
            offsets: content.map((child) => {
              const box = child.getBoundingClientRect();
              return box.y + box.height / 2 - rect.y - rect.height / 2;
            }),
          };
        })
      );
      assert(geometry.length > 8, 'all catalog tab variations were measured');
      for (const item of geometry) {
        assert.equal(item.top, item.bottom, item.label + ' has balanced face borders');
        for (const offset of item.offsets)
          assert(Math.abs(offset) <= 0.5, item.label + ' centers its label/icon');
      }
      await page.getByRole('button', { name: 'Close App.tsx', exact: true }).click();
      await tab.waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Add new tab', exact: true }).click();
      await page.getByRole('tab', { name: /NewFile/ }).waitFor();
    }
  }
  for (const mode of ['light', 'dark']) {
    for (const width of [390, 430, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(
        new URL('?view=showcase&section=scenarios&scenario=compositions&mode=' + mode, baseURL).href
      );
      await page.getByRole('heading', { name: 'Everyday building blocks' }).waitFor();
      const layout = await page.locator('.scenario-gallery').evaluate((root) => {
        const cards = [...root.querySelectorAll('[data-floe-card-variant]')];
        return {
          count: cards.length,
          overflows: cards
            .filter((card) => card.scrollWidth > card.clientWidth + 1)
            .map((card) => card.querySelector('h3').textContent),
          gaps: [...root.children].flatMap((column) =>
            [...column.children]
              .slice(1)
              .map(
                (card, index) =>
                  card.getBoundingClientRect().top -
                  column.children[index].getBoundingClientRect().bottom
              )
          ),
        };
      });
      assert.equal(layout.count, 9, 'all working compositions remain present');
      assert.deepEqual(
        layout.overflows,
        [],
        'cards keep their contents within the visible boundary'
      );
      // Compare vertical neighbors only. The final group becomes two columns on tablet.
      assert(
        layout.gaps.filter((gap) => gap >= 0).every((gap) => Math.abs(gap - 20) <= 1),
        'cards keep a consistent vertical gutter'
      );
      const gallery = page.locator('.scenario-gallery');
      const before = await gallery.boundingBox();
      await page
        .getByRole('textbox', { name: 'Project name', exact: true })
        .fill('a-very-long-project-name-that-wraps-inside-its-card');
      await page.getByRole('button', { name: 'Create project', exact: true }).click();
      await page
        .getByText('a-very-long-project-name-that-wraps-inside-its-card', { exact: true })
        .waitFor();
      const after = await gallery.boundingBox();
      assert.equal(before.width, after.width, 'long project names do not widen the gallery');
    }
  }
  assert.deepEqual(errors, [], 'showcase has no browser errors');
  console.log('Demo visual refinement browser acceptance passed');
} finally {
  await browser.close();
}
