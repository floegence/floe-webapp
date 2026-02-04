import { createEffect, onCleanup, createSignal, type Accessor } from 'solid-js';
import { lockBodyStyle } from '../utils/bodyStyleLock';
import { useFileBrowserDrag, type DraggedItem } from '../context/FileBrowserDragContext';
import type { FileItem } from '../components/file-browser/types';

/**
 * Options for the useFileBrowserItemDrag hook
 */
export interface UseFileBrowserItemDragOptions {
  /** Instance ID of this FileBrowser */
  instanceId: string;
  /** Get currently selected items */
  getSelectedItems: () => FileItem[];
  /** Current directory path */
  currentPath: Accessor<string>;
  /** Check if an item is selected */
  isSelected: (id: string) => boolean;
  /** Select item on drag start if not already selected */
  selectItem: (id: string, multi: boolean) => void;
  /** Whether drag is enabled */
  enabled?: Accessor<boolean>;
  /** Called when drag starts (for haptic feedback on mobile) */
  onDragStart?: () => void;
}

/**
 * Return value from useFileBrowserItemDrag
 */
export interface FileBrowserItemDragHandlers {
  /** Returns true if currently dragging */
  isDragging: Accessor<boolean>;
  /** Props to spread on draggable items */
  getDragHandlers: (item: FileItem) => {
    onPointerDown: (e: PointerEvent) => void;
    'data-draggable': string;
  };
}

/** Movement threshold in pixels to start drag (desktop) */
const DRAG_THRESHOLD_PX = 5;

/** Long press duration in ms to start drag (mobile) */
const LONG_PRESS_DURATION_MS = 500;

/** Movement threshold in pixels to cancel long press (mobile) */
const LONG_PRESS_CANCEL_THRESHOLD_PX = 10;

/** Auto-scroll threshold in pixels from container edge */
const AUTO_SCROLL_THRESHOLD_PX = 48;

/** Auto-scroll speed in pixels per frame */
const AUTO_SCROLL_SPEED_PX = 24;

/**
 * Hook to add drag behavior to FileBrowser items.
 * Must be used within a FileBrowserDragProvider context.
 */
