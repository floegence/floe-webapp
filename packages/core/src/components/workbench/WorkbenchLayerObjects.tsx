import { For, Show, batch, createEffect, createMemo, createSignal, onCleanup, untrack, type Accessor, type JSX } from 'solid-js';
import { Check, ChevronDown, Copy, GripVertical, Minus, Plus, Trash } from '../../icons';
import { startHotInteraction } from '../../utils/hotInteraction';
import { startPointerSession, type PointerSessionController } from '../ui/pointerSession';
import type {
  WorkbenchAnnotationItem,
  WorkbenchBackgroundLayer,
  WorkbenchBackgroundMaterial,
  WorkbenchSelection,
  WorkbenchStickyNoteColor,
  WorkbenchStickyNoteItem,
  WorkbenchTextAnnotationAlign,
  WorkbenchTextAnnotationItem,
  WorkbenchTextAnnotationPatch,
  WorkbenchViewport,
  WorkbenchWidgetSurfaceMetrics,
} from './types';
import {
  WORKBENCH_BACKGROUND_MATERIALS,
  WORKBENCH_REGION_FILL_OPTIONS,
  WORKBENCH_STICKY_NOTE_COLORS,
  WORKBENCH_TEXT_COLOR_OPTIONS,
  WORKBENCH_TEXT_EMOJI_OPTIONS,
  WORKBENCH_TEXT_FONT_OPTIONS,
} from './workbenchOptions';
import {
  compareWorkbenchLayerRenderOrder,
  createWorkbenchWidgetSurfaceMetrics,
} from './workbenchHelpers';
import { createOwnerSafePropAccessor } from './workbenchOwnerSafeAccessors';

type LayerDragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startWorldX: number;
  startWorldY: number;
  worldX: number;
  worldY: number;
  scale: number;
  moved: boolean;
  stopInteraction: () => void;
};

type LayerResizeState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
  width: number;
  height: number;
  scale: number;
  stopInteraction: () => void;
};

export type WorkbenchLayerGeometryPreview = {
  kind: 'annotation' | 'background_layer';
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WorkbenchLayerProjectionMode = 'world' | 'screen';

type WorkbenchLayerWorldGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WorkbenchLayerVisualGeometry = WorkbenchLayerWorldGeometry & {
  scale: number;
};

const NOTE_MIN_WIDTH = 190;
const NOTE_MIN_HEIGHT = 132;
const REGION_MIN_WIDTH = 180;
const REGION_MIN_HEIGHT = 120;
const TEXT_MIN_WIDTH = 96;
const TEXT_MIN_HEIGHT = 42;
const BACKGROUND_MATERIAL_LABEL: Record<WorkbenchBackgroundMaterial, string> = {
  solid: 'Solid',
  dotted: 'Dotted',
  grid: 'Grid',
  hatched: 'Hatched',
  glass: 'Glass',
};
const STICKY_COLOR_CLASS: Record<WorkbenchStickyNoteColor, string> = {
  amber: 'is-amber',
  sage: 'is-sage',
  azure: 'is-azure',
  coral: 'is-coral',
  rose: 'is-rose',
  graphite: 'is-graphite',
};

export interface WorkbenchTextEditorHandle {
  focus: () => void;
  insertTextAtSelection: (text: string) => void;
  readText: () => string;
}

export interface WorkbenchTextEditorRegistry {
  register: (annotationId: string, handle: WorkbenchTextEditorHandle) => () => void;
  get: (annotationId: string) => WorkbenchTextEditorHandle | undefined;
}

export function createWorkbenchTextEditorRegistry(): WorkbenchTextEditorRegistry {
  const handles = new Map<string, WorkbenchTextEditorHandle>();
  return {
    register(annotationId, handle) {
      handles.set(annotationId, handle);
      return () => {
        if (handles.get(annotationId) === handle) {
          handles.delete(annotationId);
        }
      };
    },
    get(annotationId) {
      return handles.get(annotationId);
    },
  };
}

function sortByLayer<T extends { id: string; z_index: number; created_at_unix_ms: number }>(
  items: readonly T[],
): T[] {
  return [...items].sort(compareWorkbenchLayerRenderOrder);
}

function createItemMap<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item] as const));
}

function nextValue<T>(values: readonly T[], current: T): T {
  const index = values.findIndex((value) => value === current);
  return values[(index + 1) % values.length] ?? values[0]!;
}

function useLayerPopoverDismiss(
  open: Accessor<boolean>,
  root: Accessor<HTMLElement | undefined>,
  close: () => void,
): void {
  createEffect(() => {
    if (!open()) return;
    if (typeof document === 'undefined') return;

    const handlePointerDown = (event: PointerEvent) => {
      const rootElement = root();
      if (rootElement && event.target instanceof Node && rootElement.contains(event.target)) {
        return;
      }
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    });
  });
}

function selectionBelongsToNode(selection: Selection | null, node: Node): selection is Selection {
  if (!selection || selection.rangeCount <= 0) return false;
  const ancestor = selection.getRangeAt(0).commonAncestorContainer;
  return ancestor === node || node.contains(ancestor);
}

function usePlainTextEditor(args: {
  value: Accessor<string>;
  onCommit: (value: string) => void;
}) {
  const [element, setElement] = createSignal<HTMLDivElement>();
  const [isComposing, setIsComposing] = createSignal(false);
  const [isFocused, setIsFocused] = createSignal(false);

  const readText = () => element()?.textContent ?? '';
  const bind = (node: HTMLDivElement) => setElement(node);
  const commitCurrentText = (node: HTMLDivElement) => {
    const nextValue = node.innerHTML ?? '';
    if (nextValue === args.value()) return;
    args.onCommit(nextValue);
  };

  createEffect(() => {
    const node = element();
    if (!node) return;
    if (isComposing()) return;
    if (isFocused()) return;
    const nextValue = args.value();
    if ((node.innerHTML ?? '') === nextValue) return;
    node.innerHTML = nextValue;
  });

  const handleFocus: JSX.EventHandler<HTMLDivElement, FocusEvent> = () => {
    setIsFocused(true);
  };
  const handleBlur: JSX.EventHandler<HTMLDivElement, FocusEvent> = (event) => {
    if (!isComposing()) {
      commitCurrentText(event.currentTarget);
    }
    setIsFocused(false);
  };
  const handleInput: JSX.EventHandler<HTMLDivElement, InputEvent> = (event) => {
    if (isComposing() || event.isComposing) return;
    commitCurrentText(event.currentTarget);
  };
  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    if (isComposing()) return;
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key === 'b') {
      event.preventDefault();
      document.execCommand('bold', false);
      commitCurrentText(event.currentTarget);
    } else if (mod && event.key === 'i') {
      event.preventDefault();
      document.execCommand('italic', false);
      commitCurrentText(event.currentTarget);
    }
  };
  const handleCompositionStart: JSX.EventHandler<HTMLDivElement, CompositionEvent> = () => {
    setIsComposing(true);
  };
  const handleCompositionEnd: JSX.EventHandler<HTMLDivElement, CompositionEvent> = (event) => {
    commitCurrentText(event.currentTarget);
    setIsComposing(false);
  };
  const focus = () => element()?.focus();
  const insertTextAtSelection = (text: string): void => {
    const node = element();
    if (!node) return;
    node.focus();
    const selection = document.getSelection();
    const ownsSelection = selectionBelongsToNode(selection, node);
    const range = ownsSelection && selection
      ? selection.getRangeAt(0)
      : document.createRange();
    if (!ownsSelection) {
      range.selectNodeContents(node);
      range.collapse(false);
    }

    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    commitCurrentText(node);
  };

  return {
    bind,
    readText,
    focus,
    insertTextAtSelection,
    handleFocus,
    handleBlur,
    handleInput,
    handleKeyDown,
    handleCompositionStart,
    handleCompositionEnd,
  };
}

function clampTextFontSize(value: number): number {
  return Math.max(8, Math.min(160, Math.round(value)));
}

function clampRegionOpacity(value: number): number {
  return Math.max(0.08, Math.min(1, value));
}

function formatPercent(value: number): string {
  return `${Math.round(clampRegionOpacity(value) * 1000) / 10}%`;
}

