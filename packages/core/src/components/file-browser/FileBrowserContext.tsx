import { createContext, useContext, type JSX, type Accessor, createSignal, createMemo, createEffect, untrack } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';
import { deferAfterPaint, deferNonBlocking } from '../../utils/defer';
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

// Persisted state keys
const VIEW_MODE_STORAGE_KEY = 'fileBrowser:viewMode';
const SORT_CONFIG_STORAGE_KEY = 'fileBrowser:sortConfig';
const EXPANDED_FOLDERS_STORAGE_KEY = 'fileBrowser:expandedFolders';
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'fileBrowser:sidebarCollapsed';

function normalizeSidebarWidthPx(widthPx: unknown, fallbackPx: number): number {
  const raw = typeof widthPx === 'number' && Number.isFinite(widthPx) ? widthPx : fallbackPx;
  return Math.max(SIDEBAR_MIN_WIDTH_PX, Math.min(SIDEBAR_MAX_WIDTH_PX, Math.round(raw)));
}

function normalizeViewMode(mode: unknown, fallback: ViewMode): ViewMode {
  if (mode === 'list' || mode === 'grid') return mode;
  return fallback;
}

function normalizeSortConfig(config: unknown, fallback: SortConfig): SortConfig {
  if (!config || typeof config !== 'object') return fallback;
  const c = config as Record<string, unknown>;
  const field = c.field;
  const direction = c.direction;
  const validField = field === 'name' || field === 'size' || field === 'modifiedAt' || field === 'type';
  const validDir = direction === 'asc' || direction === 'desc';
  if (!validField || !validDir) return fallback;
  return { field: field as SortConfig['field'], direction: direction as SortConfig['direction'] };
}

function normalizeExpandedFolders(folders: unknown): string[] {
  if (!Array.isArray(folders)) return ['/'];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of folders) {
    if (typeof item !== 'string') continue;
    const p = item.trim();
    if (!p || seen.has(p)) continue;
    seen.add(p);
    result.push(p);
  }
  // The root folder is always expanded.
  if (!seen.has('/')) result.unshift('/');
  return result;
}

function normalizeUniqueStrings(values: Iterable<string>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== 'string') continue;
    const next = value.trim();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    result.push(next);
  }

  return result;
}

function createFlagRecord(values: Iterable<string>): Record<string, true> {
  const result: Record<string, true> = {};
  for (const value of values) {
    result[value] = true;
  }
  return result;
}

function isSameStringList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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
function fuzzyMatchLower(textLower: string, patternLower: string): number[] | null {
  if (!patternLower) return [];
  const indices: number[] = [];
  let ti = 0;

  for (const char of patternLower) {
    const found = textLower.indexOf(char, ti);
    if (found === -1) return null;
    indices.push(found);
    ti = found + 1;
  }

  return indices;
}

export interface FileBrowserProviderProps {
  children: JSX.Element;
  files: FileItem[];
  /**
   * Controlled current path. When provided, FileBrowser follows this value.
   */
  path?: string;
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
  /**
   * Persistence key prefix to isolate per-instance state.
   * When provided, we persist viewMode, sortConfig, expandedFolders, and sidebarCollapsed.
   * When omitted, these states are not persisted.
   */
  persistenceKey?: string;
  /** Label for the root/home directory in breadcrumb (default: 'Root') */
  homeLabel?: string;
  onNavigate?: (path: string) => void;
  onPathChange?: (path: string, source: 'user' | 'programmatic') => void;
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

  // eslint-disable-next-line solid/reactivity -- Provider props are intended to be static for the provider lifetime.
  const persistenceKey = (props.persistenceKey ?? '').trim();
  const shouldPersist = !!persistenceKey;

  // Build the persisted storage key.
  const getStorageKey = (base: string) => persistenceKey ? `${persistenceKey}:${base}` : base;

