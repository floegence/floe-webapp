import { createContext, useContext, type JSX, type Accessor, createSignal, createMemo } from 'solid-js';
import type { FileItem, ViewMode, SortConfig, FileBrowserContextValue, ContextMenuEvent } from './types';

const FileBrowserContext = createContext<FileBrowserContextValue>();

export interface FileBrowserProviderProps {
  children: JSX.Element;
  files: FileItem[];
  initialPath?: string;
  initialViewMode?: ViewMode;
  onNavigate?: (path: string) => void;
  onSelect?: (items: FileItem[]) => void;
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

  // Build file tree accessor
  const files: Accessor<FileItem[]> = () => props.files;

  // Get files at current path
  const currentFiles = createMemo(() => {
    const path = currentPath();
    const allFiles = files();

    // Find the folder at the current path
    const findFolder = (items: FileItem[], targetPath: string): FileItem[] | undefined => {
      if (targetPath === '/' || targetPath === '') {
        return items;
      }

      for (const item of items) {
        if (item.type === 'folder') {
          if (item.path === targetPath) {
            return item.children ?? [];
          }
          if (item.children) {
            const found = findFolder(item.children, targetPath);
            if (found) return found;
          }
        }
      }
      return undefined;
    };

    const found = findFolder(allFiles, path) ?? [];

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
    setCurrentPathInternal(path);
    props.onNavigate?.(path);
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
    setSelectedIds((prev) => {
      const next = multi ? new Set(prev) : new Set<string>();
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    // Notify parent
    const selected = currentFiles().filter((f) => selectedIds().has(f.id));
    props.onSelect?.(selected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set<string>());
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
    sidebarCollapsed,
    toggleSidebar,
    contextMenu,
    showContextMenu,
    hideContextMenu,
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
