import { createContext, useContext, type JSX, type Accessor, createSignal, createMemo, createEffect, untrack } from 'solid-js';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';
import { deferNonBlocking } from '../../utils/defer';
import type {
  FileItem,
  ViewMode,
  SortConfig,
  FileListColumnRatios,
  FileBrowserContextValue,
  ContextMenuEvent,
  FilterMatchInfo,
  OptimisticOperation,
  ScrollPosition,
} from './types';

const FileBrowserContext = createContext<FileBrowserContextValue>();

const DEFAULT_LIST_COLUMN_RATIOS: FileListColumnRatios = {
  name: 0.65,
  modifiedAt: 0.2,
  size: 0.15,
};

const LIST_COLUMN_RATIOS_STORAGE_KEY = 'fileBrowser:listColumnRatios';

const DEFAULT_SIDEBAR_WIDTH_PX = 220;
const SIDEBAR_WIDTH_STORAGE_KEY = 'fileBrowser:sidebarWidth';
const SIDEBAR_MIN_WIDTH_PX = 160;
const SIDEBAR_MAX_WIDTH_PX = 520;

function normalizeSidebarWidthPx(widthPx: unknown, fallbackPx: number): number {
  const raw = typeof widthPx === 'number' && Number.isFinite(widthPx) ? widthPx : fallbackPx;
  return Math.max(SIDEBAR_MIN_WIDTH_PX, Math.min(SIDEBAR_MAX_WIDTH_PX, Math.round(raw)));
}

function normalizeListColumnRatios(ratios: FileListColumnRatios): FileListColumnRatios {
  // Defensive normalization to keep a stable, sum-to-1 layout state.
  const rawName = Number.isFinite(ratios.name) ? ratios.name : DEFAULT_LIST_COLUMN_RATIOS.name;
  const rawModifiedAt = Number.isFinite(ratios.modifiedAt)
    ? ratios.modifiedAt
    : DEFAULT_LIST_COLUMN_RATIOS.modifiedAt;
  const rawSize = Number.isFinite(ratios.size) ? ratios.size : DEFAULT_LIST_COLUMN_RATIOS.size;

  const name = Math.max(0, rawName);
  const modifiedAt = Math.max(0, rawModifiedAt);
  const size = Math.max(0, rawSize);

  const sum = name + modifiedAt + size;
  if (sum <= 0) return DEFAULT_LIST_COLUMN_RATIOS;
  return {
    name: name / sum,
    modifiedAt: modifiedAt / sum,
    size: size / sum,
  };
}

/**
 * Fuzzy match function - returns matched indices or null if no match
 * Supports subsequence matching (e.g., "cfg" matches "ConFiGuration")
 */
function fuzzyMatch(text: string, pattern: string): number[] | null {
  if (!pattern) return [];
  const t = text.toLowerCase();
  const p = pattern.toLowerCase();
  const indices: number[] = [];
  let ti = 0;

  for (const char of p) {
    const found = t.indexOf(char, ti);
    if (found === -1) return null;
    indices.push(found);
    ti = found + 1;
  }

  return indices;
}

export interface FileBrowserProviderProps {
  children: JSX.Element;
  files: FileItem[];
  initialPath?: string;
  initialViewMode?: ViewMode;
  /** Initial list view column ratios (for resizable columns) */
  initialListColumnRatios?: FileListColumnRatios;
  /** Initial sidebar width in pixels (resizable Explorer panel) */
  initialSidebarWidth?: number;
  /**
   * Optional storage key for persisting sidebar width.
   * When omitted, a shared key is used (acts like a user preference).
   */
  sidebarWidthStorageKey?: string;
  /** Label for the root/home directory in breadcrumb (default: 'Root') */
  homeLabel?: string;
  onNavigate?: (path: string) => void;
  onSelect?: (items: FileItem[]) => void;
  onOpen?: (item: FileItem) => void;
}

/**
 * Provider for file browser state management
 */
