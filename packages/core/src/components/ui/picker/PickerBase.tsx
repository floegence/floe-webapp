/**
 * Shared internals for DirectoryPicker and FileSavePicker.
 * NOT exported from the package entry — these are implementation details.
 */
import {
  Show,
  For,
  createSignal,
  createMemo,
  createEffect,
  on,
  onCleanup,
  untrack,
  type Accessor,
  type JSX,
} from 'solid-js';
import { cn } from '../../../utils/cn';
import { deferAfterPaint } from '../../../utils/defer';
import { Button } from '../Button';
import { Input } from '../Input';
import { ChevronRight, Plus, Check, X } from '../../icons';
import { FileItemIcon, FolderOpenIcon } from '../../file-browser/FileIcons';
import type { FileItem } from '../../file-browser/types';

// ─── Common Picker Props Interface ────────────────────────────────────────────

/**
 * Base props shared by DirectoryPicker and FileSavePicker.
 * Provides consistent API for file tree navigation.
 */
export interface BasePickerProps {
  /** Whether the picker dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Full file tree data */
  files: FileItem[];
  /** Initial directory path (default: '/') */
  initialPath?: string;
  /** Dialog title - can be a string or JSX element for custom headers */
  title?: string | JSX.Element;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text (default: 'Cancel') */
  cancelText?: string;
  /**
   * Callback when user creates a new folder.
   * When provided, a "New Folder" button is shown.
   */
  onCreateFolder?: (parentPath: string, name: string) => Promise<void>;
  /**
   * Callback when user expands a directory.
   * Use this to dynamically load children for the expanded directory.
   * The path parameter is the internal tree path (not the display path).
   */
  onExpand?: (path: string) => void | Promise<void>;
  /**
   * Async resolver used when a navigation target may exist outside the current
   * in-memory tree snapshot. A ready result guarantees the target path and its
   * ancestor chain are now represented in `files`.
   */
  ensurePath?: PickerEnsurePath;
  /** Filter which directories are selectable (return false to grey-out) */
  filter?: (item: FileItem) => boolean;
  /** Label for the home/root directory (default: 'Root') */
  homeLabel?: string;
  /**
   * Real filesystem path of the home directory (e.g. '/home/user').
   * When set, paths display with real filesystem paths.
   */
  homePath?: string;
  /** Additional CSS class */
  class?: string;
}

// ─── Path utilities ──────────────────────────────────────────────────────────

export function normalizePath(path: string): string {
  const p = (path ?? '').trim();
  if (p === '' || p === '/') return '/';
  const cleaned = p.replace(/\/+$/, '');
  return cleaned.startsWith('/') ? cleaned : '/' + cleaned;
}

/**
 * Returns ancestor paths (excluding root and the path itself).
 * e.g. "/a/b/c" → ["/a", "/a/b"]
 */
export function getAncestorPaths(path: string): string[] {
  const parts = path.split('/').filter(Boolean);
  const ancestors: string[] = [];
  let current = '';
  for (let i = 0; i < parts.length - 1; i++) {
    current += '/' + parts[i];
    ancestors.push(current);
  }
  return ancestors;
}

/** Get parent path of a given path */
export function getParentPath(path: string): string {
  const p = normalizePath(path);
  if (p === '/') return '/';
  const parts = p.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? '/' + parts.join('/') : '/';
}

// ─── Folder index ────────────────────────────────────────────────────────────

/** Build a path → FileItem map for all folders in the tree */
export function useFolderIndex(files: Accessor<FileItem[]>) {
  // eslint-disable-next-line solid/reactivity
  return createMemo(() => {
    const map = new Map<string, FileItem>();
    const visit = (items: FileItem[]) => {
      for (const item of items) {
        if (item.type !== 'folder') continue;
        map.set(normalizePath(item.path), item);
        if (item.children?.length) visit(item.children);
      }
    };
    visit(files());
    return map;
  });
}

// ─── Picker tree state hook ──────────────────────────────────────────────────

