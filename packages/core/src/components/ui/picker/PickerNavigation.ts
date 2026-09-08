import { batch, createSignal, onCleanup } from 'solid-js';
import type { FileItem } from '../../file-browser/types';

export interface PickerRoot {
  id: string;
  label: string;
  pathAbs: string;
  permissions?: Readonly<{ read: boolean; write: boolean }>;
  hidden?: boolean;
}

export interface PickerPathContext {
  homePathAbs: string;
  defaultRootId: string;
  roots: readonly PickerRoot[];
}

export type PickerDirectoryLoader = (path: string, options: { showHidden: boolean }) => Promise<readonly FileItem[]>;

export interface PickerCopy {
  path: string;
  go: string;
  roots: string;
  root: string;
  showHidden: string;
  loading: string;
  retry: string;
  empty: string;
  emptyFiles: string;
  invalidPath: string;
  missingPath: string;
  unavailableContext: string;
  loadFailed: string;
  currentDirectory: string;
  newFolder: string;
  folderName: string;
  create: string;
  cancel: string;
  fileName: string;
  fileNameRequired: string;
  noFilesSelected: string;
  selectionLimit: string;
  selectedCount: (count: number) => string;
}

export const defaultPickerCopy: PickerCopy = {
  path: 'Directory path', go: 'Go', roots: 'Locations', root: 'Root',
  showHidden: 'Show hidden items', loading: 'Loading directory…', retry: 'Retry',
  empty: 'No directories here', emptyFiles: 'No matching files in this directory', invalidPath: 'Enter an absolute path or a path starting with ~/',
  missingPath: 'Directory not found', unavailableContext: 'Filesystem locations are unavailable',
  loadFailed: 'Could not load directory', currentDirectory: 'Current directory',
  newFolder: 'New folder', folderName: 'Folder name', create: 'Create', cancel: 'Cancel',
  fileName: 'File name', fileNameRequired: 'Filename is required', noFilesSelected: 'No files selected',
  selectionLimit: 'Selection limit reached', selectedCount: (count) => `${count} selected`,
};

export interface PickerDataProps {
  /** Static trees contain absolute paths. Remote consumers provide loadDirectory instead. */
  files?: readonly FileItem[];
  pathContext?: PickerPathContext;
  /** Refreshed on every open, scope change, and explicit context retry. */
  loadPathContext?: () => Promise<PickerPathContext>;
  loadDirectory?: PickerDirectoryLoader;
  /** Changing environment/session identity invalidates all pending work. */
  scopeKey?: string;
  initialPath?: string;
  /** Display-only Home hint for static pickers; never rebases a path. */
  homePath?: string;
  homeLabel?: string;
  initialShowHidden?: boolean;
  filter?: (item: FileItem) => boolean;
  copy?: Partial<PickerCopy>;
  formatError?: (error: unknown) => string;
  onValidityChange?: (valid: boolean) => void;
}

export class PickerNavigationError extends Error {
  constructor(readonly kind: 'invalidPath' | 'missingPath' | 'unavailableContext') { super(kind); }
}

/** Absolute POSIX paths only. The runtime remains responsible for canonical/symlink resolution. */
export function parsePickerPath(rawPath: string, homePathAbs = ''): string {
  let value = String(rawPath ?? '').trim();
  if (value === '~') value = homePathAbs;
  else if (value.startsWith('~/')) value = homePathAbs ? `${homePathAbs}/${value.slice(2)}` : '';
  if (!value.startsWith('/') || value.includes('\0')) return '';
  const segments: string[] = [];
  for (const part of value.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') segments.pop();
    else segments.push(part);
  }
  return `/${segments.join('/')}`;
}

export function pickerParentPath(path: string): string {
  const value = parsePickerPath(path);
  return value.slice(0, value.lastIndexOf('/')) || '/';
}

export function formatPickerPath(path: string, homePathAbs = ''): string {
  const base = parsePickerPath(homePathAbs);
  if (base && path === base) return '~';
  if (base && base !== '/' && path.startsWith(`${base}/`)) return `~${path.slice(base.length)}`;
  return path;
}

function staticEntries(files: readonly FileItem[], path: string): readonly FileItem[] {
  if (path === '/') return files;
  for (const item of files) {
    if (item.type !== 'folder') continue;
    if (parsePickerPath(item.path) === path) return item.children ?? [];
    if (item.children) {
      try { return staticEntries(item.children, path); } catch { /* Search the next sibling. */ }
    }
  }
  throw new PickerNavigationError('missingPath');
}