export function useFileBrowserItemDrag(options: UseFileBrowserItemDragOptions): FileBrowserItemDragHandlers {
  const dragContext = useFileBrowserDrag();
  const [isDragging, setIsDragging] = createSignal(false);

  // Drag state tracking
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let draggedItem: FileItem | null = null;
  let unlockBody: (() => void) | null = null;
  let rafId: number | null = null;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let isLongPressActivated = false;
  let pointerType: string = 'mouse';

  const isEnabled = () => (options.enabled?.() ?? true) && !!dragContext;

  const clearLongPressTimer = () => {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const setGlobalStyles = (active: boolean) => {
    if (!active) {
      unlockBody?.();
      unlockBody = null;
      return;
    }
    unlockBody?.();
    unlockBody = lockBodyStyle({ cursor: 'grabbing', 'user-select': 'none' });
  };

  const stopDragging = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    clearLongPressTimer();
    activePointerId = null;
    draggedItem = null;
    isLongPressActivated = false;
    setGlobalStyles(false);
    setIsDragging(false);
  };

  /**
   * Auto-scroll containers when dragging near edges
   */
  const maybeAutoScroll = () => {
    if (!dragContext) return;
    const instances = dragContext.getInstances();

    for (const [, instance] of instances) {
      // Main scroll container
      const mainContainer = instance.getScrollContainer();
      if (mainContainer) {
        autoScrollElement(mainContainer, lastX, lastY);
      }

      // Sidebar scroll container
      const sidebarContainer = instance.getSidebarScrollContainer();
      if (sidebarContainer) {
        autoScrollElement(sidebarContainer, lastX, lastY);
      }
    }
  };

  const autoScrollElement = (el: HTMLElement, clientX: number, clientY: number) => {
    const rect = el.getBoundingClientRect();

    // Check if pointer is within the element bounds
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return;
    }

    const distTop = clientY - rect.top;
    const distBottom = rect.bottom - clientY;
    const distLeft = clientX - rect.left;
    const distRight = rect.right - clientX;

    let deltaY = 0;
    let deltaX = 0;

    // Vertical auto-scroll
    if (distTop < AUTO_SCROLL_THRESHOLD_PX) {
      deltaY = -Math.ceil(((AUTO_SCROLL_THRESHOLD_PX - distTop) / AUTO_SCROLL_THRESHOLD_PX) * AUTO_SCROLL_SPEED_PX);
    } else if (distBottom < AUTO_SCROLL_THRESHOLD_PX) {
      deltaY = Math.ceil(((AUTO_SCROLL_THRESHOLD_PX - distBottom) / AUTO_SCROLL_THRESHOLD_PX) * AUTO_SCROLL_SPEED_PX);
    }

    // Horizontal auto-scroll
    if (distLeft < AUTO_SCROLL_THRESHOLD_PX) {
      deltaX = -Math.ceil(((AUTO_SCROLL_THRESHOLD_PX - distLeft) / AUTO_SCROLL_THRESHOLD_PX) * AUTO_SCROLL_SPEED_PX);
    } else if (distRight < AUTO_SCROLL_THRESHOLD_PX) {
      deltaX = Math.ceil(((AUTO_SCROLL_THRESHOLD_PX - distRight) / AUTO_SCROLL_THRESHOLD_PX) * AUTO_SCROLL_SPEED_PX);
    }

    if (deltaY !== 0) {
      const nextScrollTop = Math.max(0, Math.min(el.scrollTop + deltaY, el.scrollHeight - el.clientHeight));
      if (nextScrollTop !== el.scrollTop) el.scrollTop = nextScrollTop;
    }

    if (deltaX !== 0) {
      const nextScrollLeft = Math.max(0, Math.min(el.scrollLeft + deltaX, el.scrollWidth - el.clientWidth));
      if (nextScrollLeft !== el.scrollLeft) el.scrollLeft = nextScrollLeft;
    }
  };

  const startTick = () => {
    if (rafId !== null) return;

    const tick = () => {
      if (activePointerId === null || !isDragging()) {
        rafId = null;
        return;
      }
      maybeAutoScroll();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  };

  const initiateActualDrag = () => {
    if (!dragContext || !draggedItem) return;

    // If the item isn't selected, select it
    if (!options.isSelected(draggedItem.id)) {
      options.selectItem(draggedItem.id, false);
    }

    // Get all selected items to drag
    const selectedItems = options.getSelectedItems();
    const itemsToDrag = selectedItems.length > 0 && options.isSelected(draggedItem.id)
      ? selectedItems
      : [draggedItem];

    // Create dragged items with source info
    const draggedItems: DraggedItem[] = itemsToDrag.map((item) => ({
      item,
      sourceInstanceId: options.instanceId,
      sourcePath: options.currentPath(),
    }));

    // Start the drag operation
    setGlobalStyles(true);
    setIsDragging(true);
    dragContext.startDrag(draggedItems, lastX, lastY);
    options.onDragStart?.();
    startTick();
  };

  const handlePointerDown = (e: PointerEvent, item: FileItem) => {
    if (!isEnabled()) return;
    if (activePointerId !== null) return;

    // Only primary button for mouse
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // Store pointer info
    activePointerId = e.pointerId;
    pointerType = e.pointerType;
    startX = e.clientX;
    startY = e.clientY;
    lastX = startX;
    lastY = startY;
    draggedItem = item;
    isLongPressActivated = false;

    // Capture pointer on the target element
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // For touch/pen, use long press to initiate drag
    if (pointerType === 'touch' || pointerType === 'pen') {
      clearLongPressTimer();
      longPressTimer = setTimeout(() => {
        if (activePointerId !== null && draggedItem) {
          isLongPressActivated = true;
          // Trigger haptic feedback if available
          if ('vibrate' in navigator) {
            try { navigator.vibrate(50); } catch { /* ignore */ }
          }
          initiateActualDrag();
        }
      }, LONG_PRESS_DURATION_MS);
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId) return;

    lastX = e.clientX;
    lastY = e.clientY;

    const deltaX = lastX - startX;
    const deltaY = lastY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // For touch/pen, cancel long press if moved too much
    if ((pointerType === 'touch' || pointerType === 'pen') && !isLongPressActivated) {
      if (distance > LONG_PRESS_CANCEL_THRESHOLD_PX) {
        clearLongPressTimer();
        stopDragging();
        return;
      }
    }

    // For mouse, initiate drag after threshold
    if (pointerType === 'mouse' && !isDragging() && distance > DRAG_THRESHOLD_PX) {
      initiateActualDrag();
    }

    // Update drag position if dragging
    if (isDragging() && dragContext) {
      dragContext.updateDrag(lastX, lastY);
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId) return;

    try {
      (e.currentTarget as HTMLElement)?.releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }

    // Commit the drag if we were actually dragging
    if (isDragging() && dragContext) {
      dragContext.endDrag(true);
    }

    stopDragging();
  };

  const handlePointerCancel = (e: PointerEvent) => {
    if (activePointerId !== e.pointerId) return;

    // Cancel the drag without committing
    if (isDragging() && dragContext) {
      dragContext.endDrag(false);
    }

    stopDragging();
  };

  // Setup global pointer event listeners when a drag starts
  createEffect(() => {
    if (!isEnabled()) return;
    if (typeof document === 'undefined') return;

    const onMove = (e: PointerEvent) => handlePointerMove(e);
    const onUp = (e: PointerEvent) => handlePointerUp(e);
    const onCancel = (e: PointerEvent) => handlePointerCancel(e);

    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('pointercancel', onCancel, true);

    onCleanup(() => {
      stopDragging();
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('pointercancel', onCancel, true);
    });
  });

  const getDragHandlers = (item: FileItem) => ({
    onPointerDown: (e: PointerEvent) => handlePointerDown(e, item),
    'data-draggable': 'true',
  });

  return {
    isDragging,
    getDragHandlers,
  };
}