export function FileBrowserProvider(props: FileBrowserProviderProps) {
  const floe = useResolvedFloeConfig();

  const normalizePath = (path: string) => {
    const p = (path ?? '').trim();
    return p === '' ? '/' : p;
  };

  const [currentPath, setCurrentPathInternal] = createSignal(normalizePath(props.initialPath ?? '/'));
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [viewMode, setViewMode] = createSignal<ViewMode>(props.initialViewMode ?? 'list');
  const [sortConfig, setSortConfig] = createSignal<SortConfig>({ field: 'name', direction: 'asc' });

  const initialListColumnRatios = normalizeListColumnRatios(
    floe.persist.load<FileListColumnRatios>(
      LIST_COLUMN_RATIOS_STORAGE_KEY,
      props.initialListColumnRatios ?? DEFAULT_LIST_COLUMN_RATIOS
    )
  );
  const [listColumnRatios, setListColumnRatiosInternal] = createSignal<FileListColumnRatios>(
    initialListColumnRatios
  );

  // Treat storage keys as static for the provider lifetime.
  // eslint-disable-next-line solid/reactivity -- Provider props are intended to be static for the provider lifetime.
  const sidebarWidthStorageKey = (props.sidebarWidthStorageKey ?? '').trim() || SIDEBAR_WIDTH_STORAGE_KEY;
  const initialSidebarWidthPx = normalizeSidebarWidthPx(
    floe.persist.load<number>(sidebarWidthStorageKey, props.initialSidebarWidth ?? DEFAULT_SIDEBAR_WIDTH_PX),
    props.initialSidebarWidth ?? DEFAULT_SIDEBAR_WIDTH_PX
  );
  const [sidebarWidth, setSidebarWidthInternal] = createSignal<number>(initialSidebarWidthPx);
  const [expandedFolders, setExpandedFolders] = createSignal<Set<string>>(new Set(['/']));
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
  const [contextMenu, setContextMenu] = createSignal<ContextMenuEvent | null>(null);
  const [filterQuery, setFilterQueryInternal] = createSignal('');
  const [isFilterActive, setFilterActive] = createSignal(false);

  // Persist column ratios as a user preference (debounced for drag performance).
  createEffect(() => {
    floe.persist.debouncedSave(LIST_COLUMN_RATIOS_STORAGE_KEY, listColumnRatios());
  });

  // Persist sidebar width as a user preference (debounced for drag performance).
  createEffect(() => {
    floe.persist.debouncedSave(sidebarWidthStorageKey, sidebarWidth());
  });

  // Home label accessor (reactive)
  const homeLabel = () => props.homeLabel ?? 'Root';

  // Optimistic updates state
  const [optimisticOps, setOptimisticOps] = createSignal<OptimisticOperation[]>([]);

  // Scroll position management
  let scrollContainerEl: HTMLElement | null = null;
  let savedScrollPosition: ScrollPosition = { top: 0, left: 0 };

  // Build file tree accessor
  const files: Accessor<FileItem[]> = () => props.files;

  // Helper to get parent path
  const getParentPath = (path: string): string => {
    const p = normalizePath(path);
    if (p === '/') return '/';
    const parts = p.split('/').filter(Boolean);
    parts.pop();
    return parts.length ? '/' + parts.join('/') : '/';
  };

  // Apply optimistic operations to a file list
  const applyOptimisticOps = (items: FileItem[], parentPath: string): FileItem[] => {
    const ops = optimisticOps();
    if (ops.length === 0) return items;

    let result = [...items];
    const normalizedParent = normalizePath(parentPath);

    for (const op of ops) {
      switch (op.type) {
        case 'remove': {
          // Remove items whose path is in the removal list
          const pathsToRemove = new Set(op.paths.map(normalizePath));
          result = result.filter((item) => !pathsToRemove.has(normalizePath(item.path)));
          break;
        }
        case 'update': {
          // Update item if it exists in current list
          const oldPathNorm = normalizePath(op.oldPath);
          const idx = result.findIndex((item) => normalizePath(item.path) === oldPathNorm);
          if (idx !== -1) {
            // Check if the updated item should still be in this directory
            const newPath = op.updates.path ?? result[idx].path;
            const newParent = getParentPath(newPath);
            if (newParent === normalizedParent) {
              // Item stays in this directory, apply updates
              result[idx] = { ...result[idx], ...op.updates };
            } else {
              // Item moved to different directory, remove from current list
              result.splice(idx, 1);
            }
          } else {
            // Item might have been moved INTO this directory
            const newPath = op.updates.path;
            if (newPath && getParentPath(newPath) === normalizedParent) {
              // We need the original item data, which we don't have here
              // This case should be handled by the caller providing full item data
            }
          }
          break;
        }
        case 'insert': {
          // Insert item if it belongs to current directory
          if (normalizePath(op.parentPath) === normalizedParent) {
            // Check if item already exists (avoid duplicates)
            const exists = result.some(
              (item) => normalizePath(item.path) === normalizePath(op.item.path)
            );
            if (!exists) {
              result.push(op.item);
            }
          }
          break;
        }
      }
    }

    return result;
  };

  const fileIndex = createMemo(() => {
    const map = new Map<string, FileItem[]>();

    const visit = (items: FileItem[]) => {
      for (const item of items) {
        if (item.type !== 'folder') continue;
        map.set(normalizePath(item.path), item.children ?? []);
        if (item.children?.length) visit(item.children);
      }
    };

    const rootItems = files();
    map.set('/', rootItems);
    visit(rootItems);
    return map;
  });

  // Get files at current path
  const currentFiles = createMemo(() => {
    const path = normalizePath(currentPath());
    let found = fileIndex().get(path) ?? [];

    // Apply optimistic updates first (before filtering/sorting)
    found = applyOptimisticOps(found, path);

    // Apply fuzzy filter
    const query = filterQuery().trim();
    if (query) {
      found = found.filter(item => fuzzyMatch(item.name, query) !== null);
    }

    // Sort files
    const config = sortConfig();
    const sorted = [...found].sort((a, b) => {
      // Folders always come first
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }

      let comparison = 0;
      switch (config.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = (a.size ?? 0) - (b.size ?? 0);
          break;
        case 'modifiedAt':
          comparison = (a.modifiedAt?.getTime() ?? 0) - (b.modifiedAt?.getTime() ?? 0);
          break;
        case 'type':
          comparison = (a.extension ?? '').localeCompare(b.extension ?? '');
          break;
      }

      return config.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  });

  const setCurrentPath = (path: string) => {
    const nextPath = normalizePath(path);
    if (nextPath === currentPath()) return;
    setCurrentPathInternal(nextPath);
    // VSCode-style: navigation clears selection to avoid cross-folder stale selection.
    setSelectedIds(new Set<string>());
    // Clear filter when navigating to a different directory
    setFilterQueryInternal('');
    setFilterActive(false);
    const onSelect = props.onSelect;
    deferNonBlocking(() => onSelect?.([]));
    props.onNavigate?.(nextPath);
  };

  const setListColumnRatios = (ratios: FileListColumnRatios) => {
    setListColumnRatiosInternal(normalizeListColumnRatios(ratios));
  };

  const navigateUp = () => {
    const path = currentPath();
    if (path === '/' || path === '') return;

    const parts = path.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length ? '/' + parts.join('/') : '/');
  };

  const navigateTo = (item: FileItem) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path);
      // Auto-expand in tree
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.add(item.path);
        return next;
      });
    }
  };

  const selectItem = (id: string, multi = false) => {
    const prev = selectedIds();
    const next = multi ? new Set(prev) : new Set<string>();

    if (multi) {
      // Ctrl/Cmd: toggle membership.
      if (next.has(id)) next.delete(id);
      else next.add(id);
    } else {
      // Single click: always select the item (do not toggle-off).
      next.clear();
      next.add(id);
    }

    setSelectedIds(next);

    // Notify parent after paint to keep selection highlight responsive.
    // Also compute the selected list outside the click handler hot-path.
    const onSelect = props.onSelect;
    if (onSelect) {
      const selectedIdsSnapshot = new Set(next);
      deferNonBlocking(() => {
        const selected = untrack(() => currentFiles().filter((f) => selectedIdsSnapshot.has(f.id)));
        onSelect(selected);
      });
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set<string>());
    const onSelect = props.onSelect;
    deferNonBlocking(() => onSelect?.([]));
  };

  const isSelected = (id: string) => selectedIds().has(id);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const isExpanded = (path: string) => expandedFolders().has(path);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  const setSidebarWidth = (widthPx: number) => {
    setSidebarWidthInternal((prev) => normalizeSidebarWidthPx(widthPx, prev));
  };

  const showContextMenu = (event: ContextMenuEvent) => setContextMenu(event);
  const hideContextMenu = () => setContextMenu(null);

  const setFilterQuery = (query: string) => {
    setFilterQueryInternal(query);
  };

  const getFilterMatch = (name: string): FilterMatchInfo | null => {
    const query = filterQuery().trim();
    if (!query) return null;
    const indices = fuzzyMatch(name, query);
    if (!indices) return null;
    return { matchedIndices: indices };
  };

  const openItem = (item: FileItem) => {
    if (item.type === 'folder') {
      navigateTo(item);
    } else {
      props.onOpen?.(item);
    }
  };

  // Optimistic update methods
  const optimisticRemove = (paths: string[]) => {
    if (paths.length === 0) return;
    setOptimisticOps((prev) => [...prev, { type: 'remove', paths }]);
  };

  const optimisticUpdate = (oldPath: string, updates: Partial<FileItem>) => {
    setOptimisticOps((prev) => [...prev, { type: 'update', oldPath, updates }]);
  };

  const optimisticInsert = (parentPath: string, item: FileItem) => {
    setOptimisticOps((prev) => [...prev, { type: 'insert', parentPath, item }]);
  };

  const clearOptimisticUpdates = () => {
    setOptimisticOps([]);
  };

  const rollbackOptimisticUpdates = () => {
    setOptimisticOps([]);
  };

  const hasOptimisticUpdates = () => optimisticOps().length > 0;

  // Scroll position management methods
  const setScrollContainer = (el: HTMLElement | null) => {
    scrollContainerEl = el;
  };

  const getScrollPosition = (): ScrollPosition => {
    if (!scrollContainerEl) return { top: 0, left: 0 };
    return {
      top: scrollContainerEl.scrollTop,
      left: scrollContainerEl.scrollLeft,
    };
  };

  const setScrollPosition = (position: ScrollPosition) => {
    if (!scrollContainerEl) return;
    scrollContainerEl.scrollTop = position.top;
    scrollContainerEl.scrollLeft = position.left;
  };

  const saveScrollPosition = (): ScrollPosition => {
    savedScrollPosition = getScrollPosition();
    return savedScrollPosition;
  };

  const restoreScrollPosition = () => {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      setScrollPosition(savedScrollPosition);
    });
  };

  const contextValue: FileBrowserContextValue = {
    currentPath,
    setCurrentPath,
    navigateUp,
    navigateTo,
    homeLabel,
    selectedItems: () => selectedIds(),
    selectItem,
    clearSelection,
    isSelected,
    viewMode,
    setViewMode,
    sortConfig,
    setSortConfig,
    listColumnRatios,
    setListColumnRatios,
    expandedFolders,
    toggleFolder,
    isExpanded,
    files,
    currentFiles,
    filterQuery,
    setFilterQuery,
    isFilterActive,
    setFilterActive,
    getFilterMatch,
    sidebarCollapsed,
    toggleSidebar,
    sidebarWidth,
    setSidebarWidth,
    contextMenu,
    showContextMenu,
    hideContextMenu,
    openItem,
    // Optimistic updates
    optimisticRemove,
    optimisticUpdate,
    optimisticInsert,
    clearOptimisticUpdates,
    rollbackOptimisticUpdates,
    hasOptimisticUpdates,
    // Scroll position management
    setScrollContainer,
    getScrollPosition,
    setScrollPosition,
    saveScrollPosition,
    restoreScrollPosition,
  };

  return (
    <FileBrowserContext.Provider value={contextValue}>
      {props.children}
    </FileBrowserContext.Provider>
  );
}

/**
 * Hook to access file browser context
 */
export function useFileBrowser(): FileBrowserContextValue {
  const context = useContext(FileBrowserContext);
  if (!context) {
    throw new Error('useFileBrowser must be used within a FileBrowserProvider');
  }
  return context;
}
