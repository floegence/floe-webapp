import { Show, type JSX, createEffect, createSignal, onMount, onCleanup } from 'solid-js';
import { cn } from '../../utils/cn';
import { useLayout } from '../../context/LayoutContext';
import { useFileBrowserDrag, type FileBrowserDragInstance } from '../../context/FileBrowserDragContext';
import { deferAfterPaint } from '../../utils/defer';
import { FileBrowserProvider, useFileBrowser } from './FileBrowserContext';
import { SidebarPane } from '../layout/SidebarPane';
import { DirectoryTree } from './DirectoryTree';
import { FileListView } from './FileListView';
import { FileGridView } from './FileGridView';
import { FileBrowserToolbar } from './FileBrowserToolbar';
import { FileContextMenu, type FileContextMenuProps } from './FileContextMenu';
import { FileBrowserDragPreview } from './DragPreview';
import type { FileItem, ViewMode, ContextMenuCallbacks, ContextMenuItem, FileListColumnRatios } from './types';

export interface FileBrowserProps {
  /** File tree data */
  files: FileItem[];
  /**
   * Controlled current path.
   * When provided, the browser path follows this value and user navigation is emitted via onPathChange.
   */
  path?: string;
  /** Initial path to display */
  initialPath?: string;
  /** Initial view mode */
  initialViewMode?: ViewMode;
  /** Initial list view column ratios (for resizable columns) */
  initialListColumnRatios?: FileListColumnRatios;
  /** Callback when navigation occurs */
  onNavigate?: (path: string) => void;
  /**
   * Callback when the user changes path from inside FileBrowser.
   * Use with `path` for controlled mode.
   */
  onPathChange?: (path: string, source: 'user' | 'programmatic') => void;
  /** Callback when selection changes */
  onSelect?: (items: FileItem[]) => void;
  /** Callback when a file is opened */
  onOpen?: (item: FileItem) => void;
  /** Additional class names */
  class?: string;
  /** Custom header content */
  header?: JSX.Element;
  /** Actions rendered on the right side of the Explorer sidebar header */
  sidebarHeaderActions?: JSX.Element;
  /** Actions rendered at the end of the main file browser toolbar */
  toolbarEndActions?: JSX.Element;
  /** Sidebar width in pixels */
  sidebarWidth?: number;
  /** Persisted sidebar width storage key (defaults to a shared user preference key) */
  sidebarWidthStorageKey?: string;
  /** Whether the sidebar is resizable (desktop only) */
  sidebarResizable?: boolean;
  /** Hide sidebar on mobile by default */
  hideSidebarOnMobile?: boolean;
  /**
   * Persistence key prefix for storing UI state (viewMode, sortConfig, expandedFolders, sidebarCollapsed).
   * When set, these states will be persisted to localStorage.
   * Each instance should use a unique key to avoid conflicts.
   */
  persistenceKey?: string;
  /** Label for the root/home directory in breadcrumb (default: 'Root') */
  homeLabel?: string;
  /** Context menu callbacks for built-in actions */
  contextMenuCallbacks?: ContextMenuCallbacks;
  /** Custom context menu items to add */
  customContextMenuItems?: ContextMenuItem[];
  /** Override default context menu items completely */
  overrideContextMenuItems?: ContextMenuItem[];
  /** Default context menu items to hide */
  hideContextMenuItems?: FileContextMenuProps['hideItems'];
  /** Unique instance identifier for cross-browser drag operations */
  instanceId?: string;
  /** Whether drag and drop is enabled (default: true) */
  enableDragDrop?: boolean;
  /** Callback when items are moved via drag and drop */
  onDragMove?: (items: FileItem[], targetPath: string, sourceInstanceId: string) => void;
}

/**
 * Professional file browser component with list/grid views and directory tree sidebar
 */