function createRegionRenderVars(item: WorkbenchBackgroundLayer): JSX.CSSProperties {
  const opacity = clampRegionOpacity(item.opacity);
  const surface = `color-mix(in srgb, ${item.fill} ${Math.round(opacity * 100)}%, transparent)`;
  return {
    '--workbench-region-fill': item.fill,
    '--workbench-region-surface': surface,
    '--workbench-region-ink': `color-mix(in srgb, color-mix(in srgb, ${item.fill} 48%, var(--foreground, #111) 52%) ${formatPercent(Math.max(opacity, 0.42) * 0.72)}, transparent)`,
    '--workbench-region-highlight': `color-mix(in srgb, white ${formatPercent(Math.max(opacity, 0.32) * 0.2)}, transparent)`,
  };
}

function stopLayerControlPointer(event: PointerEvent): void {
  event.stopPropagation();
}

function stopLayerControlClick(event: MouseEvent): void {
  event.stopPropagation();
}

function stopLayerButtonPointer(event: PointerEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function stopLayerButtonClick(event: MouseEvent): void {
  event.stopPropagation();
}

function readPreviewGeometry(
  preview: WorkbenchLayerGeometryPreview | null | undefined,
  kind: WorkbenchLayerGeometryPreview['kind'],
  id: string,
): WorkbenchLayerGeometryPreview | null {
  return preview?.kind === kind && preview.id === id ? preview : null;
}

function snapScreenPixel(value: number): number {
  const devicePixelRatio =
    typeof window !== 'undefined' &&
    Number.isFinite(window.devicePixelRatio) &&
    window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1;
  return Math.round(value * devicePixelRatio) / devicePixelRatio;
}

function projectLayerGeometry(args: {
  geometry: WorkbenchLayerWorldGeometry;
  viewport: WorkbenchViewport;
  projection?: WorkbenchLayerProjectionMode;
}): WorkbenchLayerVisualGeometry {
  const scale = Math.max(args.viewport.scale, 0.001);
  if (args.projection !== 'screen') {
    return { ...args.geometry, scale };
  }

  return {
    x: snapScreenPixel(args.viewport.x + args.geometry.x * scale),
    y: snapScreenPixel(args.viewport.y + args.geometry.y * scale),
    width: Math.max(1, snapScreenPixel(args.geometry.width * scale)),
    height: Math.max(1, snapScreenPixel(args.geometry.height * scale)),
    scale: 1,
  };
}

function createLayerTransformStyle(geometry: WorkbenchLayerVisualGeometry): Pick<
  JSX.CSSProperties,
  'width' | 'height' | 'transform'
> {
  return {
    width: `${geometry.width}px`,
    height: `${geometry.height}px`,
    transform: `translate(${geometry.x}px, ${geometry.y}px)`,
  };
}

function createLayerWorldGeometry(args: {
  preview: WorkbenchLayerGeometryPreview | null;
  position: { x: number; y: number };
  width: number;
  height: number;
}): WorkbenchLayerWorldGeometry {
  return {
    x: args.preview?.x ?? args.position.x,
    y: args.preview?.y ?? args.position.y,
    width: args.preview?.width ?? args.width,
    height: args.preview?.height ?? args.height,
  };
}

function useLayerDrag(args: {
  viewportScale: () => number;
  readPosition: () => { x: number; y: number };
  readGeometry?: () => { width: number; height: number };
  onCommitMove: (position: { x: number; y: number }) => void;
  onPreviewMove?: (geometry: { x: number; y: number; width: number; height: number }) => void;
  onPreviewEnd?: () => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onCommitStart?: (position: { x: number; y: number }) => void;
}) {
  const committedPosition = createOwnerSafePropAccessor(() => args.readPosition());
  const committedGeometry = createOwnerSafePropAccessor(() =>
    args.readGeometry?.() ?? { width: 0, height: 0 }
  );
  const viewportScale = createOwnerSafePropAccessor(() => args.viewportScale());
  const commitMove = createOwnerSafePropAccessor(() => args.onCommitMove);
  const previewMove = createOwnerSafePropAccessor(() => args.onPreviewMove);
  const previewEnd = createOwnerSafePropAccessor(() => args.onPreviewEnd);
  const interactionStart = createOwnerSafePropAccessor(() => args.onInteractionStart);
  const interactionEnd = createOwnerSafePropAccessor(() => args.onInteractionEnd);
  const commitStart = createOwnerSafePropAccessor(() => args.onCommitStart);
  const [dragState, setDragState] = createSignal<LayerDragState | null>(null);
  let session: PointerSessionController | undefined;

  onCleanup(() => {
    session?.stop({ reason: 'manual_stop', commit: false });
    session = undefined;
    untrack(dragState)?.stopInteraction();
  });

  const position = createMemo(() => {
    const current = dragState();
    return current ? { x: current.worldX, y: current.worldY } : committedPosition();
  });

  const beginDrag: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    session?.stop({ reason: 'manual_stop', commit: false });
    const start = committedPosition();
    const scale = Math.max(viewportScale(), 0.001);
    const stopHotInteraction = startHotInteraction({ kind: 'drag', cursor: 'grabbing' });
    let interactionStopped = false;
    interactionStart()?.();
    const stopInteraction = () => {
      if (interactionStopped) return;
      interactionStopped = true;
      stopHotInteraction();
      interactionEnd()?.();
    };
    const geometrySnapshot = committedGeometry();
    const previewMoveHandler = previewMove();
    const previewEndHandler = previewEnd();
    const commitStartHandler = commitStart();
    const commitMoveHandler = commitMove();
    setDragState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWorldX: start.x,
      startWorldY: start.y,
      worldX: start.x,
      worldY: start.y,
      scale,
      moved: false,
      stopInteraction,
    });
    session = startPointerSession({
      pointerEvent: event,
      captureEl: event.currentTarget,
      onMove: (nextEvent) => {
        let nextGeometry: { x: number; y: number; width: number; height: number } | null = null;
        batch(() => {
          setDragState((current) => {
            if (!current || current.pointerId !== nextEvent.pointerId) return current;
            const nextPosition = {
              x: current.startWorldX + (nextEvent.clientX - current.startClientX) / current.scale,
              y: current.startWorldY + (nextEvent.clientY - current.startClientY) / current.scale,
            };
            nextGeometry = {
              x: current.startWorldX + (nextEvent.clientX - current.startClientX) / current.scale,
              y: current.startWorldY + (nextEvent.clientY - current.startClientY) / current.scale,
              width: geometrySnapshot.width,
              height: geometrySnapshot.height,
            };
            return {
              ...current,
              worldX: nextPosition.x,
              worldY: nextPosition.y,
              moved:
                current.moved ||
                Math.abs(nextPosition.x - current.startWorldX) > 2 ||
                Math.abs(nextPosition.y - current.startWorldY) > 2,
            };
          });
          if (nextGeometry) {
            previewMoveHandler?.(nextGeometry);
          }
        });
      },
      onEnd: ({ commit }) => {
        const current = untrack(dragState);
        batch(() => {
          if (current && commit) {
            const position = { x: current.worldX, y: current.worldY };
            commitStartHandler?.(position);
            if (current.moved) {
              commitMoveHandler(position);
            }
          }
          current?.stopInteraction();
          setDragState(null);
          session = undefined;
          previewEndHandler?.();
        });
      },
    });
  };

  return {
    position,
    isDragging: () => dragState() !== null,
    beginDrag,
  };
}

