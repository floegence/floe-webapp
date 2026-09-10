/* global window, document, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openSurfaceBrowser, artifactRoot } from './surface-browser-utils.mjs';

const runtime = await openSurfaceBrowser();
const output = resolve(artifactRoot, 'components');
mkdirSync(output, { recursive: true });
const report = {
  browser: runtime.browser.version(),
  renderer: runtime.renderer,
  entries: [],
  checks: [],
};
const snapshot = () =>
  [
    ...document.querySelectorAll(
      '[data-component-gallery] :is(button,input,textarea,[role="tab"],[role="progressbar"],.floe-tag)'
    ),
  ].map((el) => {
    const s = getComputedStyle(el),
      r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      role: el.getAttribute('role'),
      width: r.width,
      height: r.height,
      padding: s.padding,
      border: s.borderWidth,
      color: s.color,
      background: s.backgroundColor,
      shadow: s.boxShadow,
      transform: s.transform,
    };
  });
async function open(version, entry, mode, surface) {
  const page = await runtime.browser.newPage({
    viewport: { width: 1440, height: 1080 },
    deviceScaleFactor: 1,
  });
  await page.goto(
    `${runtime.baseURL}/${version}-${entry}/dist/?panel=components&mode=${mode}&surface=${surface}`
  );
  await page.waitForFunction(() => !!window.surfaceFixture);
  await page.waitForTimeout(350);
  return page;
}
try {
  for (const entry of ['styles', 'tailwind']) {
    for (const mode of ['light', 'dark']) {
      const page = await open('current', entry, mode, 'standard');
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const baseline = await open('baseline', entry, mode, 'standard');
      const before = await page.evaluate(snapshot);
      assert.deepEqual(
        before,
        await baseline.evaluate(snapshot),
        `${entry}/${mode}: published standard controls stay visually compatible`
      );
      // Baseline reproduces a visual-only mixed state. The current native property
      // and ARIA state must agree with its existing minus indicator.
      assert.equal(
        await baseline
          .getByRole('checkbox', { name: 'Mixed selection', exact: true })
          .evaluate((el) => el.indeterminate),
        false
      );
      await baseline.screenshot({ path: resolve(output, `${entry}-A-${mode}.png`) });
      await baseline.close();
      await page.screenshot({ path: resolve(output, `${entry}-B-${mode}.png`) });
      await page.evaluate(() => window.surfaceFixture.theme.setSurfaceStyle('soft-neumorphic'));
      await page.waitForTimeout(350);
      const after = await page.evaluate(snapshot);
      assert.deepEqual(
        after.map(({ tag, role, width, height, padding, border }) => ({
          tag,
          role,
          width,
          height,
          padding,
          border,
        })),
        before.map(({ tag, role, width, height, padding, border }) => ({
          tag,
          role,
          width,
          height,
          padding,
          border,
        })),
        `${entry}/${mode}: material preserves control geometry`
      );
      const tags = page.locator('.floe-tag');
      assert.ok((await tags.count()) >= 16);
      for (const part of [
        'badge',
        'indicator',
        'switch-track',
        'switch-thumb',
        'segment',
        'progress-track',
        'progress-fill',
        'progress-circle',
        'step',
      ]) {
        const shadows = await page
          .locator(`[data-floe-surface-part="${part}"]`)
          .evaluateAll((els) => els.map((el) => getComputedStyle(el).boxShadow));
        assert.ok(
          shadows.some((s) => s !== 'none' && !s.startsWith('rgba(0, 0, 0, 0)')),
          `${mode}: visible ${part} relief`
        );
      }
      await page.evaluate(() =>
        document.documentElement.style.setProperty(
          '--floe-surface-shadow-raised',
          '1px 2px 7px rgb(12, 23, 34)'
        )
      );
      assert.match(
        await tags.first().evaluate((el) => getComputedStyle(el).boxShadow),
        /7px/,
        'public shadow override reaches compact controls'
      );
      await tags.first().evaluate((el) => el.setAttribute('data-floe-surface', 'flat'));
      assert.match(
        await tags.first().evaluate((el) => getComputedStyle(el).boxShadow),
        /rgba\(0, 0, 0, 0\)/,
        'explicit flat overrides compact material'
      );
      await tags.first().evaluate((el) => el.setAttribute('data-floe-surface', 'raised'));
      await page.evaluate(() =>
        document.documentElement.style.removeProperty('--floe-surface-shadow-raised')
      );
      const radioColors = await page
        .locator('[data-radio-variant="default"] [data-floe-surface-part="radio-dot"]')
        .first()
        .evaluate((el) => ({
          dot: getComputedStyle(el).backgroundColor,
          well: getComputedStyle(el.parentElement).backgroundColor,
        }));
      assert.notEqual(
        radioColors.dot,
        radioColors.well,
        'selected radio dot remains distinct from its well'
      );
      const mixed = page.getByRole('checkbox', { name: 'Mixed selection', exact: true });
      assert.equal(await mixed.evaluate((el) => el.indeterminate), true);
      assert.equal(await mixed.getAttribute('aria-checked'), 'mixed');
      await page.screenshot({ path: resolve(output, `${entry}-C-${mode}.png`) });
      // Keyboard focus must decorate the actual face, including nested card labels.
      for (const variant of ['default', 'button', 'card', 'tile']) {
        const group = page.locator(`[data-radio-variant="${variant}"]`);
        await group.getByText('Cloud', { exact: true }).click();
        assert.equal(
          await group.getByRole('radio', { name: 'Cloud', exact: true }).isChecked(),
          true
        );
        const selected = group.getByRole('radio', { name: 'Cloud', exact: true });
        await page.keyboard.press('Tab');
        await selected.focus();
        assert.equal(
          await selected.evaluate((el) => {
            const face = el.closest('[data-floe-surface-part="choice"]') ?? el.nextElementSibling;
            return (
              getComputedStyle(face).outlineStyle === 'solid' &&
              parseFloat(getComputedStyle(face).outlineWidth) >= 2
            );
          }),
          true,
          `${variant}: visible keyboard focus`
        );
        await selected.press('ArrowLeft');
        assert.equal(
          await group.getByRole('radio', { name: 'Local', exact: true }).isChecked(),
          true
        );
        assert.equal(
          await group.getByRole('radio', { name: 'Locked', exact: true }).isDisabled(),
          true
        );
      }
      const checkbox = page.getByRole('checkbox', { name: 'Notifications', exact: true });
      await checkbox.focus();
      await checkbox.press('Space');
      assert.equal(await checkbox.isChecked(), false);
      await checkbox.press('Space');
      assert.equal(await checkbox.isChecked(), true);
      await mixed.focus();
      await mixed.press('Space');
      assert.equal(await mixed.isChecked(), true);
      assert.equal(await mixed.evaluate((el) => el.indeterminate), false);
      for (const size of ['sm', 'md', 'lg']) {
        const toggle = page.getByRole('switch', { name: `Sync ${size}`, exact: true });
        await toggle.focus();
        const thumb = toggle.locator('..').locator('[data-floe-surface-part="switch-thumb"]');
        const transform = await thumb.evaluate((el) => getComputedStyle(el).translate);
        await toggle.press('Space');
        await page.waitForTimeout(240);
        assert.equal(await toggle.isChecked(), false);
        assert.notEqual(
          await thumb.evaluate((el) => getComputedStyle(el).translate),
          transform,
          `${size}: thumb travels`
        );
        assert.equal(
          await toggle.evaluate((el) => getComputedStyle(el.nextElementSibling).outlineStyle),
          'solid'
        );
        await toggle.press('Space');
      }
      const optional = page.getByRole('switch', { name: 'Off md', exact: true });
      await optional.focus();
      await optional.press('Space');
      assert.equal(await optional.isChecked(), true);
      await optional.press('Space');
      assert.equal(await optional.isChecked(), false);
      await page.getByRole('radio', { name: 'Week', exact: true }).click();
      assert.equal(
        await page.getByRole('radio', { name: 'Week', exact: true }).getAttribute('aria-checked'),
        'true'
      );
      await page
        .getByLabel('Pagination', { exact: true })
        .getByRole('button', { name: '3', exact: true })
        .click();
      assert.equal(
        await page
          .getByLabel('Pagination', { exact: true })
          .getByRole('button', { name: '3', exact: true })
          .getAttribute('aria-current'),
        'page'
      );
      const tab = page.getByRole('tab', { name: 'Activity', exact: true });
      await tab.click();
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
      const bars = page.locator(
        '[data-gallery-group="progress"] [role="progressbar"][aria-valuenow]'
      );
      assert.equal(await bars.first().getAttribute('aria-valuenow'), '64');
      await page.getByRole('button', { name: 'Advance progress', exact: true }).click();
      await page.waitForTimeout(350);
      assert.equal(await bars.first().getAttribute('aria-valuenow'), '76');
      const filled = page
        .locator('[data-gallery-group="progress"] [data-floe-surface-part="progress-track"]')
        .first();
      assert.ok(
        await filled.evaluate(
          (el) =>
            Math.abs(
              el.querySelector('[data-floe-surface-part="progress-fill"]').getBoundingClientRect()
                .width /
                el.getBoundingClientRect().width -
                0.76
            ) < 0.01
        )
      );
      await page.getByRole('button', { name: 'Next stage', exact: true }).click();
      assert.equal(
        await page
          .locator('[data-gallery-group="steps"]')
          .getByText('Stage 3', { exact: true })
          .count(),
        1
      );
      await page.screenshot({ path: resolve(output, `${entry}-C-${mode}-lower.png`) });
      await page.getByRole('button', { name: 'Open component dialog', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      assert.equal(await dialog.getAttribute('data-floe-surface'), 'floating');
      await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
      await page.getByRole('button', { name: 'Component menu', exact: true }).click();
      const menu = page.getByRole('menu');
      await menu.waitFor();
      assert.equal(await menu.first().getAttribute('data-floe-surface'), 'floating');
      await page.keyboard.press('Escape');
      await page.locator('[data-gallery-variants] > summary').click();
      const select = page.getByRole('button', { name: 'Local environment', exact: true });
      await select.scrollIntoViewIfNeeded();
      await page.keyboard.press('Tab');
      const fieldBefore = await select.evaluate((el) => {
        document.activeElement?.blur();
        const s = getComputedStyle(el),
          r = el.getBoundingClientRect();
        return { width: r.width, height: r.height, shadow: s.boxShadow, outline: s.outlineStyle };
      });
      await select.focus();
      await page.waitForTimeout(180);
      assert.deepEqual(
        await select.evaluate((el) => {
          const s = getComputedStyle(el),
            r = el.getBoundingClientRect();
          return { width: r.width, height: r.height, shadow: s.boxShadow, outline: s.outlineStyle };
        }),
        fieldBefore,
        'Select uses the unchanged field boundary for keyboard focus'
      );
      await select.press('Enter');
      await page.getByRole('menuitem', { name: 'Cloud environment', exact: true }).click();
      await page.getByRole('button', { name: 'Cloud environment', exact: true }).waitFor();
      assert.equal(
        await page.getByRole('button', { name: 'Cloud environment', exact: true }).count(),
        1
      );
      await page.screenshot({ path: resolve(output, `${entry}-C-${mode}-variants.png`) });
      await page.locator('[data-gallery-variants] > summary').click();
      for (const viewport of [
        { width: 390, height: 844 },
        { width: 768, height: 1024 },
      ]) {
        await page.setViewportSize(viewport);
        await page.locator('[data-component-gallery]').scrollIntoViewIfNeeded();
        assert.equal(
          await page
            .locator('[data-scroll]')
            .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          true,
          `${viewport.width}: no horizontal overflow`
        );
        await page.screenshot({
          path: resolve(output, `${entry}-C-${mode}-${viewport.width}.png`),
        });
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    // Every built-in palette retains a distinguishable dark relief and explicit HC fallback.
    const palette = await open('current', entry, 'dark', 'soft-neumorphic');
    const themes = await palette.evaluate(() =>
      window.surfaceFixture.themes.map(({ name, mode }) => ({ name, mode }))
    );
    for (const theme of themes) {
      await palette.evaluate(
        (theme) => window.surfaceFixture.theme.selectShellTheme(theme.mode, theme.name),
        theme
      );
      await palette.waitForTimeout(180);
      if (theme.name !== 'hc-light') {
        const contrast = await palette
          .locator(
            '[data-radio-variant="default"] [data-floe-surface-part="indicator"]:not([data-floe-selected="true"])'
          )
          .first()
          .evaluate((el) => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const context = canvas.getContext('2d');
            const luminance = (color) => {
              context.clearRect(0, 0, 1, 1);
              context.fillStyle = color;
              context.fillRect(0, 0, 1, 1);
              return [...context.getImageData(0, 0, 1, 1).data]
                .slice(0, 3)
                .map((v) => {
                  v /= 255;
                  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
                })
                .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
            };
            const a = luminance(getComputedStyle(el).backgroundColor),
              b = luminance(
                getComputedStyle(el.closest('[data-floe-card-variant]')).backgroundColor
              );
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          });
        assert.ok(contrast >= 3, `${theme.name}: unselected indicator face contrast ${contrast}`);
      }
      const styles = await palette
        .locator('[data-gallery-group="checks"] [data-floe-surface-part="indicator"]')
        .first()
        .evaluate((el) => ({
          shadow: getComputedStyle(el).boxShadow,
          border: getComputedStyle(el).borderColor,
        }));
      if (theme.name === 'hc-light') {
        assert.match(styles.shadow, /rgba\(0, 0, 0, 0\)/);
        await palette.keyboard.press('Tab');
        const toggle = palette.getByRole('switch', { name: 'Sync md', exact: true });
        await toggle.focus();
        assert.equal(
          await toggle.evaluate((el) => getComputedStyle(el.nextElementSibling).outlineStyle),
          'solid',
          'high-contrast switch retains visible keyboard focus'
        );
      } else assert.ok(styles.shadow.includes('inset'), `${theme.name}: recessed control`);
    }
    await palette.emulateMedia({ forcedColors: 'active' });
    await palette.keyboard.press('Tab');
    const native = palette.getByRole('radio', { name: 'Local', exact: true }).first();
    await native.focus();
    assert.equal(
      await native.evaluate((el) => getComputedStyle(el.nextElementSibling).outlineStyle),
      'solid'
    );
    await palette.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
    assert.equal(
      await palette
        .locator('[data-floe-surface-part="switch-thumb"]')
        .first()
        .evaluate((el) => getComputedStyle(el).transitionDuration),
      '0s'
    );
    await palette.close();
    report.entries.push({ entry, palettes: themes.length, status: 'passed' });
  }
  report.checks = [
    'A/B standard visual compatibility',
    'B/C geometry',
    'six semantic tags, compact material, public overrides and flat opt-out',
    'four radio variants and keyboard selection',
    'native mixed checkbox and keyboard toggle',
    'three switch sizes and thumb motion',
    'segment/tab/page selection',
    'progress value and geometry',
    'workflow stages',
    'floating menus/dialogs',
    'mobile overflow',
    'all palettes, non-text contrast, forced colors and reduced motion',
  ];
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await runtime.close();
}