/**
 * Hook to make an element a drop target for file browser drag operations.
 */
export interface UseFileBrowserDropTargetOptions {
  /** Instance ID of this FileBrowser */
  instanceId: string;
  /** The folder item this target represents, or null for current directory root */
  targetItem: Accessor<FileItem | null>;
  /** The target path for dropping */
  targetPath: Accessor<string>;
  /** Whether this drop target is enabled */
  enabled?: Accessor<boolean>;
}

export interface FileBrowserDropTargetResult {
  /** Whether this target is currently being hovered during a drag */
  isDropTarget: Accessor<boolean>;
  /** Whether the current drop is valid */
  isValidDrop: Accessor<boolean>;
  /** Props to spread on the drop target element */
  getDropTargetProps: () => {
    onPointerEnter: (e: PointerEvent) => void;
    onPointerLeave: (e: PointerEvent) => void;
    'data-drop-target': string;
  };
}

/**
 * Hook to make an element a drop target for FileBrowser drag operations.
 */
export function useFileBrowserDropTarget(options: UseFileBrowserDropTargetOptions): FileBrowserDropTargetResult {
  const dragContext = useFileBrowserDrag();
  const [isHovering, setIsHovering] = createSignal(false);

  const isEnabled = () => (options.enabled?.() ?? true) && !!dragContext;

  const isDropTarget = () => {
    if (!isHovering()) return false;
    const state = dragContext?.dragState();
    return state?.isDragging ?? false;
  };

  const isValidDrop = () => {
    if (!isDropTarget() || !dragContext) return false;
    const state = dragContext.dragState();
    if (!state.isDragging) return false;

    return dragContext.canDropOn(
      state.draggedItems,
      options.targetPath(),
      options.targetItem(),
      options.instanceId
    );
  };

  const handlePointerEnter = (e: PointerEvent) => {
    if (!isEnabled() || !dragContext) return;
    const state = dragContext.dragState();
    if (!state.isDragging) return;

    setIsHovering(true);

    const targetPath = options.targetPath();
    const targetItem = options.targetItem();
    const isValid = dragContext.canDropOn(state.draggedItems, targetPath, targetItem, options.instanceId);

    // Get the target element's bounding rect for fly-to animation
    const targetEl = e.currentTarget as HTMLElement;
    const targetRect = targetEl?.getBoundingClientRect() ?? null;

    dragContext.setDropTarget(
      {
        instanceId: options.instanceId,
        targetPath,
        targetItem,
      },
      isValid,
      targetRect
    );
  };

  const handlePointerLeave = (_e: PointerEvent) => {
    if (!dragContext) return;
    setIsHovering(false);

    const state = dragContext.dragState();
    if (state.isDragging && state.dropTarget?.instanceId === options.instanceId) {
      // Only clear if this was the active drop target
      const currentTargetPath = state.dropTarget.targetPath;
      if (currentTargetPath === options.targetPath()) {
        dragContext.setDropTarget(null, false);
      }
    }
  };

  const getDropTargetProps = () => ({
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
    'data-drop-target': 'true',
  });

  return {
    isDropTarget,
    isValidDrop,
    getDropTargetProps,
  };
}