function useLayerResize(args: {
  viewportScale: () => number;
  readSize: () => { width: number; height: number };
  minWidth: number;
  minHeight: number;
  onCommitResize: (size: { width: number; height: number }) => void;
  onPreviewResize?: (size: { width: number; height: number }) => void;
  onPreviewEnd?: () => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}) {
  const committedSize = createOwnerSafePropAccessor(() => args.readSize());
  const viewportScale = createOwnerSafePropAccessor(() => args.viewportScale());
  const commitResize = createOwnerSafePropAccessor(() => args.onCommitResize);
  const previewResize = createOwnerSafePropAccessor(() => args.onPreviewResize);
  const previewEnd = createOwnerSafePropAccessor(() => args.onPreviewEnd);
  const interactionStart = createOwnerSafePropAccessor(() => args.onInteractionStart);
  const interactionEnd = createOwnerSafePropAccessor(() => args.onInteractionEnd);
  const [resizeState, setResizeState] = createSignal<LayerResizeState | null>(null);
  let session: PointerSessionController | undefined;

  onCleanup(() => {
    session?.stop({ reason: 'manual_stop', commit: false });
    session = undefined;
    untrack(resizeState)?.stopInteraction();
  });

  const size = createMemo(() => {
    const current = resizeState();
    return current ? { width: current.width, height: current.height } : committedSize();
  });

  const beginResize: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    session?.stop({ reason: 'manual_stop', commit: false });
    const start = committedSize();
    const scale = Math.max(viewportScale(), 0.001);
    const stopHotInteraction = startHotInteraction({ kind: 'resize', cursor: 'nwse-resize' });
    let interactionStopped = false;
    interactionStart()?.();
    const stopInteraction = () => {
      if (interactionStopped) return;
      interactionStopped = true;
      stopHotInteraction();
      interactionEnd()?.();
    };
    const previewResizeHandler = previewResize();
    const previewEndHandler = previewEnd();
    const commitResizeHandler = commitResize();
    setResizeState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: start.width,
      startHeight: start.height,
      width: start.width,
      height: start.height,
      scale,
      stopInteraction,
    });
    session = startPointerSession({
      pointerEvent: event,
      captureEl: event.currentTarget,
      onMove: (nextEvent) => {
        let nextSize: { width: number; height: number } | null = null;
        batch(() => {
          setResizeState((current) => {
            if (!current || current.pointerId !== nextEvent.pointerId) return current;
            nextSize = {
              width: Math.max(
                args.minWidth,
                current.startWidth + (nextEvent.clientX - current.startClientX) / current.scale,
              ),
              height: Math.max(
                args.minHeight,
                current.startHeight + (nextEvent.clientY - current.startClientY) / current.scale,
              ),
            };
            return {
              ...current,
              width: nextSize.width,
              height: nextSize.height,
            };
          });
          if (nextSize) {
            previewResizeHandler?.(nextSize);
          }
        });
      },
      onEnd: ({ commit }) => {
        const current = untrack(resizeState);
        batch(() => {
          if (current && commit) {
            commitResizeHandler({ width: current.width, height: current.height });
          }
          current?.stopInteraction();
          setResizeState(null);
          session = undefined;
          previewEndHandler?.();
        });
      },
    });
  };

  return {
    size,
    isResizing: () => resizeState() !== null,
    beginResize,
  };
}

export function WorkbenchStickyNote(props: {
  item: WorkbenchStickyNoteItem;
  selected: boolean;
  viewportScale: number;
  projectedViewport?: Accessor<WorkbenchViewport>;
  surfaceReady?: boolean;
  renderLayer: number;
  topRenderLayer: number;
  locked: boolean;
  filtered: boolean;
  optimisticFront?: boolean;
  onSelect: (noteId: string) => void;
  onContextMenu?: (event: MouseEvent, item: WorkbenchStickyNoteItem) => void;
  onStartOptimisticFront?: (noteId: string) => void;
  onCommitFront?: (noteId: string) => void;
  onCommitMove: (noteId: string, position: { x: number; y: number }) => void;
  onCommitResize: (noteId: string, size: { width: number; height: number }) => void;
  onUpdate: (noteId: string, patch: Partial<Pick<WorkbenchStickyNoteItem, 'body' | 'color'>>) => void;
  onDelete: (noteId: string) => void;
  onLayoutInteractionStart?: () => void;
  onLayoutInteractionEnd?: () => void;
}) {
  const item = createOwnerSafePropAccessor(() => props.item);
  const selected = createOwnerSafePropAccessor(() => props.selected);
  const viewportScale = createOwnerSafePropAccessor(() => props.viewportScale);
  const projectedViewport = createOwnerSafePropAccessor(() => props.projectedViewport);
  const surfaceReady = createOwnerSafePropAccessor(() => props.surfaceReady ?? true);
  const renderLayer = createOwnerSafePropAccessor(() => props.renderLayer);
  const topRenderLayer = createOwnerSafePropAccessor(() => props.topRenderLayer);
  const locked = createOwnerSafePropAccessor(() => props.locked);
  const filtered = createOwnerSafePropAccessor(() => props.filtered);
  const optimisticFront = createOwnerSafePropAccessor(() => props.optimisticFront ?? false);
  const onSelect = createOwnerSafePropAccessor(() => props.onSelect);
  const onContextMenu = createOwnerSafePropAccessor(() => props.onContextMenu);
  const onStartOptimisticFront = createOwnerSafePropAccessor(() => props.onStartOptimisticFront);
  const onCommitFront = createOwnerSafePropAccessor(() => props.onCommitFront);
  const onCommitMove = createOwnerSafePropAccessor(() => props.onCommitMove);
  const onCommitResize = createOwnerSafePropAccessor(() => props.onCommitResize);
  const onUpdate = createOwnerSafePropAccessor(() => props.onUpdate);
  const onDelete = createOwnerSafePropAccessor(() => props.onDelete);
  const onLayoutInteractionStart =
    createOwnerSafePropAccessor(() => props.onLayoutInteractionStart);
  const onLayoutInteractionEnd = createOwnerSafePropAccessor(() => props.onLayoutInteractionEnd);
  const bodyEditor = usePlainTextEditor({
    value: () => item().body,
    onCommit: (body) => onUpdate()(item().id, { body }),
  });
  const [copied, setCopied] = createSignal(false);
  let copiedTimer: number | undefined;
  const clearCopiedTimer = () => {
    if (typeof window === 'undefined' || copiedTimer === undefined) return;
    window.clearTimeout(copiedTimer);
    copiedTimer = undefined;
  };
  const flashCopied = () => {
    setCopied(true);
    clearCopiedTimer();
    if (typeof window === 'undefined') return;
    copiedTimer = window.setTimeout(() => {
      copiedTimer = undefined;
      setCopied(false);
    }, 720);
  };
  onCleanup(() => clearCopiedTimer());
  const copyStickyBody = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(bodyEditor.readText());
    flashCopied();
  };

  const handleStickyPointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (event.button !== 0) return;
    const currentItem = item();
    onSelect()(currentItem.id);
    if (locked()) return;
    if (
      event.target instanceof Element &&
      event.target.closest('[data-floe-workbench-sticky-local="true"]')
    ) {
      return;
    }
    onStartOptimisticFront()?.(currentItem.id);
    drag.beginDrag(event);
  };

  const drag = useLayerDrag({
    viewportScale,
    readPosition: () => ({ x: item().x, y: item().y }),
    onCommitMove: (position) => onCommitMove()(item().id, position),
    onCommitStart: () => onCommitFront()?.(item().id),
    onInteractionStart: () => onLayoutInteractionStart()?.(),
    onInteractionEnd: () => onLayoutInteractionEnd()?.(),
  });
  const resize = useLayerResize({
    viewportScale,
    readSize: () => ({ width: item().width, height: item().height }),
    minWidth: NOTE_MIN_WIDTH,
    minHeight: NOTE_MIN_HEIGHT,
    onCommitResize: (size) => onCommitResize()(item().id, size),
    onInteractionStart: () => onLayoutInteractionStart()?.(),
    onInteractionEnd: () => onLayoutInteractionEnd()?.(),
  });
  const livePosition = createMemo(() => drag.position());
  const liveSize = createMemo(() => resize.size());
  const surfaceMetrics = createMemo<WorkbenchWidgetSurfaceMetrics | undefined>(() => {
    const viewportAccessor = projectedViewport();
    if (!viewportAccessor) return undefined;
    return createWorkbenchWidgetSurfaceMetrics({
      widgetId: item().id,
      worldX: livePosition().x,
      worldY: livePosition().y,
      worldWidth: liveSize().width,
      worldHeight: liveSize().height,
      viewport: viewportAccessor(),
      ready: surfaceReady(),
    });
  });
  const projectedScale = createMemo(
    () => surfaceMetrics()?.rect.viewportScale ?? Math.max(viewportScale(), 0.001),
  );
  const style = createMemo<JSX.CSSProperties>(() => ({
    width: `${liveSize().width}px`,
    height: `${liveSize().height}px`,
    transform: projectedViewport()
      ? `translate(${surfaceMetrics()?.rect.screenX ?? 0}px, ${surfaceMetrics()?.rect.screenY ?? 0}px) scale(${projectedScale()})`
      : `translate(${livePosition().x}px, ${livePosition().y}px)`,
    'transform-origin': '0 0',
    'z-index': `${
      selected() || optimisticFront() || drag.isDragging() || resize.isResizing()
        ? topRenderLayer() + 1
        : renderLayer()
    }`,
  }));

  return (
    <article
      class="workbench-sticky"
      classList={{
        'is-selected': selected(),
        'is-locked': locked(),
        'is-filtered-out': filtered(),
        'is-dragging': drag.isDragging(),
        'is-resizing': resize.isResizing(),
        'is-copied': copied(),
        [STICKY_COLOR_CLASS[item().color]]: true,
      }}
      data-floe-canvas-interactive="true"
      data-floe-workbench-widget-root="true"
      data-floe-workbench-widget-id={item().id}
      data-wb-plane="work"
      data-wb-object-kind="sticky"
      data-wb-object-id={item().id}
      data-floe-workbench-sticky-id={item().id}
      style={style()}
      tabIndex={0}
      onPointerDown={handleStickyPointerDown}
      onFocus={() => onSelect()(item().id)}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu()?.(event, item());
      }}
    >
      <div class="workbench-sticky__surface">
        <header class="workbench-sticky__header">
          <button
            type="button"
            class="workbench-sticky__grip"
            aria-label="Drag sticky note"
            data-floe-workbench-sticky-local="true"
            data-wb-part="move"
            onPointerDown={(event) => {
              const currentItem = item();
              onSelect()(currentItem.id);
              onStartOptimisticFront()?.(currentItem.id);
              drag.beginDrag(event);
            }}
          >
            <GripVertical class="w-3.5 h-3.5" />
          </button>
        </header>
        <div
          ref={bodyEditor.bind}
          class="workbench-sticky__body"
          contentEditable={locked() ? false : true}
          role="textbox"
          aria-multiline="true"
          aria-disabled={locked() ? 'true' : undefined}
          aria-label="Sticky note body"
          spellcheck={false}
          data-floe-workbench-text-selection-surface="true"
          data-wb-text-editor="plain"
          data-floe-workbench-sticky-local="true"
          data-wb-part="content"
          onPointerDown={(event) => {
            event.stopPropagation();
            onSelect()(item().id);
          }}
          onFocus={bodyEditor.handleFocus}
          onBlur={bodyEditor.handleBlur}
          onInput={bodyEditor.handleInput}
          onKeyDown={bodyEditor.handleKeyDown}
          onCompositionStart={bodyEditor.handleCompositionStart}
          onCompositionEnd={bodyEditor.handleCompositionEnd}
        />
      </div>
      <Show when={selected() && !locked()}>
        <div class="workbench-sticky__actions" data-floe-workbench-sticky-local="true">
          <button
            type="button"
            class="workbench-sticky__tool"
            classList={{ 'is-success': copied() }}
            aria-label="Copy sticky note content"
            title={copied() ? 'Sticky note content copied' : 'Copy sticky note content'}
            onPointerDown={stopLayerButtonPointer}
            onClick={async (event) => {
              stopLayerButtonClick(event);
              await copyStickyBody();
            }}
          >
            <Show when={copied()} fallback={<Copy class="w-3.5 h-3.5" />}>
              <Check class="w-3.5 h-3.5" />
            </Show>
          </button>
          <button
            type="button"
            class="workbench-sticky__tool"
            aria-label="Change sticky note color"
            title="Change sticky note color"
            onPointerDown={stopLayerButtonPointer}
            onClick={(event) => {
              stopLayerButtonClick(event);
              const currentItem = item();
              onUpdate()(currentItem.id, {
                color: nextValue<WorkbenchStickyNoteColor>(
                  WORKBENCH_STICKY_NOTE_COLORS,
                  currentItem.color,
                ),
              });
            }}
          >
            <span class="workbench-sticky__color-dot" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="workbench-sticky__tool is-danger"
            aria-label="Delete sticky note"
            title="Delete sticky note"
            onPointerDown={stopLayerButtonPointer}
            onClick={(event) => {
              stopLayerButtonClick(event);
              onDelete()(item().id);
            }}
          >
            <Trash class="w-3.5 h-3.5" />
          </button>
        </div>
      </Show>
      <Show when={!locked()}>
        <button
          type="button"
          class="workbench-layer-resize workbench-sticky__resize"
          aria-label="Resize sticky note"
          onPointerDown={resize.beginResize}
        />
      </Show>
    </article>
  );
}

