import { createContext, useContext, type JSX, type Accessor, createSignal, onCleanup } from 'solid-js';
import type { FileItem } from '../components/file-browser/types';
import { lockBodyStyle } from '../utils/bodyStyleLock';

/**
 * Represents an item being dragged
 */
export interface DraggedItem {
  item: FileItem;
  sourceInstanceId: string;
  sourcePath: string;
}

/**
 * Current drop target information
 */
export interface DropTarget {
  instanceId: string;
  targetPath: string;
  /** The target folder item, or null if dropping into current directory root */
  targetItem: FileItem | null;
}

/**
 * Animation target position for drag end animation
 */
export interface DragEndAnimationTarget {
  x: number;
  y: number;
}

/**
 * Global drag state for FileBrowser instances
 */
export interface FileBrowserDragState {
  isDragging: boolean;
  draggedItems: DraggedItem[];
  sourceInstanceId: string | null;
  pointerPosition: { x: number; y: number };
  dropTarget: DropTarget | null;
  /** Whether the current drop target is valid */
  isValidDrop: boolean;
  /** Whether the drag is ending (playing exit animation) */
  isDragEnding: boolean;
  /** Target position for fly-to animation when drop is committed */
  endAnimationTarget: DragEndAnimationTarget | null;
  /** Whether the drop was committed (successful drop vs cancel) */
  isDropCommitted: boolean;
  /** Current drop target element rect for animation targeting */
  dropTargetRect: DOMRect | null;
}

/**
 * A registered FileBrowser instance that can participate in drag operations
 */
export interface FileBrowserDragInstance {
  instanceId: string;
  currentPath: Accessor<string>;
  files: Accessor<FileItem[]>;
  /** Called when items are dropped onto this instance */
  onDragMove: ((items: FileItem[], targetPath: string, sourceInstanceId: string) => void) | undefined;
  /** Get the scrollable container element for auto-scroll */
  getScrollContainer: () => HTMLElement | null;
  /** Get the sidebar scroll container for auto-scroll */
  getSidebarScrollContainer: () => HTMLElement | null;
  /** Optimistically remove items from display */
  optimisticRemove: (paths: string[]) => void;
  /** Optimistically insert an item */
  optimisticInsert: (parentPath: string, item: FileItem) => void;
}

/**
 * Context value for FileBrowser drag operations
 */
export interface FileBrowserDragContextValue {
  // Drag state
  dragState: Accessor<FileBrowserDragState>;

  // Instance registration
  registerInstance: (instance: FileBrowserDragInstance) => void;
  unregisterInstance: (instanceId: string) => void;
  getInstance: (instanceId: string) => FileBrowserDragInstance | undefined;
  getInstances: () => Map<string, FileBrowserDragInstance>;

  // Drag operations
  startDrag: (items: DraggedItem[], x: number, y: number) => void;
  updateDrag: (x: number, y: number) => void;
  setDropTarget: (target: DropTarget | null, isValid: boolean, targetRect?: DOMRect | null) => void;
  endDrag: (commit: boolean) => void;

  // Validation helpers
  canDropOn: (draggedItems: DraggedItem[], targetPath: string, targetItem: FileItem | null, targetInstanceId: string) => boolean;
}

const FileBrowserDragContext = createContext<FileBrowserDragContextValue>();

const initialDragState: FileBrowserDragState = {
  isDragging: false,
  draggedItems: [],
  sourceInstanceId: null,
  pointerPosition: { x: 0, y: 0 },
  dropTarget: null,
  isValidDrop: false,
  isDragEnding: false,
  endAnimationTarget: null,
  isDropCommitted: false,
  dropTargetRect: null,
};

/**
 * Duration of the drag end animation in milliseconds
 */
const DRAG_END_ANIMATION_DURATION_MS = 200;

/**
 * Get parent path from a given path
 */
function getParentPath(path: string): string {
  const normalized = path.trim() || '/';
  if (normalized === '/') return '/';
  const parts = normalized.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? '/' + parts.join('/') : '/';
}

export interface FileBrowserDragProviderProps {
  children: JSX.Element;
}

/**
 * Provider for global FileBrowser drag state management.
 * Should be mounted at the application/Deck level to enable cross-component dragging.
 */
