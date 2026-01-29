import type { JSX, Accessor } from 'solid-js';

/**
 * Represents a file or folder item in the browser
 */
export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  modifiedAt?: Date;
  extension?: string;
  children?: FileItem[];
  icon?: JSX.Element;
}

/**
 * View mode for the file browser main content area
 */
export type ViewMode = 'list' | 'grid';

/**
 * Sort options for file list
 */
export type SortField = 'name' | 'size' | 'modifiedAt' | 'type';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

/**
 * List view column width ratios (sum to ~1.0).
 * Used for user-adjustable column resizing and persistence.
 */
export interface FileListColumnRatios {
  name: number;
  modifiedAt: number;
  size: number;
}

/**
 * Built-in context menu action types
 */
export type ContextMenuActionType =
  | 'duplicate'
  | 'ask-agent'
  | 'copy-to'
  | 'move-to'
  | 'delete'
  | 'rename'
  | 'custom';

/**
 * Context menu item definition
 */
export interface ContextMenuItem {
  /** Unique identifier for the action */
  id: string;
  /** Display label */
  label: string;
  /** Action type - use 'custom' for user-defined actions */
  type: ContextMenuActionType;
  /** Optional icon component */
  icon?: (props: { class?: string }) => JSX.Element;
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Whether to show a separator after this item */
  separator?: boolean;
  /** Keyboard shortcut hint (display only) */
  shortcut?: string;
  /** Custom handler for 'custom' type actions */
  onAction?: (items: FileItem[]) => void;
}

/**
 * Context menu event with position and target items
 */
export interface ContextMenuEvent {
  /** X position for the menu */
  x: number;
  /** Y position for the menu */
  y: number;
  /** Target file/folder items */
  items: FileItem[];
}

/**
 * Callbacks for context menu actions
 */
export interface ContextMenuCallbacks {
  onDuplicate?: (items: FileItem[]) => void;
  onAskAgent?: (items: FileItem[]) => void;
  onCopyTo?: (items: FileItem[]) => void;
  onMoveTo?: (items: FileItem[]) => void;
  onDelete?: (items: FileItem[]) => void;
  onRename?: (item: FileItem) => void;
}

/**
 * Filter match info for highlighting
 */
export interface FilterMatchInfo {
  /** Matched character indices in the name */
  matchedIndices: number[];
}

/**
 * Optimistic update operation types
 */
export type OptimisticUpdateType = 'remove' | 'update' | 'insert';

/**
 * Optimistic remove operation
 */
export interface OptimisticRemove {
  type: 'remove';
  /** Paths to remove */
  paths: string[];
}

/**
 * Optimistic update operation (rename/move)
 */
export interface OptimisticUpdate {
  type: 'update';
  /** Original path */
  oldPath: string;
  /** Updated item data */
  updates: Partial<FileItem>;
}

/**
 * Optimistic insert operation (duplicate/copy/new)
 */
export interface OptimisticInsert {
  type: 'insert';
  /** Parent folder path where item will be inserted */
  parentPath: string;
  /** Item to insert */
  item: FileItem;
}

/**
 * Union type for all optimistic operations
 */
export type OptimisticOperation = OptimisticRemove | OptimisticUpdate | OptimisticInsert;

/**
 * Scroll position state
 */
export interface ScrollPosition {
  top: number;
  left: number;
}

/**
 * File browser context value for internal state management
 */
export interface FileBrowserContextValue {
  // Current path and navigation
  currentPath: Accessor<string>;
  setCurrentPath: (path: string) => void;
  navigateUp: () => void;
  navigateTo: (item: FileItem) => void;

  // Home/root label for display (e.g., "Home", "~", default: "Root")
  homeLabel: Accessor<string>;

  // Selection
  selectedItems: Accessor<Set<string>>;
  selectItem: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;

  // View mode
  viewMode: Accessor<ViewMode>;
  setViewMode: (mode: ViewMode) => void;

  // Sorting
  sortConfig: Accessor<SortConfig>;
  setSortConfig: (config: SortConfig) => void;

  // List view column layout (user-adjustable)
  listColumnRatios: Accessor<FileListColumnRatios>;
  setListColumnRatios: (ratios: FileListColumnRatios) => void;

  // Tree state
  expandedFolders: Accessor<Set<string>>;
  toggleFolder: (path: string) => void;
  isExpanded: (path: string) => boolean;

  // Files
  files: Accessor<FileItem[]>;
  currentFiles: Accessor<FileItem[]>;

  // Filter
  filterQuery: Accessor<string>;
  setFilterQuery: (query: string) => void;
  isFilterActive: Accessor<boolean>;
  setFilterActive: (active: boolean) => void;
  getFilterMatch: (name: string) => FilterMatchInfo | null;

  // Sidebar
  sidebarCollapsed: Accessor<boolean>;
  toggleSidebar: () => void;

  // Context menu
  contextMenu: Accessor<ContextMenuEvent | null>;
  showContextMenu: (event: ContextMenuEvent) => void;
  hideContextMenu: () => void;

  // Open file
  openItem: (item: FileItem) => void;

  // Optimistic updates - allow immediate UI feedback before server confirmation
  /**
   * Optimistically remove items from the file list.
   * Call this before the actual delete operation for instant UI feedback.
   * @param paths - Array of file/folder paths to remove
   */
  optimisticRemove: (paths: string[]) => void;

  /**
   * Optimistically update an item (rename/move).
   * Call this before the actual operation for instant UI feedback.
   * @param oldPath - Original path of the item
   * @param updates - Partial updates to apply (name, path, etc.)
   */
  optimisticUpdate: (oldPath: string, updates: Partial<FileItem>) => void;

  /**
   * Optimistically insert a new item (duplicate/copy/create).
   * Call this before the actual operation for instant UI feedback.
   * @param parentPath - Parent folder path
   * @param item - The new item to insert
   */
  optimisticInsert: (parentPath: string, item: FileItem) => void;

  /**
   * Clear all pending optimistic updates.
   * Call this after successful server confirmation to sync with real data.
   */
  clearOptimisticUpdates: () => void;

  /**
   * Rollback all optimistic updates and restore original state.
   * Call this when an operation fails to revert the UI.
   */
  rollbackOptimisticUpdates: () => void;

  /**
   * Check if there are pending optimistic updates.
   */
  hasOptimisticUpdates: Accessor<boolean>;

  // Scroll position management - preserve scroll position across operations
  /**
   * Register a scroll container element for position tracking.
   * Pass this as a ref callback to your scrollable container.
   */
  setScrollContainer: (el: HTMLElement | null) => void;

  /**
   * Get the current scroll position of the registered container.
   */
  getScrollPosition: () => ScrollPosition;

  /**
   * Set the scroll position of the registered container.
   * Useful for restoring position after data refresh.
   */
  setScrollPosition: (position: ScrollPosition) => void;

  /**
   * Save current scroll position and return it.
   * Convenience method that combines get + internal save.
   */
  saveScrollPosition: () => ScrollPosition;

  /**
   * Restore the last saved scroll position.
   * Call this after an operation completes to maintain user's view.
   */
  restoreScrollPosition: () => void;
}
