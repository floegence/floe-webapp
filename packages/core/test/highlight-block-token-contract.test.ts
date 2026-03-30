import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const uiCssPath = resolve(testDir, '../src/components/ui/styles/ui.css');

describe('highlight block token contract', () => {
  it('uses dedicated accent tokens instead of the shared status tokens', () => {
    const css = readFileSync(uiCssPath, 'utf8');

    expect(css).toContain('--hb-accent: var(--highlight-block-info-accent);');
    expect(css).toContain('--hb-accent: var(--highlight-block-warning-accent);');
    expect(css).toContain('--hb-accent: var(--highlight-block-success-accent);');
    expect(css).toContain('--hb-accent: var(--highlight-block-error-accent);');
    expect(css).toContain('--hb-accent: var(--highlight-block-note-accent);');
    expect(css).toContain('--hb-accent: var(--highlight-block-tip-accent);');

    expect(css).not.toContain('--hb-accent: var(--info);');
    expect(css).not.toContain('--hb-accent: var(--warning);');
    expect(css).not.toContain('--hb-accent: var(--success);');
    expect(css).not.toContain('--hb-accent: var(--error);');
  });
});