export function WorkbenchTextAnnotation(props: {
  item: WorkbenchTextAnnotationItem;
  selected: boolean;
  editable: boolean;
  viewportScale: number;
  viewport?: WorkbenchViewport;
  projection?: WorkbenchLayerProjectionMode;
  preview?: WorkbenchLayerGeometryPreview | null;
  onPreviewGeometry?: (preview: WorkbenchLayerGeometryPreview | null) => void;
  textEditorRegistry?: WorkbenchTextEditorRegistry;
  onSelect: (annotationId: string) => void;
  onContextMenu?: (event: MouseEvent, item: WorkbenchAnnotationItem) => void;
  onCommitMove: (annotationId: string, position: { x: number; y: number }) => void;
  onUpdate: (
    annotationId: string,
    patch: WorkbenchTextAnnotationPatch,
  ) => void;
}) {
  const item = createOwnerSafePropAccessor(() => props.item);
  const selected = createOwnerSafePropAccessor(() => props.selected);
  const editable = createOwnerSafePropAccessor(() => props.editable);
  const viewportScale = createOwnerSafePropAccessor(() => props.viewportScale);
  const viewport = createOwnerSafePropAccessor(() => props.viewport ?? { x: 0, y: 0, scale: 1 });
  const projection = createOwnerSafePropAccessor(() => props.projection);
  const preview = createOwnerSafePropAccessor(() => props.preview);
  const textEditorRegistry = createOwnerSafePropAccessor(() => props.textEditorRegistry);
  const onPreviewGeometry = createOwnerSafePropAccessor(() => props.onPreviewGeometry);
  const onSelect = createOwnerSafePropAccessor(() => props.onSelect);
  const onContextMenu = createOwnerSafePropAccessor(() => props.onContextMenu);
  const onCommitMove = createOwnerSafePropAccessor(() => props.onCommitMove);
  const onUpdate = createOwnerSafePropAccessor(() => props.onUpdate);
  const textEditor = usePlainTextEditor({
    value: () => item().text,
    onCommit: (text) => onUpdate()(item().id, { text }),
  });
  createEffect(() => {
    const registry = textEditorRegistry();
    if (!registry) return;
    const unregister = registry.register(item().id, {
      focus: textEditor.focus,
      insertTextAtSelection: textEditor.insertTextAtSelection,
      readText: textEditor.readText,
    });
    onCleanup(unregister);
  });
  const drag = useLayerDrag({
    viewportScale,
    readPosition: () => ({ x: item().x, y: item().y }),
    readGeometry: () => ({ width: item().width, height: item().height }),
    onCommitMove: (position) => onCommitMove()(item().id, position),
    onPreviewMove: (geometry) => onPreviewGeometry()?.({
      kind: 'annotation',
      id: item().id,
      ...geometry,
    }),
    onPreviewEnd: () => onPreviewGeometry()?.(null),
  });
  const visualGeometry = createMemo(() => {
    const currentItem = item();
    const currentPreview = readPreviewGeometry(preview(), 'annotation', currentItem.id);
    return projectLayerGeometry({
      geometry: createLayerWorldGeometry({
        preview: currentPreview,
        position: drag.position(),
        width: currentItem.width,
        height: currentItem.height,
      }),
      viewport: viewport(),
      projection: projection(),
    });
  });
  const contentScale = createMemo(() =>
    projection() === 'screen' ? Math.max(viewport().scale, 0.001) : 1
  );
  const style = createMemo<JSX.CSSProperties>(() => ({
    ...createLayerTransformStyle(visualGeometry()),
    'z-index': `${item().z_index}`,
    '--workbench-text-color': item().color,
    '--workbench-text-size': `${item().font_size}px`,
    '--workbench-text-weight': `${item().font_weight}`,
    '--workbench-text-align': item().align,
    '--workbench-text-family': item().font_family,
    '--workbench-text-content-scale': `${contentScale()}`,
    '--workbench-text-content-inverse-scale': `${1 / contentScale()}`,
  }));
  const handleTextFramePointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (!editable() || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest(
        '.workbench-text-annotation__content',
      )
    ) {
      return;
    }
    event.stopPropagation();
    onSelect()(item().id);
  };

  return (
    <article
      class="workbench-text-annotation"
      classList={{ 'is-selected': selected(), 'is-editable': editable() }}
      data-floe-canvas-interactive={editable() ? 'true' : undefined}
      data-wb-plane="annotation"
      data-wb-object-kind="text"
      data-wb-object-id={item().id}
      data-wb-part="body"
      style={style()}
      onPointerDown={handleTextFramePointerDown}
      onContextMenu={(event) => {
        if (!editable()) return;
        event.preventDefault();
        event.stopPropagation();
        onSelect()(item().id);
        onContextMenu()?.(event, item());
      }}
    >
      <div
        ref={textEditor.bind}
        class="workbench-text-annotation__content"
        contentEditable={editable() ? 'plaintext-only' : false}
        tabIndex={editable() ? 0 : undefined}
        role={editable() ? 'textbox' : undefined}
        aria-multiline={editable() ? 'true' : undefined}
        aria-disabled={editable() ? undefined : 'true'}
        spellcheck={false}
        data-floe-workbench-text-selection-surface="true"
        data-wb-text-editor="plain"
        data-wb-part="content"
        onPointerDown={(event) => {
          if (!editable() || event.button !== 0) return;
          onSelect()(item().id);
        }}
        onFocus={(event) => {
          textEditor.handleFocus(event);
          if (editable()) onSelect()(item().id);
        }}
        onBlur={textEditor.handleBlur}
        onInput={textEditor.handleInput}
        onCompositionStart={textEditor.handleCompositionStart}
        onCompositionEnd={textEditor.handleCompositionEnd}
      />
    </article>
  );
}

