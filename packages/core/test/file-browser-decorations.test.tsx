import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { FileBrowserProvider } from '../src/components/file-browser/FileBrowserContext';
import { DirectoryTree } from '../src/components/file-browser/DirectoryTree';
import { FileGridView } from '../src/components/file-browser/FileGridView';
import { FileListView } from '../src/components/file-browser/FileListView';
import type { FileItem } from '../src/components/file-browser/types';

const files: FileItem[] = [
  {
    id: 'folder',
    name: 'src',
    type: 'folder',
    path: '/src',
    decoration: {
      badge: { label: 'M', tone: 'info', title: 'Contains Git changes' },
      nameTone: 'info',
    },
    children: [
      {
        id: 'nested',
        name: 'nested.ts',
        type: 'file',
        path: '/src/nested.ts',
        extension: 'ts',
      },
    ],
  },
  {
    id: 'modified',
    name: 'modified.ts',
    type: 'file',
    path: '/modified.ts',
    extension: 'ts',
    decoration: {
      badge: { label: 'M', tone: 'info', title: 'Modified in Git' },
      nameTone: 'info',
    },
  },
  {
    id: 'added',
    name: 'added.ts',
    type: 'file',
    path: '/added.ts',
    extension: 'ts',
    decoration: {
      badge: { label: 'A', tone: 'success', title: 'Added in Git' },
      nameTone: 'success',
    },
  },
];

describe('file browser decorations', () => {
  it('renders icon badges and name tones in list view', () => {
    const html = renderToString(() => (
      <FileBrowserProvider files={files} initialPath="/">
        <FileListView enableDragDrop={false} />
      </FileBrowserProvider>
    ));

    expect(html).toContain('data-file-browser-decoration-badge="info"');
    expect(html).toContain('data-file-browser-decoration-badge="success"');
    expect(html).toContain('text-info');
    expect(html).toContain('text-success');
    expect(html).toContain('>M</span>');
    expect(html).toContain('>A</span>');
    expect(html).toContain('Contains Git changes');
    expect(html).toContain('h-2');
  });

  it('renders icon badges and name tones in grid view', () => {
    const html = renderToString(() => (
      <FileBrowserProvider files={files} initialPath="/">
        <FileGridView enableDragDrop={false} />
      </FileBrowserProvider>
    ));

    expect(html).toContain('data-file-browser-decoration-badge="info"');
    expect(html).toContain('data-file-browser-decoration-badge="success"');
    expect(html).toContain('text-info');
    expect(html).toContain('text-success');
  });

  it('renders folder badges and name tones in the directory tree', () => {
    const html = renderToString(() => (
      <FileBrowserProvider files={files} initialPath="/">
        <DirectoryTree enableDragDrop={false} />
      </FileBrowserProvider>
    ));

    expect(html).toContain('data-file-browser-decoration-badge="info"');
    expect(html).toContain('text-info');
    expect(html).toContain('Contains Git changes');
  });
});
