import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolvePickerInitialPath } from '../src/components/ui/picker/PickerBase';

function read(relPath: string): string {
  const here = fileURLToPath(import.meta.url);
  const dir = path.dirname(here);
  const target = path.resolve(dir, relPath);
  return fs.readFileSync(target, 'utf8');
}

describe('picker initial path state', () => {
  it('keeps initialPath reactive inside usePickerTree so open-reset can re-canonicalize against the latest homePath', () => {
    const src = read('../src/components/ui/picker/PickerBase.tsx');

    expect(src).toContain("initialPath?: string | Accessor<string | undefined>;");
    expect(src).toContain("const raw = typeof opts.initialPath === 'function' ? opts.initialPath() : opts.initialPath;");
    expect(src).toContain('return resolvePickerInitialPath(raw, getHomePath());');
    expect(src).toContain('const [selectedPath, setSelectedPath] = createSignal(getInitialPath());');
    expect(src).toContain('const init = getInitialPath();');
    expect(src).toContain('setSelectedPath(init);');
    expect(src).toContain('setPathInput(toDisplayPath(init));');
  });

  it('passes initialPath through accessors from picker entrypoints instead of snapshotting props at mount time', () => {
    expect(read('../src/components/ui/DirectoryPicker.tsx')).toContain('initialPath: () => props.initialPath,');
    expect(read('../src/components/ui/FileSavePicker.tsx')).toContain('initialPath: () => props.initialPath,');
    expect(read('../src/components/ui/DirectoryInput.tsx')).toContain("initialPath: () => local.initialPath ?? '/',");
  });

  it('renders picker tree folders through FileItemIcon so symlink metadata can flow into picker affordances too', () => {
    const src = read('../src/components/ui/picker/PickerBase.tsx');

    expect(src).toContain("import { FileItemIcon, FolderOpenIcon } from '../../file-browser/FileIcons';");
    expect(src).toContain('<FileItemIcon item={props.item} open={isExpanded()} class="w-4 h-4" />');
  });

  it('resolves picker initial paths into a single internal-path domain', () => {
    expect(resolvePickerInitialPath('/Users/demo', '/Users/demo')).toBe('/');
    expect(resolvePickerInitialPath('/Users/demo/workspace', '/Users/demo')).toBe('/workspace');
    expect(resolvePickerInitialPath('/workspace', '/Users/demo')).toBe('/workspace');
  });
});
