import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToString } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import {
  DisplayModeSwitcher,
  sanitizeDisplayMode,
} from '../src/components/layout/DisplayModeSwitcher';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../..');

function read(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('display mode shared layout contract', () => {
  it('renders a semantic pill switcher contract for activity, deck, and workbench', () => {
    const html = renderToString(() => (
      <DisplayModeSwitcher mode="deck" onChange={() => {}} />
    ));

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Display mode"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Activity');
    expect(html).toContain('Deck');
    expect(html).toContain('Workbench');
    expect(html).toContain('display-mode-switcher__pill-bg');
  });

  it('normalizes persisted values back into the final display mode contract', () => {
    expect(sanitizeDisplayMode('activity')).toBe('activity');
    expect(sanitizeDisplayMode('deck')).toBe('deck');
    expect(sanitizeDisplayMode('workbench')).toBe('workbench');
    expect(sanitizeDisplayMode('legacy')).toBe('activity');
    expect(sanitizeDisplayMode('legacy', 'deck')).toBe('deck');
  });

  it('keeps display mode shell styles and exports in shared core rather than demo-only files', () => {
    const layoutIndex = read('packages/core/src/components/layout/index.ts');
    const pageShell = read('packages/core/src/components/layout/DisplayModePageShell.tsx');
    const styles = read('packages/core/src/components/layout/displayMode.css');
    const globals = read('packages/core/src/styles/globals.css');
    const tailwind = read('packages/core/src/styles/tailwind.css');

    expect(layoutIndex).toContain('DisplayModeSwitcher');
    expect(layoutIndex).toContain('DisplayModePageShell');
    expect(pageShell).toContain('<TopBar');
    expect(pageShell).toContain('display-mode-page-shell__body');
    expect(styles).toContain('.display-mode-switcher {');
    expect(styles).toContain('.display-mode-page-shell {');
    expect(globals).toContain("@import '../components/layout/displayMode.css';");
    expect(tailwind).toContain("@import './display-mode.css';");
  });
});
