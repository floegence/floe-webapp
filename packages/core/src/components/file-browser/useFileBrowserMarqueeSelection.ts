import { createMemo, createSignal, onCleanup, type Accessor } from 'solid-js';
import type { ReplaceSelectionOptions } from './types';
import { isPrimaryModKeyPressed } from '../../utils/keybind';

type ViewportRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export interface FileBrowserMarqueeSelectionOptions {
  getContainer: () => HTMLElement | null;
  getVisibleItemIdsInOrder: () => string[];
  getElementForId: (id: string) => HTMLElement | null | undefined;
  getSelectedIds: () => string[];
  replaceSelection: (ids: string[], options?: ReplaceSelectionOptions) => void;
  clearSelection: () => void;
}

export interface FileBrowserMarqueeSelectionResult {
  overlayStyle: Accessor<Record<string, string> | null>;
  onPointerDown: (event: PointerEvent) => void;
}

const MARQUEE_DRAG_THRESHOLD_PX = 4;

export const FILE_BROWSER_MARQUEE_OVERLAY_CLASS = 'pointer-events-none fixed z-40 rounded-md floe-file-browser-marquee-overlay';

function normalizeViewportRect(startX: number, startY: number, endX: number, endY: number): ViewportRect {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  return {
    left,
    top,
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
}

function rectsIntersect(a: ViewportRect, b: DOMRect): boolean {
  return !(
    a.left + a.width < b.left
    || b.right < a.left
    || a.top + a.height < b.top
    || b.bottom < a.top
  );
}

function isMarqueeBackgroundTarget(target: EventTarget | null): target is Element {
  if (!(target instanceof Element)) return false;
  if (target.closest('[data-file-browser-item-id]')) return false;
  if (target.closest('button, input, textarea, select, a, [role="button"], [role="menuitem"]')) return false;
  return true;
}

export function createFileBrowserMarqueeSelection(
  options: FileBrowserMarqueeSelectionOptions,
): FileBrowserMarqueeSelectionResult {
  const [overlayRect, setOverlayRect] = createSignal<ViewportRect | null>(null);
  let activePointerId: number | null = null;
  let additiveSelection = false;
  let baselineSelectedIds: string[] = [];
  let startX = 0;
  let startY = 0;
  let isDragging = false;

  const removeGlobalListeners = () => {
    if (typeof document === 'undefined') return;
    document.removeEventListener('pointermove', handleGlobalPointerMove, true);
    document.removeEventListener('pointerup', handleGlobalPointerUp, true);
    document.removeEventListener('pointercancel', handleGlobalPointerCancel, true);
  };

  const resetGesture = () => {
    removeGlobalListeners();
    activePointerId = null;
    additiveSelection = false;
    baselineSelectedIds = [];
    startX = 0;
    startY = 0;
    isDragging = false;
    setOverlayRect(null);
  };

  const updateSelectionFromRect = (rect: ViewportRect) => {
    const hitIds = options.getVisibleItemIdsInOrder().filter((id) => {
      const element = options.getElementForId(id);
      if (!element) return false;
      return rectsIntersect(rect, element.getBoundingClientRect());
    });

    const nextSelectedIds = additiveSelection
      ? [...baselineSelectedIds, ...hitIds]
      : hitIds;

    options.replaceSelection(nextSelectedIds, {
      anchorId: additiveSelection ? undefined : (nextSelectedIds[0] ?? null),
      lastInteractedId: nextSelectedIds[nextSelectedIds.length - 1] ?? null,
      preserveAnchor: additiveSelection,
    });
  };

  const handleGlobalPointerMove = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return;

    const distance = Math.hypot(event.clientX - startX, event.clientY - startY);
    if (!isDragging && distance < MARQUEE_DRAG_THRESHOLD_PX) {
      return;
    }

    event.preventDefault();
    isDragging = true;

    const rect = normalizeViewportRect(startX, startY, event.clientX, event.clientY);
    setOverlayRect(rect);
    updateSelectionFromRect(rect);
  };

  const handleGlobalPointerUp = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return;

    if (!isDragging && !additiveSelection) {
      options.clearSelection();
    }

    resetGesture();
  };

  const handleGlobalPointerCancel = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return;
    resetGesture();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if (!isMarqueeBackgroundTarget(event.target)) return;
    if (!options.getContainer()) return;

    activePointerId = event.pointerId;
    additiveSelection = isPrimaryModKeyPressed(event);
    baselineSelectedIds = additiveSelection ? options.getSelectedIds() : [];
    startX = event.clientX;
    startY = event.clientY;
    isDragging = false;

    if (typeof document !== 'undefined') {
      document.addEventListener('pointermove', handleGlobalPointerMove, true);
      document.addEventListener('pointerup', handleGlobalPointerUp, true);
      document.addEventListener('pointercancel', handleGlobalPointerCancel, true);
    }

    event.preventDefault();
  };

  const overlayStyle = createMemo<Record<string, string> | null>(() => {
    const rect = overlayRect();
    if (!rect) return null;

    return {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    };
  });

  onCleanup(() => {
    resetGesture();
  });

  return {
    overlayStyle,
    onPointerDown,
  };
}
