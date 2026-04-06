// File Browser component exports
export { FileBrowser, type FileBrowserProps } from './FileBrowser';
export { FileBrowserProvider, useFileBrowser, type FileBrowserProviderProps } from './FileBrowserContext';
export { DirectoryTree, type DirectoryTreeProps } from './DirectoryTree';
export { FileListView, type FileListViewProps } from './FileListView';
export { FileGridView, type FileGridViewProps } from './FileGridView';
export { FileContextMenu, type FileContextMenuProps, type BuiltinContextMenuAction, type HideItemsValue } from './FileContextMenu';
export { Breadcrumb, type BreadcrumbProps } from './Breadcrumb';
export { FileBrowserToolbar, type FileBrowserToolbarProps } from './FileBrowserToolbar';
export { FileBrowserDragPreview } from './DragPreview';
export {
  FolderIcon,
  FolderOpenIcon,
  SymlinkFolderIcon,
  SymlinkFolderOpenIcon,
  FileIcon,
  SymlinkFileIcon,
  BrokenSymlinkIcon,
  CodeFileIcon,
  JavaScriptFileIcon,
  TypeScriptFileIcon,
  ShellScriptFileIcon,
  ImageFileIcon,
  DocumentFileIcon,
  ConfigFileIcon,
  StyleFileIcon,
  FileItemIcon,
  getFileIcon,
  resolveFileItemIcon,
} from './FileIcons';
export type {
  FileItem,
  FileItemIconOverride,
  FileItemLinkKind,
  FileItemLinkTargetType,
  FileItemLinkMeta,
  FileBrowserRevealClearFilter,
  FileBrowserRevealRequest,
  ViewMode,
  SortField,
  SortDirection,
  SortConfig,
  FileListColumnRatios,
  FileBrowserContextValue,
  ContextMenuActionType,
  ContextMenuTargetKind,
  ContextMenuSource,
  ContextMenuDirectory,
  ContextMenuItem,
  ContextMenuEvent,
  ContextMenuCallbacks,
  OptimisticUpdateType,
  OptimisticRemove,
  OptimisticUpdate,
  OptimisticInsert,
  OptimisticOperation,
  ReplaceSelectionOptions,
  ScrollPosition,
} from './types';