export interface UsePickerTreeOptions {
  initialPath?: string | Accessor<string | undefined>;
  open: Accessor<boolean>;
  files: Accessor<FileItem[]>;
  filter?: (item: FileItem) => boolean;
  /** Additional reset logic when the dialog opens */
  onReset?: (initialPath: string) => void;
  /**
   * Callback when user expands a directory.
   * Use this to dynamically load children for the expanded directory.
   */
  onExpand?: (path: string) => void | Promise<void>;
  /** Async resolver that ensures a target path exists in the current tree snapshot. */
  ensurePath?: PickerEnsurePath;
  /** Label for the home/root directory in tree and breadcrumb (default: 'Root'). Supports accessor for reactivity. */
  homeLabel?: string | Accessor<string | undefined>;
  /**
   * Real filesystem path of the home directory (e.g. '/home/user').
   * When set, the path input bar and display paths will show real filesystem
   * paths instead of internal tree-relative paths. Supports accessor for reactivity.
   */
  homePath?: string | Accessor<string | undefined>;
}

export interface PickerTreeState {
  selectedPath: Accessor<string>;
  setSelectedPath: (path: string) => void;
  expandedPaths: Accessor<Set<string>>;
  toggleExpand: (path: string) => void;
  pathInput: Accessor<string>;
  setPathInput: (value: string) => void;
  pathPending: Accessor<boolean>;
  pathInputError: Accessor<string>;
  setPathInputError: (value: string) => void;
  folderIndex: Accessor<Map<string, FileItem>>;
  rootFolders: Accessor<FileItem[]>;
  isValidPath: (path: string) => boolean;
  isSelectable: (item: FileItem) => boolean;
  handleSelectFolder: (item: FileItem) => void;
  handleSelectRoot: () => void;
  handlePathInputGo: () => void;
  handlePathInputKeyDown: (e: KeyboardEvent) => void;
  expandToPath: (path: string) => void;
  navigateToPath: (path: string, options: PickerEnsurePathOptions) => Promise<PickerPathResolveResult>;
  breadcrumbSegments: Accessor<{ name: string; path: string }[]>;
  handleBreadcrumbClick: (path: string) => void;
  /** Home label for display (reactive) */
  homeLabel: Accessor<string>;
  /** Convert internal tree path to display (real filesystem) path */
  toDisplayPath: (internalPath: string) => string;
  /** Monotonic counter used to reveal the selected row after async navigation. */
  revealNonce: Accessor<number>;
}

export type PickerPathResolveStatus =
  | 'ready'
  | 'missing'
  | 'error';

export type PickerPathNavigateReason =
  | 'open'
  | 'path-input'
  | 'tree-expand'
  | 'tree-select'
  | 'breadcrumb';

export interface PickerEnsurePathOptions {
  reason: PickerPathNavigateReason;
}

export interface PickerPathResolveResult {
  status: PickerPathResolveStatus;
  resolvedPath: string;
  message?: string;
}

export type PickerEnsurePath = (
  path: string,
  options: PickerEnsurePathOptions,
) => PickerPathResolveResult | Promise<PickerPathResolveResult>;

export function resolvePickerInitialPath(
  initialPath: string | undefined,
  homePath: string | undefined,
): string {
  const normalizedInitialPath = normalizePath(initialPath ?? '/');
  const normalizedHomePath = homePath ? normalizePath(homePath) : undefined;

  if (!normalizedHomePath || normalizedHomePath === '/') {
    return normalizedInitialPath;
  }
  if (normalizedInitialPath === normalizedHomePath) {
    return '/';
  }
  if (normalizedInitialPath.startsWith(normalizedHomePath + '/')) {
    return normalizePath(normalizedInitialPath.slice(normalizedHomePath.length));
  }
  return normalizedInitialPath;
}

