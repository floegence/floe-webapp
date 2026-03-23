import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { GitBranch } from '../src/components/icons';
import { Tag } from '../src/components/ui/Tag';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../..');

function read(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('Tag', () => {
  it('renders semantic tags with tone, size, dot, and icon adornments', () => {
    const html = renderToString(() => (
      <Tag variant="success" tone="soft" size="lg" dot icon={GitBranch}>
        Stable
      </Tag>
    ));

    expect(html).toContain('floe-tag');
    expect(html).toContain('floe-tag--success');
    expect(html).toContain('floe-tag--lg');
    expect(html).toContain('floe-tag--soft');
    expect(html).toContain('floe-tag__dot');
    expect(html).toContain('floe-tag__icon');
    expect(html).toContain('Stable');
  });

  it('keeps the shared tag styles consistent across light and dark themes', () => {
    const styles = read('packages/core/src/components/ui/styles/ui.css');
    const tagBlock = styles.match(/\.floe-tag\s*\{[\s\S]*?\n {2}\}/)?.[0] ?? '';

    expect(styles).toContain('.floe-tag');
    expect(styles).toContain('.dark .floe-tag');
    expect(styles).toContain('.floe-tag--primary');
    expect(styles).toContain('.floe-tag--warning');
    expect(styles).toContain('.floe-tag--info');
    expect(styles).toContain('.floe-tag--soft.floe-tag--primary');
    expect(styles).toContain('.dark .floe-tag--primary');
    expect(styles).toContain('.dark .floe-tag--soft.floe-tag--info');
    expect(styles).toContain('.dark .floe-tag--success');
    expect(styles).toContain('color-mix(in srgb, var(--warning) 78%, var(--foreground))');
    expect(styles).not.toContain('#');
    expect(tagBlock).toContain('background-color: var(--tag-bg);');
    expect(tagBlock).not.toContain('linear-gradient(');
    expect(tagBlock).not.toContain('box-shadow:');
  });
});
