import { createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { createFilesystemPickerDataSource, type PickerPathContext } from '../src/components/ui/picker/PickerNavigation';
const context: PickerPathContext = { homePathAbs: '/home/alice', defaultRootId: 'project', roots: [{ id: 'project', label: 'Project', pathAbs: '/srv/project' }] };

describe('picker navigation ownership', () => {
  it('uses the declared default root and refreshes context on reopening', async () => {
    let current = context;
    const loadDirectory = vi.fn(async () => []);
    const loadPathContext = vi.fn(async () => current);
    await createRoot(async (dispose) => {
      const source = createFilesystemPickerDataSource(() => ({ loadPathContext, loadDirectory }));
      await source.open();
      expect(source.currentPath()).toBe('/srv/project');
      source.close();
      current = { ...context, roots: [{ id: 'project', label: 'Moved', pathAbs: '/mnt/project' }] };
      await source.open();
      expect(source.currentPath()).toBe('/mnt/project');
      expect(loadPathContext).toHaveBeenCalledTimes(2);
      dispose();
    });
  });
  it('reloads the exact directory when hidden visibility changes', async () => {
    const loadDirectory = vi.fn(async () => []);
    await createRoot(async (dispose) => {
      const source = createFilesystemPickerDataSource(() => ({ pathContext: context, loadDirectory }));
      await source.open('/srv/project/.hidden');
      await source.setShowHidden(true);
      expect(loadDirectory).toHaveBeenLastCalledWith('/srv/project/.hidden', { showHidden: true });
      expect(source.valid()).toBe(true);
      dispose();
    });
  });
  it('deduplicates identical inflight loads without accepting an older selection', async () => {
    let finish!: (value: never[]) => void;
    const request = new Promise<never[]>((resolve) => { finish = resolve; });
    const loadDirectory = vi.fn(() => request);
    await createRoot(async (dispose) => {
      const source = createFilesystemPickerDataSource(() => ({ pathContext: context, loadDirectory }));
      const first = source.open('/srv/project');
      const second = source.navigate('/srv/project');
      finish([]);
      await Promise.all([first, second]);
      expect(loadDirectory).toHaveBeenCalledTimes(1);
      expect(source.currentPath()).toBe('/srv/project');
      expect(source.valid()).toBe(true);
      dispose();
    });
  });
  it('supports static absolute trees and preserves symlink presentation metadata', async () => {
    const link = { id: '/link', path: '/link', name: 'link', type: 'folder' as const, entryType: 'symlink' as const };
    await createRoot(async (dispose) => {
      const source = createFilesystemPickerDataSource(() => ({ files: [link], homePath: '/home/alice' }));
      await source.open('/');
      expect(source.entries()).toEqual([link]);
      await source.navigate('/link');
      expect(source.currentPath()).toBe('/link');
      dispose();
    });
  });
});
