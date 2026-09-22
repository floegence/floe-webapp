import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

describe('standalone first-party appearance asset', () => {
  it('exports the same theme, dimensions, material and input focus without loading the shell', () => {
    const manifest = JSON.parse(read('packages/core/package.json'));
    expect(manifest.exports['./standalone.css']).toBe('./dist/standalone.css');
    const entry = read('packages/core/src/styles/standalone.css');
    for (const file of ['primitives.css', 'themes/light.css', 'themes/dark.css', 'themes/shell-presets.generated.css', 'surface.css', 'input-focus.css']) {
      expect(entry).toContain(`@import './${file}'`);
    }
    expect(entry).not.toMatch(/@source|@import[^;]*tailwind|\.js/);
    expect(read('packages/core/src/styles/floe.css')).toContain("@import './primitives.css'");
    expect(read('packages/core/src/styles/primitives.css')).toContain('--floe-radius-control');
  });
});
