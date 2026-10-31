/* global window */
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
  const duringPress = await primary.evaluate((element) => window.getComputedStyle(element).transform);
  await page.mouse.up();
  assert.equal(duringPress, before, 'primary action keeps stable geometry while pressed');
  assert.deepEqual(errors, [], 'showcase has no browser errors');
  console.log('Demo visual refinement browser acceptance passed');
} finally {
  await browser.close();
}
