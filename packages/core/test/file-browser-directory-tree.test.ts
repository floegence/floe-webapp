import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('DirectoryTree', () => {
  it('should navigate via navigateTo (auto-expand) when clicking a folder row', () => {
    const here = fileURLToPath(import.meta.url);
    const dir = path.dirname(here);
    const target = path.resolve(dir, '../src/components/file-browser/DirectoryTree.tsx');
    const src = fs.readFileSync(target, 'utf8');

    const m = src.match(/const handleNavigate[\s\S]*?\n\s*};/);
    expect(m?.[0]).toBeTruthy();
    expect(m?.[0]).toContain('ctx.navigateTo(');
    expect(m?.[0]).not.toContain('ctx.setCurrentPath(');
  });
});