/** Owns one committed directory and latest navigation. No cached tree can authorize a path. */
export function createFilesystemPickerDataSource(
  getProps: () => PickerDataProps,
  onValidated?: (path: string) => void,
) {
  const [context, setContext] = createSignal<PickerPathContext | null>(null);
  const [currentPath, setCurrentPath] = createSignal('');
  const [entries, setEntries] = createSignal<readonly FileItem[]>([]);
  const [pathInput, writePathInput] = createSignal('');
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal<unknown>(null);
  const [showHidden, writeShowHidden] = createSignal(false);
  const [active, setActive] = createSignal(false);
  let epoch = 0;
  let intent = 0;
  let initialTarget: string | undefined;
  let inflight = new Map<string, Promise<readonly FileItem[]>>();

  const valid = () => active() && !pending() && !error() && Boolean(currentPath())
    && parsePickerPath(pathInput(), context()?.homePathAbs) === currentPath();

  const invalidate = () => { epoch += 1; intent += 1; inflight = new Map(); };
  const close = () => { invalidate(); batch(() => { setActive(false); setPending(false); }); };
  onCleanup(close);

  const navigate = async (rawPath: string): Promise<boolean> => {
    if (!active() || !context()) return false;
    const requestEpoch = epoch;
    const requestIntent = ++intent;
    const path = parsePickerPath(rawPath, context()?.homePathAbs);
    batch(() => { writePathInput(rawPath); setError(null); setPending(true); });
    const current = () => active() && epoch === requestEpoch && intent === requestIntent;
    try {
      if (!path) throw new PickerNavigationError('invalidPath');
      const props = getProps();
      const options = { showHidden: showHidden() };
      const key = `${path}\0${options.showHidden}`;
      let request = inflight.get(key);
      if (!request) {
        request = Promise.resolve().then(() => props.loadDirectory
          ? props.loadDirectory(path, options)
          : staticEntries(props.files ?? [], path));
        inflight.set(key, request);
      }
      let result: readonly FileItem[];
      try { result = await request; }
      finally { if (inflight.get(key) === request) inflight.delete(key); }
      if (!current()) return false;
      const visible = props.loadDirectory || options.showHidden
        ? result : result.filter((item) => !item.name.startsWith('.'));
      batch(() => {
        setCurrentPath(path);
        setEntries(visible);
        writePathInput(path);
        setPending(false);
        setError(null);
      });
      onValidated?.(path);
      return true;
    } catch (failure) {
      if (current()) batch(() => { setError(failure); setPending(false); });
      return false;
    }
  };

  const open = async (path?: string): Promise<void> => {
    invalidate();
    const requestEpoch = epoch;
    initialTarget = path;
    const props = getProps();
    batch(() => {
      setActive(true); setContext(null); setCurrentPath(''); setEntries([]);
      writePathInput(path ?? ''); setPending(true); setError(null);
      writeShowHidden(props.initialShowHidden ?? !props.loadDirectory);
    });
    try {
      const next = props.loadPathContext ? await props.loadPathContext() : props.pathContext;
      if (!active() || epoch !== requestEpoch) return;
      if (!next && props.loadDirectory) throw new PickerNavigationError('unavailableContext');
      const resolved = next ?? {
        homePathAbs: props.homePath ?? '', defaultRootId: 'root',
        roots: [{ id: 'root', label: props.homeLabel ?? defaultPickerCopy.root, pathAbs: '/' }],
      };
      setContext(resolved);
      const target = path || resolved.roots.find((root) => root.id === resolved.defaultRootId)?.pathAbs;
      if (!target) throw new PickerNavigationError('unavailableContext');
      await navigate(target);
    } catch (failure) {
      if (active() && epoch === requestEpoch) batch(() => { setError(failure); setPending(false); });
    }
  };

  return {
    context, currentPath, entries, pathInput, pending, error, showHidden, active, valid,
    open, close, navigate,
    setPathInput(value: string) {
      intent += 1;
      batch(() => { writePathInput(value); setPending(false); setError(null); });
    },
    async setShowHidden(value: boolean) {
      writeShowHidden(value);
      await navigate(pathInput() || currentPath());
    },
    async retry() {
      if (!context()) await open(initialTarget);
      else await navigate(pathInput() || currentPath());
    },
  };
}

export type FilesystemPickerDataSource = ReturnType<typeof createFilesystemPickerDataSource>;
