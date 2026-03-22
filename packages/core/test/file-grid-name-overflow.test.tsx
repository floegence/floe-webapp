import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { FileBrowserProvider } from '../src/components/file-browser/FileBrowserContext';
import { FileGridView } from '../src/components/file-browser/FileGridView';

describe('FileGridView long names', () => {
  it('applies the full filename as the tile hover title and truncates the visible label to one line', () => {
    const longFolderName = 'customer-facing-platform-runtime-assets-and-shared-icons';
    const longFileName = '2026-quarterly-forecast-and-platform-capacity-report.final.reviewed.xlsx';

    const html = renderToString(() => (
      <FileBrowserProvider
        files={[
          { id: 'folder-long', name: longFolderName, type: 'folder', path: `/${longFolderName}`, children: [] },
          { id: 'file-long', name: longFileName, type: 'file', path: `/${longFileName}` },
        ]}
        initialPath="/"
      >
        <FileGridView />
      </FileBrowserProvider>
    ));

    expect(html).toContain(`title="${longFolderName}"`);
    expect(html).toContain(`title="${longFileName}"`);
    expect(html).toContain('block w-full min-w-0 truncate px-1 text-xs text-center');
    expect(html).not.toContain('line-clamp-2');
  });
});
