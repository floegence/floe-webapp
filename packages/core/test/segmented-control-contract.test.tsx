import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { GitBranch } from '../src/components/icons';
import { SegmentedControl } from '../src/components/ui/SegmentedControl';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../..');

function read(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('SegmentedControl', () => {
  it('renders a semantic segmented radio group with a dedicated active item contract', () => {
    const html = renderToString(() => (
      <SegmentedControl
        value="branches"
        onChange={() => {}}
        aria-label="Git sections"
        size="sm"
        options={[
          { value: 'changes', label: 'Changes' },
          { value: 'branches', label: 'Branches', icon: GitBranch },
        ]}
      />
    ));

    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Git sections"');
    expect(html).toContain('role="radio"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('floe-segmented-control');
    expect(html).toContain('floe-segmented-control__item');
    expect(html).toContain('floe-segmented-control__item--active');
  });

  it('keeps segmented control contrast semantics explicit across light and dark themes', () => {
    const styles = read('packages/core/src/components/ui/styles/ui.css');

    expect(styles).toContain('.floe-segmented-control {');
    expect(styles).toContain('.dark .floe-segmented-control {');
    expect(styles).toContain('--segmented-control-item-active-bg');
    expect(styles).toContain('--segmented-control-item-active-border');
    expect(styles).toContain('.floe-segmented-control__item[aria-checked=\'false\']:hover:not(:disabled) {');
    expect(styles).toContain('.floe-segmented-control__item--active {');
    expect(styles).toContain('color-mix(in srgb, var(--foreground) 14%, var(--background) 86%)');
    expect(styles).not.toContain('.floe-segmented-control__item--active {\n    background: linear-gradient(');
  });
});