export function FileBrowserDragProvider(props: FileBrowserDragProviderProps) {
  const [dragState, setDragState] = createSignal<FileBrowserDragState>(initialDragState);
  const instances = new Map<string, FileBrowserDragInstance>();
  let unlockBody: (() => void) | null = null;

  const registerInstance = (instance: FileBrowserDragInstance) => {
    instances.set(instance.instanceId, instance);
  };

  const unregisterInstance = (instanceId: string) => {
    instances.delete(instanceId);
  };

  const getInstance = (instanceId: string) => instances.get(instanceId);

  const getInstances = () => instances;

  const startDrag = (items: DraggedItem[], x: number, y: number) => {
    if (items.length === 0) return;

    // Lock body styles for visual feedback
    unlockBody?.();
    unlockBody = lockBodyStyle({ cursor: 'grabbing', 'user-select': 'none' });

    setDragState({
      isDragging: true,
      draggedItems: items,
      sourceInstanceId: items[0].sourceInstanceId,
      pointerPosition: { x, y },
      dropTarget: null,
      isValidDrop: false,
      isDragEnding: false,
      endAnimationTarget: null,
      isDropCommitted: false,
      dropTargetRect: null,
    });
  };

  const updateDrag = (x: number, y: number) => {
    setDragState((prev) => ({
      ...prev,
      pointerPosition: { x, y },
    }));
  };

  const setDropTarget = (target: DropTarget | null, isValid: boolean, targetRect?: DOMRect | null) => {
    setDragState((prev) => ({
      ...prev,
      dropTarget: target,
      isValidDrop: isValid,
      dropTargetRect: targetRect ?? null,
    }));
  };

  const canDropOn = (
    draggedItems: DraggedItem[],
    targetPath: string,
    targetItem: FileItem | null,
    targetInstanceId: string
  ): boolean => {
    if (draggedItems.length === 0) return false;

    // Cannot drop onto a file (only folders)
    if (targetItem && targetItem.type === 'file') return false;

    // Check each dragged item
    for (const dragged of draggedItems) {
      const itemPath = dragged.item.path;
      const itemParentPath = getParentPath(itemPath);

      // Cannot drop folder into itself or its subdirectories
      if (dragged.item.type === 'folder') {
        const normalizedTarget = targetPath.trim() || '/';
        const normalizedItem = itemPath.trim() || '/';

        // Exact match - cannot drop into self
        if (normalizedTarget === normalizedItem) return false;

        // Target is a subdirectory of the dragged folder
        if (normalizedTarget.startsWith(normalizedItem + '/')) return false;
      }

      // Cannot drop into the same parent directory (from the same instance)
      if (dragged.sourceInstanceId === targetInstanceId) {
        if (itemParentPath === targetPath) return false;
      }
    }

    return true;
  };

  const endDrag = (commit: boolean) => {
    const state = dragState();
    if (!state.isDragging) return;

    // Release body style lock
    unlockBody?.();
    unlockBody = null;

    const shouldCommit = !!(commit && state.dropTarget && state.isValidDrop);

    // Calculate animation target position if committing to a valid drop target
    let animationTarget: DragEndAnimationTarget | null = null;
    if (shouldCommit && state.dropTargetRect) {
      // Target the center of the drop target element
      animationTarget = {
        x: state.dropTargetRect.left + state.dropTargetRect.width / 2 - 75, // 75 = half of preview min-width
        y: state.dropTargetRect.top + state.dropTargetRect.height / 2 - 30, // 30 = approximate half height
      };
    }

    // Start exit animation phase
    setDragState((prev) => ({
      ...prev,
      isDragEnding: true,
      isDropCommitted: shouldCommit,
      endAnimationTarget: animationTarget,
    }));

    // Execute move operations immediately (optimistic UI updates)
    if (shouldCommit) {
      const { draggedItems, sourceInstanceId } = state;
      const { targetPath, instanceId: targetInstanceId } = state.dropTarget!;

      const sourceInstance = sourceInstanceId ? instances.get(sourceInstanceId) : undefined;
      const targetInstance = instances.get(targetInstanceId);

      if (targetInstance?.onDragMove) {
        // Get the file items
        const items = draggedItems.map((d) => d.item);
        const paths = draggedItems.map((d) => d.item.path);

        // Optimistic UI updates
        // Remove from source
        sourceInstance?.optimisticRemove(paths);

        // Insert into target (create shallow copies with updated paths)
        for (const item of items) {
          const newPath = targetPath === '/'
            ? '/' + item.name
            : targetPath + '/' + item.name;
          const movedItem: FileItem = {
            ...item,
            path: newPath,
          };
          targetInstance.optimisticInsert(targetPath, movedItem);
        }

        // Execute the actual move callback (deferred to allow UI to update first)
        setTimeout(() => {
          targetInstance.onDragMove!(items, targetPath, sourceInstanceId || '');
        }, 0);
      }
    }

    // Reset state after animation completes
    setTimeout(() => {
      setDragState(initialDragState);
    }, DRAG_END_ANIMATION_DURATION_MS);
  };

  // Cleanup on unmount
  onCleanup(() => {
    unlockBody?.();
    unlockBody = null;
    instances.clear();
  });

  const contextValue: FileBrowserDragContextValue = {
    dragState,
    registerInstance,
    unregisterInstance,
    getInstance,
    getInstances,
    startDrag,
    updateDrag,
    setDropTarget,
    endDrag,
    canDropOn,
  };

  return (
    <FileBrowserDragContext.Provider value={contextValue}>
      {props.children}
    </FileBrowserDragContext.Provider>
  );
}

/**
 * Hook to access FileBrowser drag context.
 * Returns undefined if used outside of FileBrowserDragProvider.
 */
export function useFileBrowserDrag(): FileBrowserDragContextValue | undefined {
  return useContext(FileBrowserDragContext);
}

/**
 * Hook to check if FileBrowser drag context is available
 */
export function hasFileBrowserDragContext(): boolean {
  return useContext(FileBrowserDragContext) !== undefined;
}
