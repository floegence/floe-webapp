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
 * File browser context value for internal state management
 */
export interface FileBrowserContextValue {
  // Current path and navigation
  currentPath: Accessor<string>;
  setCurrentPath: (path: string) => void;
  navigateUp: () => void;
  navigateTo: (item: FileItem) => void;

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
}
