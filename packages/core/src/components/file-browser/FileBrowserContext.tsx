import { createContext, useContext, type JSX, type Accessor, createSignal, createMemo } from 'solid-js';
import { deferNonBlocking } from '../../utils/defer';
import type { FileItem, ViewMode, SortConfig, FileBrowserContextValue, ContextMenuEvent, FilterMatchInfo } from './types';

const FileBrowserContext = createContext<FileBrowserContextValue>();

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
  onNavigate?: (path: string) => void;
  onSelect?: (items: FileItem[]) => void;
  onOpen?: (item: FileItem) => void;
}

/**
 * Provider for file browser state management
 */
export function FileBrowserProvider(props: FileBrowserProviderProps) {
  const [currentPath, setCurrentPathInternal] = createSignal(props.initialPath ?? '/');
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [viewMode, setViewMode] = createSignal<ViewMode>(props.initialViewMode ?? 'list');
  const [sortConfig, setSortConfig] = createSignal<SortConfig>({ field: 'name', direction: 'asc' });
  const [expandedFolders, setExpandedFolders] = createSignal<Set<string>>(new Set(['/']));
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
  const [contextMenu, setContextMenu] = createSignal<ContextMenuEvent | null>(null);
  const [filterQuery, setFilterQueryInternal] = createSignal('');
  const [isFilterActive, setFilterActive] = createSignal(false);

  // Build file tree accessor
  const files: Accessor<FileItem[]> = () => props.files;

  const normalizePath = (path: string) => {
    const p = (path ?? '').trim();
    return p === '' ? '/' : p;
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
    const selected = currentFiles().filter((f) => next.has(f.id));
    const onSelect = props.onSelect;
    deferNonBlocking(() => onSelect?.(selected));
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

  const contextValue: FileBrowserContextValue = {
    currentPath,
    setCurrentPath,
    navigateUp,
    navigateTo,
    selectedItems: () => selectedIds(),
    selectItem,
    clearSelection,
    isSelected,
    viewMode,
    setViewMode,
    sortConfig,
    setSortConfig,
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
    contextMenu,
    showContextMenu,
    hideContextMenu,
    openItem,
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
