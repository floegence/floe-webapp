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
    expect(html).toContain('data-floe-surface-part="segment"');
    expect(html).toContain('data-floe-surface="raised"');
  });

  it('keeps segmented control contrast semantics explicit across light and dark themes', () => {
    const styles = read('packages/core/src/components/ui/styles/ui.css');
    /* Assert against this component's own block: other sections of ui.css are
     * migrated separately and must not colour this contract. */
    const blockStart = styles.indexOf('Segmented Control - clear selection contrast');
    const blockEnd = styles.indexOf('Tag - metadata, not a badge of honour');
    const segmented = styles.slice(blockStart, blockEnd);

    /* One recipe for both modes, and no per-mode override is allowed.
     *
     * The selected segment is the semantic pair, not a plane step. A selection
     * is a state, so it has to be legible as one on its own: the fill must
     * carry 3:1 against the rail beneath it and the label 4.5:1 against that
     * fill, which a translucent wash plus a hairline cannot do at any alpha
     * (measured 1.0–1.4:1 across the presets). `--primary` against `--card` is
     * the one opaque thing on the rail; relief would restate the fill, so it
     * stays off and the shadow token remains explicit as `none`.
     *
     * scripts/check-selection-contrast-browser.mjs measures the rendered
     * result in all 28 presets; this test pins the source-level recipe. */
    expect(segmented).toContain('.floe-segmented-control {');
    expect(segmented).not.toContain('.dark .floe-segmented-control {');
    expect(segmented).toContain('--segmented-control-bg: var(--floe-well);');
    expect(segmented).toContain('--segmented-control-item-active-bg: var(--primary);');
    expect(segmented).toContain('--segmented-control-item-active-border: var(--primary);');
    expect(segmented).toContain('--segmented-control-item-active-color: var(--primary-foreground);');
    expect(segmented).toContain('--segmented-control-item-active-shadow: none');
    expect(segmented).toContain(
      ".floe-segmented-control__item[aria-checked='false']:hover:not(:disabled) {"
    );
    expect(segmented).toContain(".floe-segmented-control__item[aria-checked='true'] {");
    // The rail stays a well: the accent belongs to the selected item only.
    expect(segmented).not.toContain('--segmented-control-item-active-bg: var(--floe-accent-soft)');
  });
});
