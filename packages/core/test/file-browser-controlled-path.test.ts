import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function read(relPath: string): string {
  const here = fileURLToPath(import.meta.url);
  const dir = path.dirname(here);
  const target = path.resolve(dir, relPath);
  return fs.readFileSync(target, 'utf8');
}

describe('FileBrowser controlled path wiring', () => {
  it('should expose controlled path and sidebar action props on FileBrowser and forward them to provider', () => {
    const src = read('../src/components/file-browser/FileBrowser.tsx');

    expect(src).toContain('path?: string;');
    expect(src).toContain("onPathChange?: (path: string, source: 'user' | 'programmatic') => void;");
    expect(src).toContain('sidebarHeaderActions?: JSX.Element;');
    expect(src).toContain('toolbarEndActions?: JSX.Element;');
    expect(src).toContain('path={props.path}');
    expect(src).toContain('onPathChange={props.onPathChange}');
    expect(src).toContain("import { SidebarPane } from '../layout/SidebarPane';");
    expect(src).toContain('headerActions={props.sidebarHeaderActions}');
    expect(src).toContain('toolbarEndActions={props.toolbarEndActions}');
    expect(src).toContain('endActions={props.toolbarEndActions}');
    expect(src).toContain('title="Explorer"');
  });

  it('should sync controlled path and keep user callbacks explicit', () => {
    const src = read('../src/components/file-browser/FileBrowserContext.tsx');

    expect(src).toContain("if (typeof props.path !== 'string') return;");
    expect(src).toContain('const nextPath = normalizePath(props.path);');
    expect(src).toContain("deferNonBlocking(() => onPathChange?.(nextPath, 'user'));");
    expect(src).toContain('deferNonBlocking(() => onNavigate?.(nextPath));');
  });

  it('should expose a toolbar end-actions slot on FileBrowserToolbar without coupling business-specific controls into core', () => {
    const src = read('../src/components/file-browser/FileBrowserToolbar.tsx');

    expect(src).toContain('endActions?: JSX.Element;');
    expect(src).toContain('<Show when={props.endActions}>');
    expect(src).toContain('{props.endActions}');
  });
});
