import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function read(relPath: string): string {
  const here = fileURLToPath(import.meta.url);
  const dir = path.dirname(here);
  return fs.readFileSync(path.resolve(dir, relPath), 'utf8');
}

describe('TopBarIconButton structure guard', () => {
  it('creates a fresh button subtree per tooltip branch', () => {
    const src = read('../src/components/layout/TopBarIconButton.tsx');

    expect(src).toContain('const renderButton = () => (');
    expect(src).toContain('toggle `tooltip` during mount');
    expect(src).not.toContain('const btn = (');
  });
});
