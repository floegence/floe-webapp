import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { FolderIcon, FolderOpenIcon, ShellScriptFileIcon, getFileIcon } from '../src/components/file-browser/FileIcons';

function extractAll(re: RegExp, input: string): string[] {
  return Array.from(input.matchAll(re), (m) => m[1] ?? '');
}

describe('file icons', () => {
  it('FolderIcon should generate unique gradient ids per instance', () => {
    const html = renderToString(() => (
      <>
        <FolderIcon class="w-4 h-4" />
        <FolderIcon class="w-4 h-4" />
        <FolderIcon class="w-4 h-4" />
      </>
    ));

    expect(html).not.toContain('id="folder-gradient"');
    expect(html).not.toContain('url(#folder-gradient)');

    const ids = extractAll(/id="(floe-folder-gradient-[^"]+)"/g, html);
    // Solid SSR may emit SVG attributes without quotes (e.g. `fill=url(#...)`).
    const fills = extractAll(/fill=(?:")?url\(#(floe-folder-gradient-[^")\s>]+)\)(?:")?/g, html);

    expect(ids.length).toBe(3);
    expect(fills.length).toBe(3);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of fills) expect(ids).toContain(id);
  });

  it('FolderOpenIcon should generate unique gradient ids per instance', () => {
    const html = renderToString(() => (
      <>
        <FolderOpenIcon class="w-4 h-4" />
        <FolderOpenIcon class="w-4 h-4" />
      </>
    ));

    expect(html).not.toContain('id="folder-open-gradient"');
    expect(html).not.toContain('url(#folder-open-gradient)');

    const ids = extractAll(/id="(floe-folder-open-gradient-[^"]+)"/g, html);
    // Solid SSR may emit SVG attributes without quotes (e.g. `fill=url(#...)`).
    const fills = extractAll(/fill=(?:")?url\(#(floe-folder-open-gradient-[^")\s>]+)\)(?:")?/g, html);

    expect(ids.length).toBe(2);
    expect(fills.length).toBe(2);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of fills) expect(ids).toContain(id);
  });

  it('getFileIcon should return the dedicated shell script icon for shell extensions', () => {
    expect(getFileIcon('sh')).toBe(ShellScriptFileIcon);
    expect(getFileIcon('bash')).toBe(ShellScriptFileIcon);
    expect(getFileIcon('zsh')).toBe(ShellScriptFileIcon);
    expect(getFileIcon('fish')).toBe(ShellScriptFileIcon);
  });

  it('ShellScriptFileIcon should render a terminal-style glyph', () => {
    const html = renderToString(() => <ShellScriptFileIcon class="w-4 h-4" />);

    expect(html).toContain('var(--success)');
    expect(html).toContain('points="8 13 11 15 8 17"');
    expect(html).toContain('x1="13"');
    expect(html).toContain('x2="16.5"');
  });
});