export function WorkbenchBackgroundRegion(props: {
  item: WorkbenchBackgroundLayer;
  selected: boolean;
  editable: boolean;
  viewportScale: number;
  viewport?: WorkbenchViewport;
  projection?: WorkbenchLayerProjectionMode;
  preview?: WorkbenchLayerGeometryPreview | null;
  onPreviewGeometry?: (preview: WorkbenchLayerGeometryPreview | null) => void;
  onSelect: (layerId: string) => void;
  onContextMenu?: (event: MouseEvent, item: WorkbenchBackgroundLayer) => void;
  onCommitMove: (layerId: string, position: { x: number; y: number }) => void;
}) {
  const item = createOwnerSafePropAccessor(() => props.item);
  const selected = createOwnerSafePropAccessor(() => props.selected);
  const editable = createOwnerSafePropAccessor(() => props.editable);
  const viewportScale = createOwnerSafePropAccessor(() => props.viewportScale);
  const viewport = createOwnerSafePropAccessor(() => props.viewport ?? { x: 0, y: 0, scale: 1 });
  const projection = createOwnerSafePropAccessor(() => props.projection);
  const preview = createOwnerSafePropAccessor(() => props.preview);
  const onPreviewGeometry = createOwnerSafePropAccessor(() => props.onPreviewGeometry);
  const onSelect = createOwnerSafePropAccessor(() => props.onSelect);
  const onContextMenu = createOwnerSafePropAccessor(() => props.onContextMenu);
  const onCommitMove = createOwnerSafePropAccessor(() => props.onCommitMove);
  const drag = useLayerDrag({
    viewportScale,
    readPosition: () => ({ x: item().x, y: item().y }),
    readGeometry: () => ({ width: item().width, height: item().height }),
    onCommitMove: (position) => onCommitMove()(item().id, position),
    onPreviewMove: (geometry) => onPreviewGeometry()?.({
      kind: 'background_layer',
      id: item().id,
      ...geometry,
    }),
    onPreviewEnd: () => onPreviewGeometry()?.(null),
  });
  const visualGeometry = createMemo(() => {
    const currentItem = item();
    const currentPreview = readPreviewGeometry(preview(), 'background_layer', currentItem.id);
    return projectLayerGeometry({
      geometry: createLayerWorldGeometry({
        preview: currentPreview,
        position: drag.position(),
        width: currentItem.width,
        height: currentItem.height,
      }),
      viewport: viewport(),
      projection: projection(),
    });
  });
  const style = createMemo<JSX.CSSProperties>(() => ({
    ...createLayerTransformStyle(visualGeometry()),
    'z-index': `${item().z_index}`,
    ...createRegionRenderVars(item()),
  }));
  const handleRegionPointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (!editable() || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest('.workbench-background-region__toolbar, .workbench-layer-resize')
    ) {
      return;
    }
    onSelect()(item().id);
    drag.beginDrag(event);
  };

  return (
    <article
      class="workbench-background-region"
      classList={{
        'is-selected': selected(),
        'is-editable': editable(),
        'is-transforming': drag.isDragging(),
        [`is-material-${item().material}`]: true,
      }}
      data-floe-canvas-interactive={editable() ? 'true' : undefined}
      data-wb-plane="background"
      data-wb-object-kind="region"
      data-wb-object-id={item().id}
      data-wb-part="body"
      style={style()}
      tabIndex={editable() ? 0 : undefined}
      onPointerDown={handleRegionPointerDown}
      onFocus={() => editable() && onSelect()(item().id)}
      onContextMenu={(event) => {
        if (!editable()) return;
        event.preventDefault();
        event.stopPropagation();
        onSelect()(item().id);
        onContextMenu()?.(event, item());
      }}
    />
  );
}