export function FileBrowser(props: FileBrowserProps) {
  return (
    <FileBrowserProvider
      files={props.files}
      path={props.path}
      initialPath={props.initialPath}
      initialViewMode={props.initialViewMode}
      initialListColumnRatios={props.initialListColumnRatios}
      initialSidebarWidth={props.sidebarWidth}
      sidebarWidthStorageKey={props.sidebarWidthStorageKey}
      persistenceKey={props.persistenceKey}
      homeLabel={props.homeLabel}
      onNavigate={props.onNavigate}
      onPathChange={props.onPathChange}
      onSelect={props.onSelect}
      onOpen={props.onOpen}
    >
      <FileBrowserInner
        class={props.class}
        header={props.header}
        sidebarHeaderActions={props.sidebarHeaderActions}
        toolbarEndActions={props.toolbarEndActions}
        sidebarResizable={props.sidebarResizable}
        hideSidebarOnMobile={props.hideSidebarOnMobile}
        contextMenuCallbacks={props.contextMenuCallbacks}
        customContextMenuItems={props.customContextMenuItems}
        overrideContextMenuItems={props.overrideContextMenuItems}
        hideContextMenuItems={props.hideContextMenuItems}
        instanceId={props.instanceId}
        enableDragDrop={props.enableDragDrop}
        onDragMove={props.onDragMove}
      />
    </FileBrowserProvider>
  );
}

interface FileBrowserInnerProps {
  class?: string;
  header?: JSX.Element;
  sidebarHeaderActions?: JSX.Element;
  toolbarEndActions?: JSX.Element;
  sidebarResizable?: boolean;
  hideSidebarOnMobile?: boolean;
  contextMenuCallbacks?: ContextMenuCallbacks;
  customContextMenuItems?: ContextMenuItem[];
  overrideContextMenuItems?: ContextMenuItem[];
  hideContextMenuItems?: FileContextMenuProps['hideItems'];
  instanceId?: string;
  enableDragDrop?: boolean;
  onDragMove?: (items: FileItem[], targetPath: string, sourceInstanceId: string) => void;
}