export function usePickerTree(opts: UsePickerTreeOptions): PickerTreeState {
  // Reactive getters for homeLabel and homePath (support both string and accessor)
  const getHomeLabel = (): string => {
    const hl = typeof opts.homeLabel === 'function' ? opts.homeLabel() : opts.homeLabel;
    return hl ?? 'Root';
  };
  const getHomePath = (): string | undefined => {
    const hp = typeof opts.homePath === 'function' ? opts.homePath() : opts.homePath;
    return hp ? normalizePath(hp) : undefined;
  };
  const getInitialPath = (): string => {
    const raw = typeof opts.initialPath === 'function' ? opts.initialPath() : opts.initialPath;
    return resolvePickerInitialPath(raw, getHomePath());
  };

  /** Convert internal tree path (e.g. '/Documents') to display path (e.g. '/home/user/Documents') */
  const toDisplayPath = (internalPath: string): string => {
    const homePath = getHomePath();
    if (!homePath) return internalPath;
    const p = normalizePath(internalPath);
    if (p === '/') return homePath;
    return homePath === '/' ? p : homePath + p;
  };

  /** Convert display path (e.g. '/home/user/Documents') back to internal tree path (e.g. '/Documents') */
  const toInternalPath = (displayPath: string): string => {
    const homePath = getHomePath();
    if (!homePath) return normalizePath(displayPath);
    const dp = normalizePath(displayPath);
    if (dp === homePath) return '/';
    if (homePath !== '/' && dp.startsWith(homePath + '/')) {
      return dp.slice(homePath.length) || '/';
    }
    // If display path doesn't start with homePath, treat as-is (internal path was entered directly)
    return normalizePath(displayPath);
  };

  const [selectedPath, setSelectedPath] = createSignal(getInitialPath());
  const [expandedPaths, setExpandedPaths] = createSignal<Set<string>>(new Set(['/']));
  const [pathInput, setPathInput] = createSignal(toDisplayPath(getInitialPath()));
  const [pathPending, setPathPending] = createSignal(false);
  const [pathInputError, setPathInputError] = createSignal('');
  const [revealNonce, setRevealNonce] = createSignal(0);
  let navigationSeq = 0;

  const folderIndex = useFolderIndex(opts.files);
  const rootFolders = createMemo(() => opts.files().filter((f) => f.type === 'folder'));

  // Sync path input when selection changes via tree click
  createEffect(
    on(selectedPath, (path) => {
      setPathInput(toDisplayPath(path));
      setPathInputError('');
    })
  );

  const isValidPath = (path: string): boolean => {
    const p = normalizePath(path);
    return p === '/' || folderIndex().has(p);
  };

  const isSelectable = (item: FileItem): boolean => {
    if (!opts.filter) return true;
    return opts.filter(item);
  };

  const expandToPath = (path: string) => {
    const ancestors = getAncestorPaths(path);
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      for (const a of ancestors) next.add(a);
      next.add(path);
      return next;
    });
  };

  const requestReveal = () => {
    setRevealNonce((prev) => prev + 1);
  };

  const requestExpandedChildren = (path: string) => {
    if (!opts.onExpand) return;
    try {
      const maybePromise = opts.onExpand(path);
      void Promise.resolve(maybePromise).catch(() => {});
    } catch {
      // Downstream loaders may fail independently; keep picker state usable.
    }
  };

  const resolvePath = async (
    path: string,
    options: PickerEnsurePathOptions,
  ): Promise<PickerPathResolveResult> => {
    const normalizedPath = normalizePath(path);
    if (normalizedPath === '/') {
      return { status: 'ready', resolvedPath: '/' };
    }
    if (!opts.ensurePath) {
      return isValidPath(normalizedPath)
        ? { status: 'ready', resolvedPath: normalizedPath }
        : { status: 'missing', resolvedPath: normalizedPath, message: 'Path not found' };
    }
    try {
      const result = await opts.ensurePath(normalizedPath, options);
      return {
        status: result.status,
        resolvedPath: normalizePath(result.resolvedPath || normalizedPath),
        message: result.message?.trim() || undefined,
      };
    } catch {
      return {
        status: 'error',
        resolvedPath: normalizedPath,
        message: 'Could not load path',
      };
    }
  };

  const navigateToPath = async (
    path: string,
    options: PickerEnsurePathOptions,
  ): Promise<PickerPathResolveResult> => {
    const normalizedPath = normalizePath(path);
    navigationSeq += 1;
    const seq = navigationSeq;
    setPathPending(true);
    if (options.reason !== 'open') {
      setPathInputError('');
    }

    try {
      const result = await resolvePath(normalizedPath, options);
      if (seq !== navigationSeq) return result;

      if (result.status === 'ready') {
        const resolvedPath = normalizePath(result.resolvedPath);
        setSelectedPath(resolvedPath);
        expandToPath(resolvedPath);
        setPathInputError('');
        requestReveal();
      } else if (options.reason !== 'open') {
        setPathInputError(result.message || (result.status === 'missing' ? 'Path not found' : 'Could not load path'));
      }

      return result;
    } finally {
      if (seq === navigationSeq) {
        setPathPending(false);
      }
    }
  };

  const toggleExpand = (path: string) => {
    const wasExpanded = expandedPaths().has(path);
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    if (!wasExpanded) {
      requestExpandedChildren(path);
    }
  };

  const handleSelectFolder = (item: FileItem) => {
    if (!isSelectable(item)) return;
    const wasExpanded = expandedPaths().has(item.path);
    void navigateToPath(item.path, { reason: 'tree-select' })
      .then((result) => {
        if (result.status !== 'ready' || wasExpanded) return;
        requestExpandedChildren(normalizePath(result.resolvedPath));
      });
  };

  const handleSelectRoot = () => {
    void navigateToPath('/', { reason: 'tree-select' });
  };

  const handlePathInputGo = () => {
    const value = toInternalPath(pathInput().trim());
    void navigateToPath(value, { reason: 'path-input' });
  };

  const handlePathInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePathInputGo();
    }
  };

  const breadcrumbSegments = createMemo(() => {
    const path = selectedPath();
    const label = getHomeLabel();
    if (path === '/' || path === '') return [{ name: label, path: '/' }];
    const parts = path.split('/').filter(Boolean);
    const result: { name: string; path: string }[] = [{ name: label, path: '/' }];
    let current = '';
    for (const part of parts) {
      current += '/' + part;
      result.push({ name: part, path: current });
    }
    return result;
  });

  const handleBreadcrumbClick = (path: string) => {
    void navigateToPath(path, { reason: 'breadcrumb' });
  };

  createEffect(
    on(opts.open, (open) => {
      if (open) {
        const init = getInitialPath();
        setSelectedPath(init);
        setPathInput(toDisplayPath(init));
        setPathInputError('');
        const ancestors = getAncestorPaths(init);
        setExpandedPaths(new Set(['/', ...ancestors]));
        requestReveal();
        opts.onReset?.(init);
        void navigateToPath(init, { reason: 'open' });
      }
    })
  );

  return {
    selectedPath,
    setSelectedPath,
    expandedPaths,
    toggleExpand,
    pathInput,
    setPathInput,
    pathPending,
    pathInputError,
    setPathInputError,
    folderIndex,
    rootFolders,
    isValidPath,
    isSelectable,
    handleSelectFolder,
    handleSelectRoot,
    handlePathInputGo,
    handlePathInputKeyDown,
    expandToPath,
    navigateToPath,
    breadcrumbSegments,
    handleBreadcrumbClick,
    homeLabel: getHomeLabel,
    toDisplayPath,
    revealNonce,
  };
}