  // Load persisted viewMode.
  const initialViewMode = shouldPersist
    ? normalizeViewMode(
        floe.persist.load<ViewMode>(getStorageKey(VIEW_MODE_STORAGE_KEY), props.initialViewMode ?? 'list'),
        props.initialViewMode ?? 'list'
      )
    : (props.initialViewMode ?? 'list');

  // Load persisted sortConfig.
  const defaultSortConfig: SortConfig = { field: 'name', direction: 'asc' };
  const initialSortConfig = shouldPersist
    ? normalizeSortConfig(
        floe.persist.load<SortConfig>(getStorageKey(SORT_CONFIG_STORAGE_KEY), defaultSortConfig),
        defaultSortConfig
      )
    : defaultSortConfig;

  // Load persisted expandedFolders.
  const initialExpandedFolders = shouldPersist
    ? normalizeExpandedFolders(
        floe.persist.load<string[]>(getStorageKey(EXPANDED_FOLDERS_STORAGE_KEY), ['/'])
      )
    : ['/'];

  // Load persisted sidebarCollapsed.
  const initialSidebarCollapsed = shouldPersist
    ? floe.persist.load<boolean>(getStorageKey(SIDEBAR_COLLAPSED_STORAGE_KEY), false) === true
    : false;

  const resolveInitialPath = () => {
    if (typeof props.path === 'string') return normalizePath(props.path);
    return normalizePath(props.initialPath ?? '/');
  };

  const [currentPath, setCurrentPathInternal] = createSignal(resolveInitialPath());
  const [selectedById, setSelectedById] = createStore<Record<string, true>>({});
  const [selectedIdList, setSelectedIdList] = createSignal<string[]>([]);
  const [viewMode, setViewModeInternal] = createSignal<ViewMode>(initialViewMode);
  const [sortConfig, setSortConfigInternal] = createSignal<SortConfig>(initialSortConfig);

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
  const [expandedByPath, setExpandedByPath] = createStore<Record<string, true>>(
    createFlagRecord(initialExpandedFolders)
  );
  const [expandedPathList, setExpandedPathList] = createSignal<string[]>(initialExpandedFolders);
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(initialSidebarCollapsed);
  const [contextMenu, setContextMenu] = createSignal<ContextMenuEvent | null>(null);
  const [filterQuery, setFilterQueryInternal] = createSignal('');
  const [filterQueryApplied, setFilterQueryApplied] = createSignal('');
  const [isFilterActive, setFilterActive] = createSignal(false);

  // UI-first filtering: apply the query after a paint so typing never blocks the input event.
  // We also coalesce rapid updates and only apply the latest query.
  let filterApplyJob = 0;
  createEffect(() => {
    const next = filterQuery().trim();
    filterApplyJob += 1;
    const jobId = filterApplyJob;

    if (!next) {
      setFilterQueryApplied('');
      return;
    }

    deferAfterPaint(() => {
      if (jobId !== filterApplyJob) return;
      setFilterQueryApplied(next);
    });
  });

  // Persist column ratios as a user preference (debounced for drag performance).
  createEffect(() => {
    floe.persist.debouncedSave(LIST_COLUMN_RATIOS_STORAGE_KEY, listColumnRatios());
  });

  // Persist sidebar width as a user preference (debounced for drag performance).
  createEffect(() => {
    floe.persist.debouncedSave(sidebarWidthStorageKey, sidebarWidth());
  });

  // Persist viewMode.
  createEffect(() => {
    if (!shouldPersist) return;
    floe.persist.debouncedSave(getStorageKey(VIEW_MODE_STORAGE_KEY), viewMode());
  });

  // Persist sortConfig.
  createEffect(() => {
    if (!shouldPersist) return;
    floe.persist.debouncedSave(getStorageKey(SORT_CONFIG_STORAGE_KEY), sortConfig());
  });

  // Persist expandedFolders.
  createEffect(() => {
    if (!shouldPersist) return;
    const folders = [...expandedPathList()].sort((a, b) => a.localeCompare(b));
    floe.persist.debouncedSave(getStorageKey(EXPANDED_FOLDERS_STORAGE_KEY), folders);
  });

