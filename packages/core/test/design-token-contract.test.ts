import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { floeColorTokenCategories, floeSharedCssVariables, floeSurfaceTokens } from '../src/styles/tokens';

const testDir = dirname(fileURLToPath(import.meta.url));
const coreDir = resolve(testDir, '..');
const stylesDir = resolve(coreDir, 'src/styles');

function parseCssVariables(css: string) {
  const values = new Map(
    Array.from(css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi), (match) => [match[1], match[2].trim()] as const),
  );
  for (const [name, value] of values) {
    const reference = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
    if (reference) values.set(name, values.get(reference) ?? value);
  }
  return values;
}

describe('design token contract', () => {
  it('keeps optional material token metadata aligned with local CSS fallbacks', () => {
    const css = readFileSync(resolve(stylesDir, 'surface.css'), 'utf8');
    const compact = (value: string) => value.replace(/\s+/g, '');
    for (const token of floeSurfaceTokens) {
      expect(compact(css)).toContain(compact(`var(${token.variable}, ${token.fallback})`));
    }
  });
  it('keeps light and dark theme css values aligned with the exported token metadata', () => {
    const lightCss = readFileSync(resolve(stylesDir, 'themes/light.css'), 'utf8');
    const darkCss = readFileSync(resolve(stylesDir, 'themes/dark.css'), 'utf8');
    const lightVars = parseCssVariables(lightCss);
    const darkVars = parseCssVariables(darkCss);

    for (const token of floeColorTokenCategories.flatMap((category) => category.tokens)) {
      expect(lightVars.get(token.variable), `${token.variable} in light.css`).toBe(token.lightValue);
      expect(darkVars.get(token.variable), `${token.variable} in dark.css`).toBe(token.darkValue);
    }
  });

  it('defines each shared variable exactly once across the token sources', () => {
    const floeCss = readFileSync(resolve(stylesDir, 'floe.css'), 'utf8');
    const lightCss = readFileSync(resolve(stylesDir, 'themes/light.css'), 'utf8');
    // Two files own the scale and neither may restate the other's names:
    // `primitives.css` holds the root font/tracking/spacing defaults, and
    // `language.css` holds shape, type, motion and elevation. When both declared
    // the same `--floe-*` names, whichever was imported last silently won.
    const tokenSources = ['primitives.css', 'language.css'].map((file) => ({
      file,
      css: readFileSync(resolve(stylesDir, file), 'utf8'),
    }));
    const declared = new Map<string, string>();
    for (const { file, css } of tokenSources) {
      // `language.css` scopes its scale to `:root, [data-floe-theme]`. Only the
      // first block counts — later ones live inside `@media (forced-colors)` and
      // intentionally override the same names.
      const root = css.match(/:root[^{]*\{([^}]+)\}/)?.[1] ?? '';
      for (const [, name, value] of root.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
        expect(declared.has(name), `${name} is declared in both ${file} and another token source`).toBe(false);
        declared.set(name, value.trim());
      }
    }
    // Resolve `var()` references after both files are merged, so a token that
    // points at one owned by the other file still yields its literal value.
    const sharedVars = new Map<string, string>();
    for (const [name, raw] of declared) {
      const reference = /^var\((--[\w-]+)\)$/.exec(raw)?.[1];
      sharedVars.set(name, reference ? (declared.get(reference) ?? raw) : raw);
    }
    expect(floeCss).toContain("@import './primitives.css'");
    expect(floeCss).toContain("@import './language.css'");

    for (const [name, value] of Object.entries(floeSharedCssVariables)) {
      expect(sharedVars.get(name), `${name} not found in primitives.css or language.css`).toBe(value);
    }

    expect(lightCss).not.toContain('--radius:');
    expect(floeCss).toContain('font-family: var(--font-sans);');
    expect(floeCss).toContain('font-family: var(--font-mono);');
  });
});
