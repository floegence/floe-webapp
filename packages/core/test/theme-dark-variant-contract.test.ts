import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const stylesDir = resolve(testDir, '../src/styles');

describe('theme dark variant contract', () => {
  it('binds Tailwind dark utilities to the runtime dark class', () => {
    const floeCss = readFileSync(resolve(stylesDir, 'floe.css'), 'utf8');
    expect(floeCss).toContain('@custom-variant dark (&:where(.dark, .dark *));');
  });

  it('exposes the shared theme contract through both style entrypoints', () => {
    const globalsCss = readFileSync(resolve(stylesDir, 'globals.css'), 'utf8');
    const tailwindCss = readFileSync(resolve(stylesDir, 'tailwind.css'), 'utf8');

    expect(globalsCss).toContain("@import './floe.css';");
    expect(tailwindCss).toContain("@import './floe.css';");
  });
});