  // Persist sidebarCollapsed.
  createEffect(() => {
    if (!shouldPersist) return;
    floe.persist.debouncedSave(getStorageKey(SIDEBAR_COLLAPSED_STORAGE_KEY), sidebarCollapsed());
  });

  // Wrap setViewMode and setSortConfig for external usage.
  const setViewMode = (mode: ViewMode) => setViewModeInternal(mode);
  const setSortConfig = (config: SortConfig) => setSortConfigInternal(config);
  const clampSidebarWidth = (widthPx: number) => normalizeSidebarWidthPx(widthPx, sidebarWidth());

  // Home label accessor (reactive)
  const homeLabel = () => props.homeLabel ?? 'Root';

  const selectedItems: Accessor<Set<string>> = () => new Set(selectedIdList());
  const expandedFolders: Accessor<Set<string>> = () => new Set(expandedPathList());

  const replaceSelectedIds = (nextIds: Iterable<string>) => {
    const normalized = normalizeUniqueStrings(nextIds);
    const nextRecord = createFlagRecord(normalized);

    setSelectedById(
      produce((state) => {
        for (const key of Object.keys(state)) {
          if (!(key in nextRecord)) delete state[key];
        }
        for (const key of normalized) {
          state[key] = true;
        }
      })
    );
    setSelectedIdList((prev) => isSameStringList(prev, normalized) ? prev : normalized);
  };

  const ensureExpandedPath = (path: string) => {
    if (expandedByPath[path] === true) return;
    setExpandedByPath(path, true);
    setExpandedPathList((prev) => {
      if (prev.includes(path)) return prev;
      return [...prev, path];
    });
  };

  const toggleExpandedPath = (path: string) => {
    if (expandedByPath[path] === true) {
      setExpandedByPath(
        produce((state) => {
          delete state[path];
        })
      );
      setExpandedPathList((prev) => prev.filter((item) => item !== path));
      return;
    }

    ensureExpandedPath(path);
  };

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

  const sortedState = createMemo(() => {
    const path = normalizePath(currentPath());
    let found = fileIndex().get(path) ?? [];

    // Apply optimistic updates first (before sorting/filtering)
    found = applyOptimisticOps(found, path);

    // Sort files (folders first)
    const config = sortConfig();
    const sorted = [...found].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;

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

    // Cache lowercased names once per sort/path/optimistic change.
    const nameLowerById = new Map<string, string>();
    for (const item of sorted) {
      nameLowerById.set(item.id, item.name.toLowerCase());
    }

    return { items: sorted, nameLowerById };
  });

  const filterState = createMemo(() => {
    const { items: sortedItems, nameLowerById } = sortedState();
    const queryRaw = filterQueryApplied().trim();
    const queryLower = queryRaw.toLowerCase();

    const matchById = new Map<string, FilterMatchInfo>();
    const fileById = new Map<string, FileItem>();
    const indexById = new Map<string, number>();

    // No filter: keep the sorted list as-is.
    if (!queryLower) {
      for (let i = 0; i < sortedItems.length; i++) {
        const item = sortedItems[i]!;
        fileById.set(item.id, item);
        indexById.set(item.id, i);
      }
      return { items: sortedItems, matchById, fileById, indexById };
    }

    const filtered: FileItem[] = [];
    let idx = 0;
    for (const item of sortedItems) {
      const nameLower = nameLowerById.get(item.id) ?? item.name.toLowerCase();
      const indices = fuzzyMatchLower(nameLower, queryLower);
      if (!indices) continue;
      filtered.push(item);
      matchById.set(item.id, { matchedIndices: indices });
      fileById.set(item.id, item);
      indexById.set(item.id, idx);
      idx += 1;
    }

    return { items: filtered, matchById, fileById, indexById };
  });

  // Public accessor required by FileBrowserContextValue
  const currentFiles: Accessor<FileItem[]> = () => filterState().items;