function WorkbenchTextAnnotationControls(props: {
  item: WorkbenchTextAnnotationItem;
  viewportScale: number;
  viewport?: WorkbenchViewport;
  projection?: WorkbenchLayerProjectionMode;
  preview?: WorkbenchLayerGeometryPreview | null;
  onPreviewGeometry?: (preview: WorkbenchLayerGeometryPreview | null) => void;
  textEditorRegistry?: WorkbenchTextEditorRegistry;
  onCommitMove: (annotationId: string, position: { x: number; y: number }) => void;
  onCommitResize: (annotationId: string, size: { width: number; height: number }) => void;
  onUpdate: (
    annotationId: string,
    patch: WorkbenchTextAnnotationPatch,
  ) => void;
  onDelete: (annotationId: string) => void;
}) {
  const item = createOwnerSafePropAccessor(() => props.item);
  const viewportScale = createOwnerSafePropAccessor(() => props.viewportScale);
  const viewport = createOwnerSafePropAccessor(() => props.viewport ?? { x: 0, y: 0, scale: 1 });
  const projection = createOwnerSafePropAccessor(() => props.projection);
  const preview = createOwnerSafePropAccessor(() => props.preview);
  const textEditorRegistry = createOwnerSafePropAccessor(() => props.textEditorRegistry);
  const onPreviewGeometry = createOwnerSafePropAccessor(() => props.onPreviewGeometry);
  const onCommitMove = createOwnerSafePropAccessor(() => props.onCommitMove);
  const onCommitResize = createOwnerSafePropAccessor(() => props.onCommitResize);
  const onUpdate = createOwnerSafePropAccessor(() => props.onUpdate);
  const onDelete = createOwnerSafePropAccessor(() => props.onDelete);
  let sizeInputEl: HTMLInputElement | undefined;
  let fontPickerEl: HTMLDivElement | undefined;
  let emojiPickerEl: HTMLDivElement | undefined;
  const [fontSizeDraft, setFontSizeDraft] = createSignal('');
  const [fontPickerOpen, setFontPickerOpen] = createSignal(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = createSignal(false);
  const activeFont = createMemo(() =>
    WORKBENCH_TEXT_FONT_OPTIONS.find((font) => font.fontFamily === item().font_family)
      ?? WORKBENCH_TEXT_FONT_OPTIONS[0]!
  );
  const move = useLayerDrag({
    viewportScale,
    readPosition: () => ({ x: item().x, y: item().y }),
    readGeometry: () => ({ width: item().width, height: item().height }),
    onCommitMove: (position) => onCommitMove()(item().id, position),
    onPreviewMove: (geometry) => onPreviewGeometry()?.({
      kind: 'annotation',
      id: item().id,
      ...geometry,
    }),
    onPreviewEnd: () => onPreviewGeometry()?.(null),
  });
  const resize = useLayerResize({
    viewportScale,
    readSize: () => ({ width: item().width, height: item().height }),
    minWidth: TEXT_MIN_WIDTH,
    minHeight: TEXT_MIN_HEIGHT,
    onCommitResize: (size) => onCommitResize()(item().id, size),
    onPreviewResize: (size) => onPreviewGeometry()?.({
      kind: 'annotation',
      id: item().id,
      x: item().x,
      y: item().y,
      width: size.width,
      height: size.height,
    }),
    onPreviewEnd: () => onPreviewGeometry()?.(null),
  });
  const visualGeometry = createMemo(() => {
    const currentItem = item();
    const currentPreview = readPreviewGeometry(preview(), 'annotation', currentItem.id);
    return projectLayerGeometry({
      geometry: createLayerWorldGeometry({
        preview: currentPreview,
        position: move.position(),
        width: resize.size().width,
        height: resize.size().height,
      }),
      viewport: viewport(),
      projection: projection(),
    });
  });
  const style = createMemo<JSX.CSSProperties>(() => ({
    ...createLayerTransformStyle(visualGeometry()),
    'z-index': `${item().z_index}`,
    '--workbench-layer-control-inverse-scale': `${1 / Math.max(visualGeometry().scale, 0.001)}`,
  }));
  const nextAlign = (): WorkbenchTextAnnotationAlign =>
    nextValue<WorkbenchTextAnnotationAlign>(['left', 'center', 'right'], item().align);
  const updateFontSize = (value: number) => {
    if (!Number.isFinite(value)) return;
    const next = clampTextFontSize(value);
    setFontSizeDraft(String(next));
    onUpdate()(item().id, { font_size: next });
  };
  const commitFontSizeDraft = () => {
    const raw = fontSizeDraft().trim();
    const next = Number(raw);
    if (raw.length > 0 && Number.isFinite(next)) {
      updateFontSize(next);
      return;
    }
    setFontSizeDraft(String(item().font_size));
  };

  createEffect(() => {
    if (typeof document !== 'undefined' && document.activeElement === sizeInputEl) return;
    setFontSizeDraft(String(item().font_size));
  });

  useLayerPopoverDismiss(
    fontPickerOpen,
    () => fontPickerEl,
    () => setFontPickerOpen(false),
  );
  useLayerPopoverDismiss(
    emojiPickerOpen,
    () => emojiPickerEl,
    () => setEmojiPickerOpen(false),
  );

  return (
    <div
      class="workbench-layer-control workbench-layer-control--text"
      data-floe-canvas-interactive="true"
      data-wb-plane="overlay"
      data-wb-object-kind="text"
      data-wb-object-id={item().id}
      data-wb-part="toolbar"
      style={style()}
    >
      <div class="workbench-layer-control__selection is-text" aria-hidden="true" />
      <div
        class="workbench-text-annotation__toolbar"
        data-floe-canvas-interactive="true"
        onPointerDown={stopLayerControlPointer}
        onClick={stopLayerControlClick}
      >
        <button
          type="button"
          aria-label="Move text"
          title="Move text"
          class="workbench-layer-mini-button workbench-layer-move-handle"
          data-wb-part="move"
          onPointerDown={move.beginDrag}
          onClick={stopLayerButtonClick}
        >
          <GripVertical class="w-3.5 h-3.5" />
        </button>
        <div
          ref={fontPickerEl}
          class="workbench-text-font-picker"
          data-floe-canvas-interactive="true"
          onPointerDown={stopLayerControlPointer}
          onClick={stopLayerControlClick}
        >
          <button
            type="button"
            aria-label="Choose bold font"
            aria-haspopup="menu"
            aria-expanded={fontPickerOpen()}
            title="Choose bold font"
            class="workbench-text-font-trigger"
            onPointerDown={stopLayerButtonPointer}
            onClick={(event) => {
              stopLayerButtonClick(event);
              setFontPickerOpen((open) => !open);
            }}
          >
            <span
              class="workbench-text-font-trigger__sample"
              style={{
                'font-family': activeFont().fontFamily,
                'font-weight': `${activeFont().fontWeight}`,
              }}
            >
              Aa
            </span>
            <span class="workbench-text-font-trigger__label">{activeFont().label}</span>
            <ChevronDown class="workbench-text-font-trigger__icon" />
          </button>
          <Show when={fontPickerOpen()}>
            <div class="workbench-text-font-popover" role="menu" aria-label="Bold font">
              <For each={WORKBENCH_TEXT_FONT_OPTIONS}>
                {(font) => (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={item().font_family === font.fontFamily}
                    aria-label={`Use ${font.label} bold font`}
                    title={`${font.label} bold`}
                    class="workbench-text-font-option"
                    classList={{ 'is-active': item().font_family === font.fontFamily }}
                    onPointerDown={stopLayerButtonPointer}
                    onClick={(event) => {
                      stopLayerButtonClick(event);
                      onUpdate()(item().id, {
                        font_family: font.fontFamily,
                        font_weight: font.fontWeight,
                      });
                      setFontPickerOpen(false);
                    }}
                  >
                    <span
                      class="workbench-text-font-option__sample"
                      style={{
                        'font-family': font.fontFamily,
                        'font-weight': `${font.fontWeight}`,
                      }}
                    >
                      Aa
                    </span>
                    <span class="workbench-text-font-option__label">{font.label}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
        <div
          class="workbench-text-size-stepper"
          role="group"
          aria-label="Text size"
          onPointerDown={stopLayerControlPointer}
          onClick={stopLayerControlClick}
        >
          <button
            type="button"
            aria-label="Decrease text size"
            title="Decrease text size"
            class="workbench-text-size-stepper__button"
            onPointerDown={stopLayerButtonPointer}
            onClick={(event) => {
              stopLayerButtonClick(event);
              updateFontSize(item().font_size - 1);
            }}
          >
            <Minus class="w-3 h-3" />
          </button>
          <input
            ref={sizeInputEl}
            class="workbench-text-annotation__size-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Text size value"
            value={fontSizeDraft()}
            onPointerDown={stopLayerControlPointer}
            onClick={stopLayerControlClick}
            onInput={(event) => setFontSizeDraft(event.currentTarget.value)}
            onBlur={commitFontSizeDraft}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              commitFontSizeDraft();
              event.currentTarget.blur();
            }}
          />
          <button
            type="button"
            aria-label="Increase text size"
            title="Increase text size"
            class="workbench-text-size-stepper__button"
            onPointerDown={stopLayerButtonPointer}
            onClick={(event) => {
              stopLayerButtonClick(event);
              updateFontSize(item().font_size + 1);
            }}
          >
            <Plus class="w-3 h-3" />
          </button>
        </div>
        <For each={WORKBENCH_TEXT_COLOR_OPTIONS}>
          {(color) => (
            <button
              type="button"
              aria-label={`Use text color ${color}`}
              class="workbench-layer-swatch"
              classList={{ 'is-active': item().color === color }}
              style={{ background: color }}
              onPointerDown={stopLayerButtonPointer}
              onClick={(event) => {
                stopLayerButtonClick(event);
                onUpdate()(item().id, { color });
              }}
            />
          )}
        </For>
        <div
          ref={emojiPickerEl}
          class="workbench-text-emoji-picker"
          data-floe-canvas-interactive="true"
          onPointerDown={stopLayerControlPointer}
          onClick={stopLayerControlClick}
        >
          <button
            type="button"
            aria-label="Insert emoji"
            aria-haspopup="menu"
            aria-expanded={emojiPickerOpen()}
            title="Insert emoji"
            class="workbench-text-emoji-trigger"
            onPointerDown={stopLayerButtonPointer}
            onClick={(event) => {
              stopLayerButtonClick(event);
              setEmojiPickerOpen((open) => !open);
            }}
          >
            ✨
          </button>
          <Show when={emojiPickerOpen()}>
            <div class="workbench-text-emoji-popover" role="menu" aria-label="Emoji">
              <For each={WORKBENCH_TEXT_EMOJI_OPTIONS}>
                {(emoji) => (
                  <button
                    type="button"
                    role="menuitem"
                    aria-label={`Insert emoji ${emoji}`}
                    title={`Insert ${emoji}`}
                    class="workbench-text-emoji-option"
                    onPointerDown={stopLayerButtonPointer}
                    onClick={(event) => {
                      stopLayerButtonClick(event);
                      textEditorRegistry()?.get(item().id)?.insertTextAtSelection(emoji);
                      setEmojiPickerOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
        <button
          type="button"
          class="workbench-layer-mini-button"
          onPointerDown={stopLayerButtonPointer}
          onClick={(event) => {
            stopLayerButtonClick(event);
            onUpdate()(item().id, { align: nextAlign() });
          }}
        >
          {item().align}
        </button>
        <button
          type="button"
          class="workbench-layer-mini-button is-danger"
          aria-label="Delete text"
          onPointerDown={stopLayerButtonPointer}
          onClick={(event) => {
            stopLayerButtonClick(event);
            onDelete()(item().id);
          }}
        >
          <Trash class="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        type="button"
        class="workbench-layer-resize"
        aria-label="Resize text"
        data-wb-part="resize"
        onPointerDown={resize.beginResize}
      />
    </div>
  );
}

function WorkbenchBackgroundRegionControls(props: {
  item: WorkbenchBackgroundLayer;
  viewportScale: number;
  viewport?: WorkbenchViewport;
  projection?: WorkbenchLayerProjectionMode;
  preview?: WorkbenchLayerGeometryPreview | null;
  onPreviewGeometry?: (preview: WorkbenchLayerGeometryPreview | null) => void;
  onCommitResize: (layerId: string, size: { width: number; height: number }) => void;
  onUpdate: (
    layerId: string,
    patch: Partial<Pick<WorkbenchBackgroundLayer, 'fill' | 'opacity' | 'material' | 'name'>>,
  ) => void;
  onDelete: (layerId: string) => void;
}) {
  const item = createOwnerSafePropAccessor(() => props.item);
  const viewportScale = createOwnerSafePropAccessor(() => props.viewportScale);
  const viewport = createOwnerSafePropAccessor(() => props.viewport ?? { x: 0, y: 0, scale: 1 });
  const projection = createOwnerSafePropAccessor(() => props.projection);
  const preview = createOwnerSafePropAccessor(() => props.preview);
  const onPreviewGeometry = createOwnerSafePropAccessor(() => props.onPreviewGeometry);
  const onCommitResize = createOwnerSafePropAccessor(() => props.onCommitResize);
  const onUpdate = createOwnerSafePropAccessor(() => props.onUpdate);
  const onDelete = createOwnerSafePropAccessor(() => props.onDelete);
  const resize = useLayerResize({
    viewportScale,
    readSize: () => ({ width: item().width, height: item().height }),
    minWidth: REGION_MIN_WIDTH,
    minHeight: REGION_MIN_HEIGHT,
    onCommitResize: (size) => onCommitResize()(item().id, size),
    onPreviewResize: (size) => onPreviewGeometry()?.({
      kind: 'background_layer',
      id: item().id,
      x: item().x,
      y: item().y,
      width: size.width,
      height: size.height,
    }),
    onPreviewEnd: () => onPreviewGeometry()?.(null),
  });
  const visualGeometry = createMemo(() => {
    const currentItem = item();
    const currentPreview = readPreviewGeometry(preview(), 'background_layer', currentItem.id);
    return projectLayerGeometry({
      geometry: createLayerWorldGeometry({
        preview: currentPreview,
        position: { x: currentItem.x, y: currentItem.y },
        width: resize.size().width,
        height: resize.size().height,
      }),
      viewport: viewport(),
      projection: projection(),
    });
  });
  const style = createMemo<JSX.CSSProperties>(() => ({
    ...createLayerTransformStyle(visualGeometry()),
    'z-index': `${item().z_index}`,
    '--workbench-layer-control-inverse-scale': `${1 / Math.max(visualGeometry().scale, 0.001)}`,
    ...createRegionRenderVars(item()),
  }));

  return (
    <div
      class="workbench-layer-control workbench-layer-control--region"
      data-floe-canvas-interactive="true"
      data-wb-plane="overlay"
      data-wb-object-kind="region"
      data-wb-object-id={item().id}
      data-wb-part="toolbar"
      style={style()}
    >
      <div class="workbench-layer-control__selection is-region" aria-hidden="true" />
      <div
        class="workbench-background-region__toolbar"
        data-floe-canvas-interactive="true"
        onPointerDown={stopLayerControlPointer}
        onClick={stopLayerControlClick}
      >
        <For each={WORKBENCH_REGION_FILL_OPTIONS}>
          {(fill) => (
            <button
              type="button"
              aria-label={`Use region color ${fill}`}
              class="workbench-layer-swatch workbench-layer-swatch--region"
              classList={{ 'is-active': item().fill === fill }}
              style={{ background: fill }}
              onPointerDown={stopLayerButtonPointer}
              onClick={(event) => {
                stopLayerButtonClick(event);
                onUpdate()(item().id, { fill });
              }}
            />
          )}
        </For>
        <div
          class="workbench-region-material-group"
          role="group"
          aria-label="Region material"
          onPointerDown={stopLayerControlPointer}
          onClick={stopLayerControlClick}
        >
          <For each={WORKBENCH_BACKGROUND_MATERIALS}>
            {(material) => (
              <button
                type="button"
                aria-label={`Use region material ${BACKGROUND_MATERIAL_LABEL[material]}`}
                title={BACKGROUND_MATERIAL_LABEL[material]}
                class="workbench-region-material"
                classList={{
                  'is-active': item().material === material,
                  [`is-${material}`]: true,
                }}
                onPointerDown={stopLayerButtonPointer}
                onClick={(event) => {
                  stopLayerButtonClick(event);
                  onUpdate()(item().id, { material });
                }}
              >
                <span class="workbench-region-material__sample" aria-hidden="true" />
              </button>
            )}
          </For>
        </div>
        <button
          type="button"
          class="workbench-layer-mini-button"
          onPointerDown={stopLayerButtonPointer}
          onClick={(event) => {
            stopLayerButtonClick(event);
            onUpdate()(item().id, {
              opacity: item().opacity >= 0.88 ? 0.42 : item().opacity + 0.18,
            });
          }}
        >
          {Math.round(item().opacity * 100)}%
        </button>
        <button
          type="button"
          class="workbench-layer-mini-button is-danger"
          aria-label="Delete background region"
          onPointerDown={stopLayerButtonPointer}
          onClick={(event) => {
            stopLayerButtonClick(event);
            onDelete()(item().id);
          }}
        >
          <Trash class="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        type="button"
        class="workbench-layer-resize"
        aria-label="Resize background region"
        data-wb-part="resize"
        onPointerDown={resize.beginResize}
      />
    </div>
  );
}

function WorkbenchRegionVisibilityOutline(props: {
  item: WorkbenchBackgroundLayer;
  selected: boolean;
  viewport: WorkbenchViewport;
  projection?: WorkbenchLayerProjectionMode;
  preview?: WorkbenchLayerGeometryPreview | null;
}) {
  const item = createOwnerSafePropAccessor(() => props.item);
  const viewport = createOwnerSafePropAccessor(() => props.viewport);
  const projection = createOwnerSafePropAccessor(() => props.projection);
  const preview = createOwnerSafePropAccessor(() => props.preview);
  const visualGeometry = createMemo(() => {
    const currentItem = item();
    const currentPreview = readPreviewGeometry(preview(), 'background_layer', currentItem.id);
    return projectLayerGeometry({
      geometry: createLayerWorldGeometry({
        preview: currentPreview,
        position: { x: currentItem.x, y: currentItem.y },
        width: currentItem.width,
        height: currentItem.height,
      }),
      viewport: viewport(),
      projection: projection(),
    });
  });
  const style = createMemo<JSX.CSSProperties>(() => ({
    ...createLayerTransformStyle(visualGeometry()),
    '--workbench-region-outline-scale': `${1 / Math.max(visualGeometry().scale, 0.001)}`,
    ...createRegionRenderVars(item()),
  }));

  return (
    <div
      class="workbench-region-visibility-outline"
      classList={{ 'is-selected-region': props.selected }}
      aria-hidden="true"
      data-wb-plane="overlay"
      data-wb-object-kind="region-outline"
      data-wb-object-id={item().id}
      style={style()}
    />
  );
}

function WorkbenchRegionVisibilityOutlineLayer(props: {
  items: readonly WorkbenchBackgroundLayer[];
  selectedObject: WorkbenchSelection | null;
  viewport: WorkbenchViewport;
  projection?: WorkbenchLayerProjectionMode;
  preview?: WorkbenchLayerGeometryPreview | null;
}) {
  const itemById = createMemo(() => createItemMap(props.items));
  const itemIds = createMemo(() => sortByLayer(props.items).map((item) => item.id));

  return (
    <div class="workbench-region-visibility-outline-layer" aria-hidden="true">
      <For each={itemIds()}>
        {(itemId) => {
          const item = createMemo(() => itemById().get(itemId) ?? null);

          return (
            <Show when={item()}>
              {(entry) => (
                <WorkbenchRegionVisibilityOutline
                  item={entry()}
                  selected={
                    props.selectedObject?.kind === 'background_layer' &&
                    props.selectedObject.id === itemId
                  }
                  viewport={props.viewport}
                  projection={props.projection}
                  preview={props.preview}
                />
              )}
            </Show>
          );
        }}
      </For>
    </div>
  );
}

export function WorkbenchBackgroundLayerView(props: {
  items: readonly WorkbenchBackgroundLayer[];
  selectedObject: WorkbenchSelection | null;
  editable: boolean;
  filtered: boolean;
  projection?: WorkbenchLayerProjectionMode;
  preview?: WorkbenchLayerGeometryPreview | null;
  onPreviewGeometry?: (preview: WorkbenchLayerGeometryPreview | null) => void;
  viewport: WorkbenchViewport;
  onSelect: (layerId: string) => void;
  onContextMenu?: (event: MouseEvent, item: WorkbenchBackgroundLayer) => void;
  onCommitMove: (layerId: string, position: { x: number; y: number }) => void;
}) {
  const itemById = createMemo(() => createItemMap(props.items));
  const itemIds = createMemo(() => sortByLayer(props.items).map((item) => item.id));

  return (
    <div
      class="workbench-background-layer"
      classList={{ 'is-editable': props.editable, 'is-filtered-out': props.filtered }}
    >
      <For each={itemIds()}>
        {(itemId) => {
          const item = createMemo(() => itemById().get(itemId) ?? null);

          return (
            <Show when={item()}>
              {(entry) => (
                <WorkbenchBackgroundRegion
                  item={entry()}
                  selected={props.selectedObject?.kind === 'background_layer' && props.selectedObject.id === itemId}
                  editable={props.editable}
                  viewportScale={props.viewport.scale}
                  viewport={props.viewport}
                  projection={props.projection}
                  preview={props.preview}
                  onPreviewGeometry={props.onPreviewGeometry}
                  onSelect={props.onSelect}
                  onContextMenu={props.onContextMenu}
                  onCommitMove={props.onCommitMove}
                />
              )}
            </Show>
          );
        }}
      </For>
    </div>
  );
}

export function WorkbenchAnnotationLayerView(props: {
  items: readonly WorkbenchAnnotationItem[];
  selectedObject: WorkbenchSelection | null;
  editable: boolean;
  filtered: boolean;
  projection?: WorkbenchLayerProjectionMode;
  preview?: WorkbenchLayerGeometryPreview | null;
  onPreviewGeometry?: (preview: WorkbenchLayerGeometryPreview | null) => void;
  textEditorRegistry?: WorkbenchTextEditorRegistry;
  viewport: WorkbenchViewport;
  onSelect: (annotationId: string) => void;
  onContextMenu?: (event: MouseEvent, item: WorkbenchAnnotationItem) => void;
  onCommitMove: (annotationId: string, position: { x: number; y: number }) => void;
  onUpdate: (
    annotationId: string,
    patch: WorkbenchTextAnnotationPatch,
  ) => void;
}) {
  const itemById = createMemo(() => createItemMap(props.items));
  const itemIds = createMemo(() => sortByLayer(props.items).map((item) => item.id));

  return (
    <div
      class="workbench-annotation-layer"
      classList={{ 'is-editable': props.editable, 'is-filtered-out': props.filtered }}
    >
      <For each={itemIds()}>
        {(itemId) => {
          const item = createMemo(() => itemById().get(itemId) ?? null);

          return (
            <Show when={item()}>
              {(entry) => (
                <WorkbenchTextAnnotation
                  item={entry()}
                  selected={props.selectedObject?.kind === 'annotation' && props.selectedObject.id === itemId}
                  editable={props.editable}
                  viewportScale={props.viewport.scale}
                  viewport={props.viewport}
                  projection={props.projection}
                  preview={props.preview}
                  onPreviewGeometry={props.onPreviewGeometry}
                  textEditorRegistry={props.textEditorRegistry}
                  onSelect={props.onSelect}
                  onContextMenu={props.onContextMenu}
                  onCommitMove={props.onCommitMove}
                  onUpdate={props.onUpdate}
                />
              )}
            </Show>
          );
        }}
      </For>
    </div>
  );
}

export function WorkbenchLayerControlOverlayView(props: {
  annotations: readonly WorkbenchAnnotationItem[];
  backgroundLayers: readonly WorkbenchBackgroundLayer[];
  selectedObject: WorkbenchSelection | null;
  editable: boolean;
  showRegionOutlines?: boolean;
  projection?: WorkbenchLayerProjectionMode;
  viewport: WorkbenchViewport;
  preview?: WorkbenchLayerGeometryPreview | null;
  onPreviewGeometry?: (preview: WorkbenchLayerGeometryPreview | null) => void;
  textEditorRegistry?: WorkbenchTextEditorRegistry;
  onCommitAnnotationMove: (annotationId: string, position: { x: number; y: number }) => void;
  onCommitAnnotationResize: (annotationId: string, size: { width: number; height: number }) => void;
  onUpdateTextAnnotation: (
    annotationId: string,
    patch: WorkbenchTextAnnotationPatch,
  ) => void;
  onDeleteAnnotation: (annotationId: string) => void;
  onCommitBackgroundResize: (layerId: string, size: { width: number; height: number }) => void;
  onUpdateBackgroundLayer: (
    layerId: string,
    patch: Partial<Pick<WorkbenchBackgroundLayer, 'fill' | 'opacity' | 'material' | 'name'>>,
  ) => void;
  onDeleteBackgroundLayer: (layerId: string) => void;
}) {
  const selectedText = createMemo(() =>
    props.selectedObject?.kind === 'annotation'
      ? props.annotations.find((item) => item.id === props.selectedObject?.id && item.kind === 'text') ?? null
      : null
  );
  const selectedRegion = createMemo(() =>
    props.selectedObject?.kind === 'background_layer'
      ? props.backgroundLayers.find((item) => item.id === props.selectedObject?.id) ?? null
      : null
  );

  return (
    <div
      class="workbench-control-overlay-layer"
      classList={{ 'is-editable': props.editable }}
      data-wb-plane="overlay"
    >
      <Show when={props.showRegionOutlines}>
        <WorkbenchRegionVisibilityOutlineLayer
          items={props.backgroundLayers}
          selectedObject={props.selectedObject}
          viewport={props.viewport}
          projection={props.projection}
          preview={props.preview}
        />
      </Show>
      <Show when={props.editable && selectedRegion()}>
        {(item) => (
          <WorkbenchBackgroundRegionControls
            item={item()}
            viewportScale={props.viewport.scale}
            viewport={props.viewport}
            projection={props.projection}
            preview={props.preview}
            onPreviewGeometry={props.onPreviewGeometry}
            onCommitResize={props.onCommitBackgroundResize}
            onUpdate={props.onUpdateBackgroundLayer}
            onDelete={props.onDeleteBackgroundLayer}
          />
        )}
      </Show>
      <Show when={props.editable && selectedText()}>
        {(item) => (
          <WorkbenchTextAnnotationControls
            item={item()}
            viewportScale={props.viewport.scale}
            viewport={props.viewport}
            projection={props.projection}
            preview={props.preview}
            onPreviewGeometry={props.onPreviewGeometry}
            textEditorRegistry={props.textEditorRegistry}
            onCommitMove={props.onCommitAnnotationMove}
            onCommitResize={props.onCommitAnnotationResize}
            onUpdate={props.onUpdateTextAnnotation}
            onDelete={props.onDeleteAnnotation}
          />
        )}
      </Show>
    </div>
  );
}