function FileBrowserInner(props: FileBrowserInnerProps) {
  const ctx = useFileBrowser();
  const layout = useLayout();
  const dragContext = useFileBrowserDrag();
  const isMobile = () => layout.isMobile();
  const [sidebarPreviewWidth, setSidebarPreviewWidth] = createSignal<number | null>(null);
  const sidebarWidth = () => sidebarPreviewWidth() ?? ctx.sidebarWidth();
  const sidebarResizable = () => props.sidebarResizable ?? true;
  const isDragEnabled = () => (props.enableDragDrop ?? true) && !!dragContext;
  const instanceId = () => props.instanceId ?? `filebrowser-${Math.random().toString(36).slice(2, 9)}`;
  let filterInputRef: HTMLInputElement | undefined;
  let mainScrollContainerRef: HTMLElement | null = null;
  let sidebarScrollContainerRef: HTMLElement | null = null;

  // Register this instance with the drag context
  onMount(() => {
    if (!dragContext || !isDragEnabled()) return;

    const instance: FileBrowserDragInstance = {
      instanceId: instanceId(),
      currentPath: ctx.currentPath,
      files: ctx.files,
      onDragMove: props.onDragMove,
      getScrollContainer: () => mainScrollContainerRef,
      getSidebarScrollContainer: () => sidebarScrollContainerRef,
      optimisticRemove: ctx.optimisticRemove,
      optimisticInsert: ctx.optimisticInsert,
    };

    dragContext.registerInstance(instance);
  });

  onCleanup(() => {
    if (dragContext && isDragEnabled()) {
      dragContext.unregisterInstance(instanceId());
    }
  });

  // Auto-collapse sidebar only when entering mobile mode (and on initial mount if already mobile).
  let didInitMobile = false;
  let prevMobile = false;
  createEffect(() => {
    const mobile = isMobile();

    if (!didInitMobile) {
      didInitMobile = true;
      prevMobile = mobile;
      if (mobile && props.hideSidebarOnMobile !== false && !ctx.sidebarCollapsed()) {
        ctx.toggleSidebar();
      }
      return;
    }

    if (!prevMobile && mobile && props.hideSidebarOnMobile !== false && !ctx.sidebarCollapsed()) {
      ctx.toggleSidebar();
    }

    prevMobile = mobile;
  });

  // Keyboard shortcut for filter (Ctrl/Cmd + F) – scoped to this FileBrowser instance.
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key.toLowerCase() !== 'f') return;
    e.preventDefault();
    ctx.setFilterActive(true);
    deferAfterPaint(() => filterInputRef?.focus());
  };

  const showSidebar = () => !ctx.sidebarCollapsed() || !isMobile();
  const beginSidebarResize = () => {
    setSidebarPreviewWidth(ctx.sidebarWidth());
  };

  const updateSidebarPreviewWidth = (delta: number) => {
    setSidebarPreviewWidth((prev) => ctx.clampSidebarWidth((prev ?? ctx.sidebarWidth()) + delta));
  };

  const commitSidebarResize = () => {
    const preview = sidebarPreviewWidth();
    if (preview !== null) {
      ctx.setSidebarWidth(preview);
      setSidebarPreviewWidth(null);
    }
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      class={cn(
        'flex flex-col h-full min-h-0 bg-background',
        'border border-border rounded-lg overflow-hidden',
        'shadow-sm',
        props.class
      )}
    >
      {/* Optional header */}
      <Show when={props.header}>
        <div class="border-b border-border">{props.header}</div>
      </Show>

      {/* Main content area */}
      <div class="flex flex-1 min-h-0 relative">
        {/* Sidebar with directory tree */}
        <SidebarPane
          title="Explorer"
          width={sidebarWidth()}
          open={showSidebar()}
          headerActions={props.sidebarHeaderActions}
          resizable={sidebarResizable()}
          onResize={updateSidebarPreviewWidth}
          onClose={ctx.toggleSidebar}
          onResizeStart={beginSidebarResize}
          onResizeEnd={commitSidebarResize}
          bodyRef={(el) => { sidebarScrollContainerRef = el; }}
          bodyClass="py-1"
        >
          <DirectoryTree
            instanceId={instanceId()}
            enableDragDrop={isDragEnabled()}
          />
        </SidebarPane>

        {/* Main file view area */}
        <div class="flex-1 min-w-0 flex flex-col">
          {/* Toolbar */}
          <FileBrowserToolbar
            filterInputRef={(el) => (filterInputRef = el)}
            endActions={props.toolbarEndActions}
          />

          {/* File view (list or grid) */}
          <div
            ref={(el) => { mainScrollContainerRef = el; }}
            class="flex-1 min-h-0"
          >
            <Show
              when={ctx.viewMode() === 'list'}
              fallback={
                <FileGridView
                  instanceId={instanceId()}
                  enableDragDrop={isDragEnabled()}
                />
              }
            >
              <FileListView
                instanceId={instanceId()}
                enableDragDrop={isDragEnabled()}
              />
            </Show>
          </div>

          {/* Status bar */}
          <div class="flex items-center justify-between px-3 py-1 border-t border-border text-[10px] text-muted-foreground">
            <span>
              {ctx.currentFiles().length} items
              <Show when={ctx.filterQueryApplied().trim()}>
                {' '}(filtered)
              </Show>
              <Show when={ctx.selectedItems().size > 0}>
                {' · '}{ctx.selectedItems().size} selected
              </Show>
            </span>
            <span class="truncate max-w-[200px]">{ctx.currentPath()}</span>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <FileContextMenu
        callbacks={props.contextMenuCallbacks}
        customItems={props.customContextMenuItems}
        overrideItems={props.overrideContextMenuItems}
        hideItems={props.hideContextMenuItems}
      />

      {/* Drag Preview */}
      <Show when={isDragEnabled()}>
        <FileBrowserDragPreview />
      </Show>
    </div>
  );
}