  const getSelectedItemsFromIds = (ids: Iterable<string>): FileItem[] => {
    const state = filterState();
    const out: Array<{ index: number; item: FileItem }> = [];
    for (const id of ids) {
      const item = state.fileById.get(id);
      if (!item) continue;
      const index = state.indexById.get(id);
      out.push({ index: index ?? Number.MAX_SAFE_INTEGER, item });
    }
    out.sort((a, b) => a.index - b.index);
    return out.map((e) => e.item);
  };

  const clearPathScopedUiState = () => {
    // VSCode-style: navigation clears selection to avoid cross-folder stale selection.
    replaceSelectedIds([]);
    // Clear filter when navigating to a different directory.
    setFilterQueryInternal('');
    setFilterQueryApplied('');
    setFilterActive(false);

    const onSelect = props.onSelect;
    deferNonBlocking(() => onSelect?.([]));
  };

  // Controlled-path sync: external path changes should update view state without
  // triggering navigation callbacks (to avoid controlled loops).
  createEffect(() => {
    if (typeof props.path !== 'string') return;
    const nextPath = normalizePath(props.path);
    if (nextPath === currentPath()) return;

    setCurrentPathInternal(nextPath);
    clearPathScopedUiState();
  });

  const setCurrentPath = (path: string) => {
    const nextPath = normalizePath(path);
    if (nextPath === currentPath()) return;
    setCurrentPathInternal(nextPath);
    clearPathScopedUiState();
    const onNavigate = props.onNavigate;
    deferNonBlocking(() => onNavigate?.(nextPath));
    const onPathChange = props.onPathChange;
    deferNonBlocking(() => onPathChange?.(nextPath, 'user'));
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
      ensureExpandedPath(item.path);
    }
  };

  const selectItem = (id: string, multi = false) => {
    const nextSelectedIds = multi
      ? (selectedById[id] === true
          ? selectedIdList().filter((itemId) => itemId !== id)
          : [...selectedIdList(), id])
      : [id];

    if (multi) {
      replaceSelectedIds(nextSelectedIds);
    } else {
      // Single click: always select the item (do not toggle-off).
      replaceSelectedIds(nextSelectedIds);
    }

    // Notify parent after paint to keep selection highlight responsive.
    // Also compute the selected list outside the click handler hot-path.
    const onSelect = props.onSelect;
    if (onSelect) {
      const selectedIdsSnapshot = [...nextSelectedIds];
      deferNonBlocking(() => {
        const selected = untrack(() => getSelectedItemsFromIds(selectedIdsSnapshot));
        onSelect(selected);
      });
    }
  };

  const clearSelection = () => {
    replaceSelectedIds([]);
    const onSelect = props.onSelect;
    deferNonBlocking(() => onSelect?.([]));
  };

  const isSelected = (id: string) => selectedById[id] === true;

  const toggleFolder = (path: string) => toggleExpandedPath(path);

  const isExpanded = (path: string) => expandedByPath[path] === true;

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
    const query = filterQueryApplied().trim();
    if (!query) return null;
    const indices = fuzzyMatchLower(name.toLowerCase(), query.toLowerCase());
    if (!indices) return null;
    return { matchedIndices: indices };
  };

  const getFilterMatchForId = (id: string): FilterMatchInfo | null => {
    return filterState().matchById.get(id) ?? null;
  };

  const getSelectedItemsList = () => getSelectedItemsFromIds(selectedIdList());

  const openItem = (item: FileItem) => {
    if (item.type === 'folder') {
      navigateTo(item);
    } else {
      const onOpen = props.onOpen;
      deferNonBlocking(() => onOpen?.(item));
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
    selectedItems,
    selectItem,
    clearSelection,
    isSelected,
    getSelectedItemsList,
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
    filterQueryApplied,
    isFilterActive,
    setFilterActive,
    getFilterMatch,
    getFilterMatchForId,
    sidebarCollapsed,
    toggleSidebar,
    sidebarWidth,
    clampSidebarWidth,
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