// ─── New folder inline UI ────────────────────────────────────────────────────

export interface NewFolderSectionProps {
  parentPath: Accessor<string>;
  onCreateFolder: (parentPath: string, name: string) => Promise<void>;
  /** Optional function to convert internal path to display path */
  toDisplayPath?: (internalPath: string) => string;
}

export function NewFolderSection(props: NewFolderSectionProps) {
  const [creating, setCreating] = createSignal(false);
  const [name, setName] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const handleStart = () => {
    setCreating(true);
    setName('');
  };

  const handleCancel = () => {
    setCreating(false);
    setName('');
  };

  const handleConfirm = () => {
    const trimmed = name().trim();
    if (!trimmed || loading()) return;

    // UI response priority: show loading first, then start potentially heavy async work after a paint.
    setLoading(true);
    const parentPath = props.parentPath();
    const folderName = trimmed;
    const onCreateFolder = props.onCreateFolder;

    deferAfterPaint(() => {
      void onCreateFolder(parentPath, folderName)
        .then(() => {
          setCreating(false);
          setName('');
        })
        .catch((err) => {
          console.error('Failed to create folder:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <Show
      when={creating()}
      fallback={
        <button
          type="button"
          onClick={handleStart}
          class={cn(
            'flex items-center gap-1 text-xs text-muted-foreground cursor-pointer',
            'hover:text-foreground transition-colors duration-100',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1 py-0.5'
          )}
        >
          <Plus class="w-3.5 h-3.5" />
          <span>New Folder</span>
        </button>
      }
    >
      <div class="flex items-center gap-1.5">
        <div class="flex-1">
          <Input
            size="sm"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Folder name"
            disabled={loading()}
            autofocus
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleConfirm}
          loading={loading()}
          disabled={!name().trim()}
        >
          <Check class="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost-destructive"
          size="sm"
          onClick={handleCancel}
          disabled={loading()}
        >
          <X class="w-3.5 h-3.5" />
        </Button>
      </div>
      <p class="text-[11px] text-muted-foreground -mt-1">
        Creating in: {props.toDisplayPath ? props.toDisplayPath(props.parentPath()) : props.parentPath()}
      </p>
    </Show>
  );
}

// ─── Path input bar ──────────────────────────────────────────────────────────

export interface PathInputBarProps {
  value: Accessor<string>;
  onInput: (value: string) => void;
  pending?: Accessor<boolean>;
  error: Accessor<string>;
  onGo: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  placeholder?: string;
}

export function PathInputBar(props: PathInputBarProps) {
  return (
    <div class="flex items-center gap-1.5">
      <div class="flex-1">
        <Input
          size="sm"
          value={props.value()}
          onInput={(e) => props.onInput(e.currentTarget.value)}
          onKeyDown={props.onKeyDown}
          placeholder={props.placeholder ?? '/path/to/directory'}
          disabled={props.pending?.() === true}
          error={props.error()}
        />
      </div>
      <Button variant="outline" size="sm" onClick={props.onGo} disabled={props.pending?.() === true}>
        {props.pending?.() === true ? 'Opening…' : 'Go'}
      </Button>
    </div>
  );
}

// ─── Breadcrumb bar ──────────────────────────────────────────────────────────

export interface PickerBreadcrumbProps {
  segments: Accessor<{ name: string; path: string }[]>;
  onClick: (path: string) => void;
}

export function PickerBreadcrumb(props: PickerBreadcrumbProps) {
  return (
    <nav class="flex items-center gap-0.5 min-w-0 overflow-x-auto py-0.5" aria-label="Selected path">
      <For each={props.segments()}>
        {(segment, index) => (
          <>
            <Show when={index() > 0}>
              <ChevronRight class="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            </Show>
            <button
              type="button"
              onClick={() => props.onClick(segment.path)}
              class={cn(
                'text-xs px-1 py-0.5 rounded cursor-pointer flex-shrink-0',
                'transition-colors duration-100',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                index() === props.segments().length - 1
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {segment.name}
            </button>
          </>
        )}
      </For>
    </nav>
  );
}

// ─── Folder tree panel ───────────────────────────────────────────────────────

export interface PickerFolderTreeProps {
  rootFolders: Accessor<FileItem[]>;
  selectedPath: Accessor<string>;
  expandedPaths: Accessor<Set<string>>;
  revealNonce?: Accessor<number>;
  onToggle: (path: string) => void;
  onSelect: (item: FileItem) => void;
  onSelectRoot: () => void;
  isSelectable: (item: FileItem) => boolean;
  class?: string;
  style?: JSX.CSSProperties;
  emptyText?: string;
  /** Label for the home/root directory (default: 'Root'). Supports accessor for reactivity. */
  homeLabel?: string | Accessor<string>;
}

export function PickerFolderTree(props: PickerFolderTreeProps) {
  const getLabel = () => {
    const hl = typeof props.homeLabel === 'function' ? props.homeLabel() : props.homeLabel;
    return hl ?? 'Root';
  };
  let scrollContainerEl: HTMLDivElement | undefined;
  const rowRefs = new Map<string, HTMLButtonElement>();
  let handledRevealNonce = -1;

  const registerRow = (path: string, el: HTMLButtonElement | null) => {
    if (el) {
      rowRefs.set(path, el);
      return;
    }
    rowRefs.delete(path);
  };

  createEffect(() => {
    const revealNonce = props.revealNonce?.() ?? 0;
    const selectedPath = props.selectedPath();
    props.expandedPaths();
    props.rootFolders();

    if (revealNonce <= handledRevealNonce) {
      return;
    }

    queueMicrotask(() => {
      if (!scrollContainerEl) return;
      const stillPendingReveal = untrack(() => (props.revealNonce?.() ?? 0) === revealNonce && revealNonce > handledRevealNonce);
      if (!stillPendingReveal) {
        return;
      }

      if (selectedPath === '/') {
        scrollContainerEl.scrollTop = 0;
        handledRevealNonce = revealNonce;
        return;
      }

      const row = rowRefs.get(selectedPath);
      if (!row) {
        return;
      }
      row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      handledRevealNonce = revealNonce;
    });
  });

  return (
    <div
      ref={(el) => {
        scrollContainerEl = el;
      }}
      class={cn('border border-border rounded overflow-y-auto', props.class)}
      style={props.style}
    >
      {/* Root entry */}
      <button
        type="button"
        onClick={() => props.onSelectRoot()}
        class={cn(
          'flex items-center gap-1.5 w-full text-left text-xs py-1.5 px-2 cursor-pointer',
          'transition-colors duration-100',
          'hover:bg-accent/60',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
          props.selectedPath() === '/' && 'bg-accent text-accent-foreground font-medium'
        )}
      >
        <FolderOpenIcon class="w-4 h-4 flex-shrink-0" />
        <span>{getLabel()}</span>
      </button>

      <For each={props.rootFolders()}>
        {(item) => (
          <PickerTreeNode
            item={item}
            depth={1}
            selectedPath={props.selectedPath}
            expandedPaths={props.expandedPaths}
            revealNonce={props.revealNonce}
            onToggle={props.onToggle}
            onSelect={props.onSelect}
            isSelectable={props.isSelectable}
            registerRow={registerRow}
          />
        )}
      </For>

      <Show when={props.rootFolders().length === 0}>
        <div class="flex items-center justify-center py-6 text-xs text-muted-foreground">
          {props.emptyText ?? 'No directories available'}
        </div>
      </Show>
    </div>
  );
}

// ─── Tree node ───────────────────────────────────────────────────────────────

export interface PickerTreeNodeProps {
  item: FileItem;
  depth: number;
  selectedPath: Accessor<string>;
  expandedPaths: Accessor<Set<string>>;
  revealNonce?: Accessor<number>;
  onToggle: (path: string) => void;
  onSelect: (item: FileItem) => void;
  isSelectable: (item: FileItem) => boolean;
  registerRow: (path: string, el: HTMLButtonElement | null) => void;
}

export function PickerTreeNode(props: PickerTreeNodeProps) {
  const isExpanded = () => props.expandedPaths().has(props.item.path);
  const isActive = () => props.selectedPath() === props.item.path;
  const selectable = () => props.isSelectable(props.item);
  const subfolders = createMemo(
    () => props.item.children?.filter((c) => c.type === 'folder') ?? []
  );
  const hasSubfolders = () => subfolders().length > 0;
  // For lazy loading: always show expand arrow for folders (they might have children not yet loaded)
  const showExpandArrow = () => props.item.type === 'folder';

  const handleChevronClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onToggle(props.item.path);
  };

  const handleSelect = () => {
    props.onSelect(props.item);
  };

  onCleanup(() => {
    props.registerRow(props.item.path, null);
  });

  return (
    <div class="flex flex-col">
      <div
        class={cn(
          'group flex items-center w-full text-xs',
          'transition-colors duration-100',
          selectable() ? 'hover:bg-accent/60' : 'opacity-50',
          isActive() && selectable() && 'bg-accent text-accent-foreground font-medium'
        )}
        style={{ 'padding-left': `${4 + props.depth * 14}px` }}
      >
        <Show
          when={showExpandArrow()}
          fallback={<span class="flex-shrink-0 w-4 h-4" />}
        >
          <button
            type="button"
            onClick={handleChevronClick}
            class={cn(
              'flex-shrink-0 w-4 h-4 flex items-center justify-center cursor-pointer',
              'transition-transform duration-150',
              isExpanded() && 'rotate-90',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring'
            )}
            aria-label={isExpanded() ? 'Collapse folder' : 'Expand folder'}
          >
            <ChevronRight class="w-3 h-3 opacity-60" />
          </button>
        </Show>

        <button
          ref={(el) => {
            props.registerRow(props.item.path, el);
          }}
          type="button"
          data-picker-row-path={props.item.path}
          onClick={handleSelect}
          disabled={!selectable()}
          class={cn(
            'flex items-center gap-1 flex-1 min-w-0 text-left py-1.5 pl-0.5 pr-2',
            selectable() ? 'cursor-pointer' : 'cursor-not-allowed',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring'
          )}
        >
          <span class="flex-shrink-0 w-4 h-4">
            <FileItemIcon item={props.item} open={isExpanded()} class="w-4 h-4" />
          </span>
          <span class="truncate">{props.item.name}</span>
        </button>
      </div>

      <Show when={isExpanded() && hasSubfolders()}>
        <div class="overflow-hidden">
          <For each={subfolders()}>
            {(child) => (
              <PickerTreeNode
                item={child}
                depth={props.depth + 1}
                selectedPath={props.selectedPath}
                expandedPaths={props.expandedPaths}
                revealNonce={props.revealNonce}
                onToggle={props.onToggle}
                onSelect={props.onSelect}
                isSelectable={props.isSelectable}
                registerRow={props.registerRow}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
