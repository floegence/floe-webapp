import { createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { createFilesystemPickerDataSource, parsePickerPath, type PickerPathContext } from '../src/components/ui/picker/PickerNavigation';

const context: PickerPathContext = {
  homePathAbs: '/Users/alice', defaultRootId: 'home',
  roots: [
    { id: 'home', label: 'Home', pathAbs: '/Users/alice', permissions: { read: true, write: true } },
    { id: 'computer', label: 'Root', pathAbs: '/', permissions: { read: true, write: false } },
  ],
};
const folder = (path: string) => ({ id: path, name: path.split('/').at(-1)!, path, type: 'folder' as const });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('absolute filesystem picker', () => {
  it('keeps root and external paths absolute and expands only an explicit home shorthand', () => {
    expect(parsePickerPath('/', context.homePathAbs)).toBe('/');
    expect(parsePickerPath('/Volumes/team/project/', context.homePathAbs)).toBe('/Volumes/team/project');
    expect(parsePickerPath('~/项目 with spaces', context.homePathAbs)).toBe('/Users/alice/项目 with spaces');
    expect(parsePickerPath('project', context.homePathAbs)).toBe('');
    expect(parsePickerPath('/Users/alice-other', context.homePathAbs)).toBe('/Users/alice-other');
  });

  it('validates a target directly without requiring readable or visible ancestors', async () => {
    const loadDirectory = vi.fn(async () => [folder('/Volumes/team/.hidden/src')]);
    await createRoot(async (dispose) => {
      const source = createFilesystemPickerDataSource(() => ({ loadPathContext: async () => context, loadDirectory }));
      await source.open('/Volumes/team/.hidden');
      expect(loadDirectory).toHaveBeenCalledExactlyOnceWith('/Volumes/team/.hidden', { showHidden: false });
      expect(source.currentPath()).toBe('/Volumes/team/.hidden');
      expect(source.valid()).toBe(true);
      dispose();
    });
  });

  it('validates root rather than considering it automatically selectable', async () => {
    await createRoot(async (dispose) => {
      const source = createFilesystemPickerDataSource(() => ({ pathContext: context, loadDirectory: async () => { throw new Error('root denied'); } }));
      await source.open('/');
      expect(source.valid()).toBe(false);
      expect(source.currentPath()).toBe('');
      expect(source.error()).toBeInstanceOf(Error);
      dispose();
    });
  });

  it('keeps the committed directory on failure and blocks an unvalidated edited path', async () => {
    await createRoot(async (dispose) => {
      const source = createFilesystemPickerDataSource(() => ({ pathContext: context, loadDirectory: async (path) => {
        if (path === '/missing') throw new Error('not found');
        return [];
      } }));
      await source.open();
      source.setPathInput('/missing');
      expect(source.valid()).toBe(false);
      await source.navigate('/missing');
      expect(source.currentPath()).toBe('/Users/alice');
      expect(source.pathInput()).toBe('/missing');
      expect(source.valid()).toBe(false);
      await source.navigate('/');
      expect(source.currentPath()).toBe('/');
      expect(source.valid()).toBe(true);
      dispose();
    });
  });

  it('allows only the newest navigation to commit', async () => {
    const slow = deferred<ReturnType<typeof folder>[]>();
    await createRoot(async (dispose) => {
      const source = createFilesystemPickerDataSource(() => ({ pathContext: context, loadDirectory: async (path) => path === '/slow' ? slow.promise : [] }));
      await source.open();
      const first = source.navigate('/slow');
      await source.navigate('/Volumes');
      slow.resolve([folder('/slow/stale')]);
      await first;
      expect(source.currentPath()).toBe('/Volumes');
      expect(source.entries()).toEqual([]);
      expect(source.valid()).toBe(true);
      dispose();
    });
  });

  it('ignores late context and directory results after close or reopening', async () => {
    const slow = deferred<PickerPathContext>();
    const loadPathContext = vi.fn().mockImplementationOnce(() => slow.promise).mockResolvedValue(context);
    await createRoot(async (dispose) => {
      const loadDirectory = vi.fn(async () => []);
      const source = createFilesystemPickerDataSource(() => ({ loadPathContext, loadDirectory }));
      const first = source.open();
      source.close();
      await source.open('/Volumes');
      slow.resolve({ ...context, homePathAbs: '/stale' });
      await first;
      expect(source.currentPath()).toBe('/Volumes');
      expect(loadDirectory).toHaveBeenCalledTimes(1);
      expect(loadPathContext).toHaveBeenCalledTimes(2);
      dispose();
    });
  });

  it('invalidates a pending navigation when the user edits its input', async () => {
    const slow = deferred<ReturnType<typeof folder>[]>();
    await createRoot(async (dispose) => {
      const source = createFilesystemPickerDataSource(() => ({ pathContext: context, loadDirectory: async (path) => path === '/slow' ? slow.promise : [] }));
      await source.open();
      const first = source.navigate('/slow');
      source.setPathInput('/different');
      slow.resolve([]);
      await first;
      expect(source.currentPath()).toBe('/Users/alice');
      expect(source.pathInput()).toBe('/different');
      expect(source.valid()).toBe(false);
      dispose();
    });
  });

  it('never manufactures a filesystem context for a remote loader', async () => {
    await createRoot(async (dispose) => {
      const loadDirectory = vi.fn(async () => []);
      const source = createFilesystemPickerDataSource(() => ({ homePath: '/Users/alice', loadDirectory }));
      await source.open();
      expect(source.context()).toBeNull();
      expect(source.valid()).toBe(false);
      expect(loadDirectory).not.toHaveBeenCalled();
      dispose();
    });
  });
});
