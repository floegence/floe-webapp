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

function block(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`);
  if (start < 0) return '';
  const end = source.indexOf('\n  }', start);
  return end < 0 ? '' : source.slice(start, end);
}

/* A selector may break across lines, so find the rule by its own opening brace
 * and walk the braces to the matching close rather than guessing at indentation. */
function rule(source: string, selector: string): string {
  const start = source.indexOf(selector);
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
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
    expect(html).toContain('data-floe-tone="soft"');
    expect(html).toContain('floe-tag__dot');
    expect(html).toContain('floe-tag__icon');
    expect(html).toContain('Stable');
  });

  it('derives every tone from one accent token instead of a per-color ladder', () => {
    const styles = read('packages/core/src/components/ui/styles/ui.css');

    expect(styles).not.toContain('--tag-solid-');
    expect(styles).not.toContain('--tag-soft-');
    expect(styles).not.toContain('#');

    const base = block(styles, '.floe-tag');
    expect(base).toContain('--tag-accent: var(--floe-ink-soft);');
    expect(base).not.toContain('linear-gradient(');
    expect(base).not.toContain('box-shadow:');
    expect(base).not.toContain('background-color: var(');

    for (const [variant, accent] of [
      ['neutral', 'var(--floe-ink-soft)'],
      ['primary', 'var(--floe-accent-ink)'],
      ['success', 'var(--success)'],
      ['warning', 'var(--warning)'],
      ['error', 'var(--error)'],
      ['info', 'var(--info)'],
    ]) {
      expect(block(styles, `.floe-tag--${variant}`)).toContain(
        `--tag-accent: ${accent};`
      );
    }
  });

  it('paints the two tones as an outline and a wash in the surface layer', () => {
    const surface = read('packages/core/src/styles/surface.css');

    const soft = rule(surface, "[data-floe-surface-part='badge'][data-floe-tone='soft']");
    expect(soft).toContain('background-color: transparent;');
    expect(soft).toContain('border-color: var(--floe-line-strong);');

    const solid = rule(surface, "[data-floe-surface-part='badge'][data-floe-tone='solid']");
    expect(solid).toContain('background-color: color-mix(in srgb, var(--tag-accent) 15%, transparent);');
    expect(solid).toContain('border-color: color-mix(in srgb, var(--tag-accent) 26%, transparent);');
  });
});
