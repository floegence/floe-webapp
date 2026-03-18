import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { floeColorTokenCategories, floeSharedCssVariables } from '../src/styles/tokens';

const testDir = dirname(fileURLToPath(import.meta.url));
const coreDir = resolve(testDir, '..');
const stylesDir = resolve(coreDir, 'src/styles');

function parseCssVariables(css: string) {
  return new Map(
    Array.from(css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi), (match) => [match[1], match[2].trim()] as const),
  );
}

describe('design token contract', () => {
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

  it('defines shared variables once in floe.css and consumes them through base typography hooks', () => {
    const floeCss = readFileSync(resolve(stylesDir, 'floe.css'), 'utf8');
    const lightCss = readFileSync(resolve(stylesDir, 'themes/light.css'), 'utf8');
    const sharedVars = parseCssVariables(floeCss);

    for (const [name, value] of Object.entries(floeSharedCssVariables)) {
      expect(sharedVars.get(name), `${name} in floe.css`).toBe(value);
    }

    expect(lightCss).not.toContain('--radius:');
    expect(floeCss).toContain('font-family: var(--font-sans);');
    expect(floeCss).toContain('font-family: var(--font-mono);');
  });
});
