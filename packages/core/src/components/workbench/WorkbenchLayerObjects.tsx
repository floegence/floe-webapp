import { CANVAS_WHEEL_INTERACTIVE_ATTR } from '../ui/localInteractionSurface';
import {
  CompositionToolbar,
  CompositionDivider,
  CompositionIcon,
} from './WorkbenchCompositionToolbar';
import {
  WorkbenchCompositionActionsContext,
  useWorkbenchCompositionText,
} from './workbenchCompositionMessages';
import { SurfaceAnchoredLayer } from '../ui/SurfaceAnchoredLayer';
import {
  For,
  Show,
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
  useContext,
  type Accessor,
  type JSX,
} from 'solid-js';
import { Check, ChevronDown, GripVertical, Minus, Plus } from '../../icons';
import { startHotInteraction } from '../../utils/hotInteraction';
import { startPointerSession, type PointerSessionController } from '../ui/pointerSession';
import type {
  WorkbenchAnnotationItem,
  WorkbenchBackgroundLayer,
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
  WORKBENCH_REGION_COLOR_OPTIONS,
  WORKBENCH_STICKY_NOTE_COLORS,
  WORKBENCH_DEFAULT_TEXT_COLOR,
  WORKBENCH_TEXT_COLOR_OPTIONS,
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
  blur: () => void;
  isFocused: Accessor<boolean>;
  insertTextAtSelection: (text: string) => void;
  readText: () => string;
}

export interface WorkbenchTextEditorRegistry {
  register: (annotationId: string, handle: WorkbenchTextEditorHandle) => () => void;
  get: (annotationId: string) => WorkbenchTextEditorHandle | undefined;
}

export function createWorkbenchTextEditorRegistry(): WorkbenchTextEditorRegistry {
  const handles = new Map<string, WorkbenchTextEditorHandle>();
  const [revision, setRevision] = createSignal(0);
  return {
    register(annotationId, handle) {
      handles.set(annotationId, handle);
      setRevision((value) => value + 1);
      return () => {
        if (handles.get(annotationId) === handle) {
          handles.delete(annotationId);
          setRevision((value) => value + 1);
        }
      };
    },
    get(annotationId) {
      revision();
      return handles.get(annotationId);
    },
  };
}

function sortByLayer<T extends { id: string; z_index: number; created_at_unix_ms: number }>(
  items: readonly T[]
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
  close: () => void
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

function useCanvasTextEditor(args: {
  value: Accessor<string>;
  onCommit: (value: string) => void;
  singleLine?: boolean;
}) {
  const [element, setElement] = createSignal<HTMLDivElement>();
  const [isComposing, setIsComposing] = createSignal(false);
  const [isFocused, setIsFocused] = createSignal(false);

  let lastRange: Range | undefined;
  const readText = () => element()?.textContent ?? '';
  const bind = (node: HTMLDivElement) => setElement(node);
  const commitCurrentText = (node: HTMLDivElement) => {
    const nextValue = args.singleLine ? (node.textContent ?? '').trim() : (node.innerHTML ?? '');
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
    if (args.singleLine) node.textContent = nextValue;
    else node.innerHTML = nextValue;
  });

  createEffect(() => {
    const node = element();
    if (!node || !isFocused()) return;
    const finishOutside = (event: PointerEvent) => {
      if (event.composedPath().includes(node)) return;
      // Canvas gestures may prevent native focus transfer. Save before selection or dragging runs.
      node.blur();
    };
    const document = node.ownerDocument;
    document.addEventListener('pointerdown', finishOutside, true);
    onCleanup(() => document.removeEventListener('pointerdown', finishOutside, true));
  });

  const handleFocus: JSX.EventHandler<HTMLDivElement, FocusEvent> = () => {
    setIsFocused(true);
  };
  const handleBlur: JSX.EventHandler<HTMLDivElement, FocusEvent> = (event) => {
    const selection = document.getSelection();
    if (selectionBelongsToNode(selection, event.currentTarget))
      lastRange = selection.getRangeAt(0).cloneRange();
    if (!isComposing()) commitCurrentText(event.currentTarget);
    setIsFocused(false);
  };
  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    event.stopPropagation();
    if (isComposing() || event.isComposing || event.keyCode === 229) return;
    const mod = event.ctrlKey || event.metaKey;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === 'Enter' && (mod || args.singleLine)) {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (mod && event.key === 'b') {
      event.preventDefault();
      document.execCommand('bold', false);
    } else if (mod && event.key === 'i') {
      event.preventDefault();
      document.execCommand('italic', false);
    }
  };
  const handleCompositionStart: JSX.EventHandler<HTMLDivElement, CompositionEvent> = () => {
    setIsComposing(true);
  };
  const handleCompositionEnd: JSX.EventHandler<HTMLDivElement, CompositionEvent> = (event) => {
    if (document.activeElement !== event.currentTarget) commitCurrentText(event.currentTarget);
    setIsComposing(false);
  };
  const focus = () => {
    setIsFocused(true);
    element()?.focus({ preventScroll: true });
  };
  const insertTextAtSelection = (text: string): void => {
    const node = element();
    if (!node) return;
    const selection = document.getSelection();
    const currentRange = selectionBelongsToNode(selection, node)
      ? selection.getRangeAt(0).cloneRange()
      : undefined;
    const savedRange =
      lastRange && node.contains(lastRange.commonAncestorContainer) ? lastRange : undefined;
    const range = currentRange ?? savedRange?.cloneRange() ?? document.createRange();
    focus();
    if (!currentRange && !savedRange) {
      range.selectNodeContents(node);
      range.collapse(false);
    }

    selection?.removeAllRanges();
    selection?.addRange(range);
    // Native insertion participates in the same undo history as typed text.
    if (document.execCommand?.('insertText', false, text)) return;
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  return {
    bind,
    blur: () => element()?.blur(),
    isFocused,
    readText,
    focus,
    insertTextAtSelection,
    handleFocus,
    handleBlur,
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

function createRegionRenderVars(item: WorkbenchBackgroundLayer): JSX.CSSProperties {
  const palette = WORKBENCH_REGION_COLOR_OPTIONS.find((option) => option.fill === item.fill);
  return {
    '--workbench-region-fill': item.fill,
    '--region-hue': `${palette?.hue ?? 0}`,
    // Legacy and host-supplied fills retain their own hue through the same material renderer.
    ...(!palette
      ? {
          '--region-face': 'oklch(from var(--workbench-region-fill) var(--region-lightness) c h)',
          '--region-edge':
            'oklch(from var(--region-face) calc(l + var(--region-edge-delta)) min(.032,c) h)',
          '--region-outline':
            'oklch(from var(--workbench-region-fill) var(--region-outline-lightness) c h)',
        }
      : {}),
    ...(palette?.color === 'graphite'
      ? { '--region-chroma': '.009', '--region-outline-chroma': '.012' }
      : {}),
    '--workbench-region-strength': `${Math.round(clampRegionOpacity(item.opacity) * 100)}%`,
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
  id: string
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

function createLayerTransformStyle(
  geometry: WorkbenchLayerVisualGeometry
): Pick<JSX.CSSProperties, 'width' | 'height' | 'transform'> {
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
  const committedGeometry = createOwnerSafePropAccessor(
    () => args.readGeometry?.() ?? { width: 0, height: 0 }
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
                current.startWidth + (nextEvent.clientX - current.startClientX) / current.scale
              ),
              height: Math.max(
                args.minHeight,
                current.startHeight + (nextEvent.clientY - current.startClientY) / current.scale
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

function StickyNotePreview(props: { color: WorkbenchStickyNoteColor; material: string }) {
  return (
    <span
      class="workbench-note-preview"
      data-note-color={props.color}
      data-note-material={props.material}
    >
      <span class="workbench-preview-writing" />
    </span>
  );
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
  visualFront?: boolean;
  onSelect: (noteId: string) => void;
  onContextMenu?: (event: MouseEvent, item: WorkbenchStickyNoteItem) => void;
  onClaimVisualFrontOwner?: (noteId: string) => void;
  onCommitFront?: (noteId: string) => void;
  onCommitMove: (noteId: string, position: { x: number; y: number }) => void;
  onCommitResize: (noteId: string, size: { width: number; height: number }) => void;
  onUpdate: (
    noteId: string,
    patch: Partial<Pick<WorkbenchStickyNoteItem, 'title' | 'body' | 'color' | 'material'>>
  ) => void;
  onDelete: (noteId: string) => void;
  onLayoutInteractionStart?: () => void;
  onLayoutInteractionEnd?: () => void;
}) {
  const t = useWorkbenchCompositionText();
  const [anchor, setAnchor] = createSignal<HTMLElement>();
  const item = createOwnerSafePropAccessor(() => props.item);
  const selected = createOwnerSafePropAccessor(() => props.selected);
  const viewportScale = createOwnerSafePropAccessor(() => props.viewportScale);
  const projectedViewport = createOwnerSafePropAccessor(() => props.projectedViewport);
  const surfaceReady = createOwnerSafePropAccessor(() => props.surfaceReady ?? true);
  const renderLayer = createOwnerSafePropAccessor(() => props.renderLayer);
  const topRenderLayer = createOwnerSafePropAccessor(() => props.topRenderLayer);
  const locked = createOwnerSafePropAccessor(() => props.locked);
  const filtered = createOwnerSafePropAccessor(() => props.filtered);
  const visualFront = createOwnerSafePropAccessor(() => props.visualFront ?? false);
  const onSelect = createOwnerSafePropAccessor(() => props.onSelect);
  const onContextMenu = createOwnerSafePropAccessor(() => props.onContextMenu);
  const onClaimVisualFrontOwner = createOwnerSafePropAccessor(() => props.onClaimVisualFrontOwner);
  const onCommitFront = createOwnerSafePropAccessor(() => props.onCommitFront);
  const onCommitMove = createOwnerSafePropAccessor(() => props.onCommitMove);
  const onCommitResize = createOwnerSafePropAccessor(() => props.onCommitResize);
  const onUpdate = createOwnerSafePropAccessor(() => props.onUpdate);
  const onDelete = createOwnerSafePropAccessor(() => props.onDelete);
  const onLayoutInteractionStart = createOwnerSafePropAccessor(
    () => props.onLayoutInteractionStart
  );
  const onLayoutInteractionEnd = createOwnerSafePropAccessor(() => props.onLayoutInteractionEnd);
  const bodyEditor = useCanvasTextEditor({
    value: () => item().body,
    onCommit: (body) => onUpdate()(item().id, { body }),
  });
  const titleEditor = useCanvasTextEditor({
    value: () => item().title ?? '',
    onCommit: (title) => onUpdate()(item().id, { title }),
  });
  createEffect(() => {
    if (!locked()) return;
    titleEditor.blur();
    bodyEditor.blur();
  });
  const [emojiField, setEmojiField] = createSignal<'title' | 'body'>('body');
  const actions = useContext(WorkbenchCompositionActionsContext);
  const editing = () => titleEditor.isFocused() || bodyEditor.isFocused();
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
    onClaimVisualFrontOwner()?.(currentItem.id);
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
    () => surfaceMetrics()?.rect.viewportScale ?? Math.max(viewportScale(), 0.001)
  );
  const style = createMemo<JSX.CSSProperties>(() => ({
    '--workbench-layer-control-inverse-scale': `${1 / projectedScale()}`,
    width: `${liveSize().width}px`,
    height: `${liveSize().height}px`,
    transform: projectedViewport()
      ? `translate(${surfaceMetrics()?.rect.screenX ?? 0}px, ${surfaceMetrics()?.rect.screenY ?? 0}px) scale(${projectedScale()})`
      : `translate(${livePosition().x}px, ${livePosition().y}px)`,
    'transform-origin': '0 0',
    'z-index': `${
      selected() || visualFront() || drag.isDragging() || resize.isResizing()
        ? topRenderLayer() + 1
        : renderLayer()
    }`,
  }));

  return (
    <article
      ref={setAnchor}
      class="workbench-sticky"
      classList={{
        'is-selected': selected(),
        'is-locked': locked(),
        'is-filtered-out': filtered(),
        'is-dragging': drag.isDragging(),
        'is-resizing': resize.isResizing(),
        'is-copied': copied(),
        'is-editing': editing(),
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
      <div
        class="workbench-sticky__surface"
        data-floe-input-surface="true"
        data-note-color={item().color}
        data-note-material={item().material ?? 'tint'}
      >
        <button
          type="button"
          class="workbench-sticky__grip"
          aria-label={t('dragSticky')}
          data-floe-workbench-sticky-local="true"
          data-wb-part="move"
          disabled={locked()}
          onPointerDown={(event) => {
            if (locked()) return;
            const currentItem = item();
            onSelect()(currentItem.id);
            onClaimVisualFrontOwner()?.(currentItem.id);
            drag.beginDrag(event);
          }}
        >
          <GripVertical class="w-3.5 h-3.5" />
        </button>

        <div
          class="workbench-sticky__content"
          {...{ [CANVAS_WHEEL_INTERACTIVE_ATTR]: selected() ? 'true' : undefined }}
        >
          <Show when={item().title !== undefined}>
            <div
              ref={titleEditor.bind}
              class="workbench-sticky__title"
              contentEditable={locked() ? false : true}
              role="textbox"
              aria-label={t('stickyTitle')}
              aria-multiline="true"
              spellcheck={false}
              data-floe-workbench-text-selection-surface="true"
              data-floe-workbench-sticky-local="true"
              data-wb-text-editor="plain"
              data-wb-part="content"
              data-placeholder={t('textPlaceholder')}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect()(item().id);
              }}
              onFocus={(event) => {
                setEmojiField('title');
                titleEditor.handleFocus(event);
              }}
              onBlur={titleEditor.handleBlur}
              onKeyDown={titleEditor.handleKeyDown}
              onCompositionStart={titleEditor.handleCompositionStart}
              onCompositionEnd={titleEditor.handleCompositionEnd}
            />
          </Show>
          <div
            ref={bodyEditor.bind}
            class="workbench-sticky__body"
            data-placeholder={t('textPlaceholder')}
            contentEditable={locked() ? false : true}
            role="textbox"
            aria-multiline="true"
            aria-disabled={locked() ? 'true' : undefined}
            aria-label={t('stickyBody')}
            spellcheck={false}
            data-floe-workbench-text-selection-surface="true"
            data-wb-text-editor="plain"
            data-floe-workbench-sticky-local="true"
            data-wb-part="content"
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelect()(item().id);
            }}
            onFocus={(event) => {
              setEmojiField('body');
              bodyEditor.handleFocus(event);
            }}
            onBlur={bodyEditor.handleBlur}
            onKeyDown={bodyEditor.handleKeyDown}
            onCompositionStart={bodyEditor.handleCompositionStart}
            onCompositionEnd={bodyEditor.handleCompositionEnd}
          />
        </div>
      </div>
      <Show when={selected() && !locked()}>
        <SurfaceAnchoredLayer
          reservedSpace={{ top: 64, narrowTop: 106, bottom: 86 }}
          anchor={anchor()}
          revision={style()}
          class="workbench-object-tools"
        >
          <CompositionToolbar
            kind="sticky"
            onInsertEmoji={(emoji) =>
              (emojiField() === 'title' && item().title !== undefined
                ? titleEditor
                : bodyEditor
              ).insertTextAtSelection(emoji)
            }
            materials={['tint', 'tab', 'ruled']}
            material={item().material ?? 'tint'}
            materialLabel={(material) => t('useStickyMaterial', t(material))}
            preview={(material) => <StickyNotePreview color={item().color} material={material} />}
            onMaterial={(material) =>
              onUpdate()(item().id, { material: material as WorkbenchStickyNoteItem['material'] })
            }
            palette={
              <div class="workbench-color-options">
                <For each={WORKBENCH_STICKY_NOTE_COLORS}>
                  {(color) => (
                    <button
                      type="button"
                      class="workbench-style-choice"
                      aria-label={t('stickyColor', t(color))}
                      aria-pressed={item().color === color}
                      onPointerDown={stopLayerButtonPointer}
                      onClick={() => onUpdate()(item().id, { color })}
                    >
                      <StickyNotePreview color={color} material={item().material ?? 'tint'} />
                      <Check />
                    </button>
                  )}
                </For>
              </div>
            }
            actions={
              <>
                <Show
                  when={actions}
                  fallback={
                    <button
                      type="button"
                      aria-label={t('copySticky')}
                      onPointerDown={stopLayerButtonPointer}
                      classList={{ 'is-success': copied() }}
                      onClick={copyStickyBody}
                    >
                      <CompositionIcon name="copy" />
                    </button>
                  }
                >
                  <button
                    type="button"
                    aria-label={t('duplicate')}
                    title={t('duplicate')}
                    onPointerDown={stopLayerButtonPointer}
                    onClick={() => actions?.duplicate({ kind: 'sticky_note', id: item().id })}
                  >
                    <CompositionIcon name="copy" />
                  </button>
                </Show>
                <button
                  type="button"
                  class="is-danger"
                  aria-label={t('deleteSticky')}
                  title={t('deleteSticky')}
                  onPointerDown={stopLayerButtonPointer}
                  onClick={() => onDelete()(item().id)}
                >
                  <CompositionIcon name="trash" />
                </button>
              </>
            }
          />
        </SurfaceAnchoredLayer>
      </Show>
      <Show when={selected()}>
        <div class="workbench-composition-selection" aria-hidden="true" />
      </Show>
      <Show when={!locked()}>
        <button
          type="button"
          class="workbench-layer-resize workbench-sticky__resize"
          aria-label={t('resizeSticky')}
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
  onUpdate: (annotationId: string, patch: WorkbenchTextAnnotationPatch) => void;
}) {
  const t = useWorkbenchCompositionText();
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
  const textEditor = useCanvasTextEditor({
    value: () => item().text,
    onCommit: (text) => onUpdate()(item().id, { text }),
  });
  createEffect(() => {
    const registry = textEditorRegistry();
    if (!registry) return;
    const unregister = registry.register(item().id, {
      focus: textEditor.focus,
      blur: textEditor.blur,
      isFocused: textEditor.isFocused,
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
    onPreviewMove: (geometry) =>
      onPreviewGeometry()?.({
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
    ...(item().color === WORKBENCH_DEFAULT_TEXT_COLOR
      ? {
          '--workbench-text-ink':
            item().font_size < 16
              ? 'color-mix(in oklab,var(--workbench-canvas-ink) 95%,var(--wb-canvas))'
              : 'var(--workbench-canvas-ink)',
        }
      : {}),
    '--workbench-text-size': `${item().font_size}px`,
    '--workbench-text-line-height':
      item().font_size >= 24 ? '1.35' : item().font_size >= 16 ? '1.8' : '1.7',
    '--workbench-text-letter-spacing':
      item().font_size >= 40
        ? '-1.2px'
        : item().font_size >= 24
          ? '-.65px'
          : item().font_size >= 16
            ? '0'
            : '.1px',
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
      event.target.closest('.workbench-text-annotation__content')
    ) {
      return;
    }
    event.stopPropagation();
    onSelect()(item().id);
  };

  return (
    <article
      class="workbench-text-annotation"
      data-floe-input-surface="true"
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
        aria-label={t('textContent')}
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
        onKeyDown={textEditor.handleKeyDown}
        onBlur={textEditor.handleBlur}
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
  textEditorRegistry?: WorkbenchTextEditorRegistry;
  onUpdate?: (layerId: string, patch: { name: string }) => void;
  onSelect: (layerId: string) => void;
  onContextMenu?: (event: MouseEvent, item: WorkbenchBackgroundLayer) => void;
  onCommitMove: (layerId: string, position: { x: number; y: number }) => void;
}) {
  const t = useWorkbenchCompositionText();
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
  const nameEditor = useCanvasTextEditor({
    value: () => item().name,
    singleLine: true,
    onCommit: (name) => props.onUpdate?.(item().id, { name }),
  });
  createEffect(() => {
    const unregister = props.textEditorRegistry?.register(item().id, nameEditor);
    onCleanup(() => unregister?.());
  });
  const drag = useLayerDrag({
    viewportScale,
    readPosition: () => ({ x: item().x, y: item().y }),
    readGeometry: () => ({ width: item().width, height: item().height }),
    onCommitMove: (position) => onCommitMove()(item().id, position),
    onPreviewMove: (geometry) =>
      onPreviewGeometry()?.({
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
  const contentScale = createMemo(() =>
    projection() === 'screen' ? Math.max(viewport().scale, 0.001) : 1
  );
  const style = createMemo<JSX.CSSProperties>(() => ({
    ...createLayerTransformStyle(visualGeometry()),
    'z-index': `${item().z_index}`,
    '--workbench-layer-control-inverse-scale': `${1 / visualGeometry().scale}`,
    '--workbench-region-content-scale': `${contentScale()}`,
    '--workbench-region-content-inverse-scale': `${1 / contentScale()}`,
    ...createRegionRenderVars(item()),
  }));
  const handleRegionPointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (!editable() || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest(
        '.workbench-background-region__label, .workbench-background-region__toolbar, .workbench-layer-resize'
      )
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
        'is-editing': nameEditor.isFocused(),
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
    >
      <div
        class="workbench-background-region__label"
        classList={{ 'is-empty': !item().name.trim() && !nameEditor.isFocused() }}
        data-floe-input-surface="true"
      >
        <div
          ref={nameEditor.bind}
          contentEditable={editable() ? 'plaintext-only' : false}
          role="textbox"
          aria-label={t('regionName')}
          data-placeholder={t('regionPlaceholder')}
          data-floe-workbench-text-selection-surface="true"
          onPointerDown={(event) => {
            event.stopPropagation();
            onSelect()(item().id);
          }}
          onFocus={nameEditor.handleFocus}
          onBlur={nameEditor.handleBlur}
          onKeyDown={nameEditor.handleKeyDown}
          onCompositionStart={nameEditor.handleCompositionStart}
          onCompositionEnd={nameEditor.handleCompositionEnd}
        />
      </div>
      <button
        type="button"
        class="workbench-region-grip"
        aria-label={t('moveRegion')}
        onPointerDown={handleRegionPointerDown}
      >
        <GripVertical />
      </button>
    </article>
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
  onUpdate: (annotationId: string, patch: WorkbenchTextAnnotationPatch) => void;
  onDelete: (annotationId: string) => void;
}) {
  const t = useWorkbenchCompositionText();
  const actions = useContext(WorkbenchCompositionActionsContext);

  const [anchor, setAnchor] = createSignal<HTMLElement>();
  const item = createOwnerSafePropAccessor(() => props.item);
  const editor = () => props.textEditorRegistry?.get(item().id);
  const viewportScale = createOwnerSafePropAccessor(() => props.viewportScale);
  const viewport = createOwnerSafePropAccessor(() => props.viewport ?? { x: 0, y: 0, scale: 1 });
  const projection = createOwnerSafePropAccessor(() => props.projection);
  const preview = createOwnerSafePropAccessor(() => props.preview);
  const onPreviewGeometry = createOwnerSafePropAccessor(() => props.onPreviewGeometry);
  const onCommitMove = createOwnerSafePropAccessor(() => props.onCommitMove);
  const onCommitResize = createOwnerSafePropAccessor(() => props.onCommitResize);
  const onUpdate = createOwnerSafePropAccessor(() => props.onUpdate);
  const onDelete = createOwnerSafePropAccessor(() => props.onDelete);
  let sizeInputEl: HTMLInputElement | undefined;
  let fontPickerEl: HTMLDivElement | undefined;
  const [advancedOpen, setAdvancedOpen] = createSignal(false);
  const [fontSizeDraft, setFontSizeDraft] = createSignal('');
  const [fontPickerOpen, setFontPickerOpen] = createSignal(false);
  const activeFont = createMemo(
    () =>
      WORKBENCH_TEXT_FONT_OPTIONS.find((font) => font.fontFamily === item().font_family) ??
      WORKBENCH_TEXT_FONT_OPTIONS[0]!
  );
  const move = useLayerDrag({
    viewportScale,
    readPosition: () => ({ x: item().x, y: item().y }),
    readGeometry: () => ({ width: item().width, height: item().height }),
    onCommitMove: (position) => onCommitMove()(item().id, position),
    onPreviewMove: (geometry) =>
      onPreviewGeometry()?.({
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
    onPreviewResize: (size) =>
      onPreviewGeometry()?.({
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
    () => setFontPickerOpen(false)
  );

  return (
    <div
      ref={setAnchor}
      class="workbench-layer-control workbench-layer-control--text"
      data-floe-canvas-interactive="true"
      data-wb-plane="overlay"
      data-wb-object-kind="text"
      data-wb-object-id={item().id}
      data-wb-part="toolbar"
      style={style()}
    >
      <div class="workbench-layer-control__selection is-text" aria-hidden="true" />
      <button
        type="button"
        class="workbench-text-move"
        data-wb-part="move"
        aria-label={t('moveText')}
        onPointerDown={move.beginDrag}
      >
        <GripVertical />
      </button>
      <SurfaceAnchoredLayer
        reservedSpace={{ top: 64, narrowTop: 106, bottom: 86 }}
        anchor={anchor()}
        revision={style()}
        class="workbench-object-tools"
      >
        <CompositionToolbar
          kind="text"
          onInsertEmoji={(emoji) => editor()?.insertTextAtSelection(emoji)}
          moreOpen={advancedOpen()}
          onMoreClose={() => setAdvancedOpen(false)}
          more={() => (
            <>
              <div
                ref={fontPickerEl}
                class="workbench-text-font-picker"
                data-floe-canvas-interactive="true"
                onPointerDown={stopLayerControlPointer}
                onClick={stopLayerControlClick}
              >
                <button
                  type="button"
                  aria-label={t('chooseFont')}
                  aria-haspopup="menu"
                  aria-expanded={fontPickerOpen()}
                  title={t('chooseFont')}
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
                  <span class="workbench-text-font-trigger__label">{t(activeFont().id)}</span>
                  <ChevronDown class="workbench-text-font-trigger__icon" />
                </button>
                <Show when={fontPickerOpen()}>
                  <div class="workbench-text-font-popover" role="menu" aria-label={t('boldFont')}>
                    <For each={WORKBENCH_TEXT_FONT_OPTIONS}>
                      {(font) => (
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={item().font_family === font.fontFamily}
                          aria-label={t('useFont', t(font.id))}
                          title={t('fontPreview', t(font.id))}
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
                          <span class="workbench-text-font-option__label">{t(font.id)}</span>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
              <div
                class="workbench-text-size-stepper"
                role="group"
                aria-label={t('textSize')}
                onPointerDown={stopLayerControlPointer}
                onClick={stopLayerControlClick}
              >
                <button
                  type="button"
                  aria-label={t('decreaseSize')}
                  title={t('decreaseSize')}
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
                  aria-label={t('sizeValue')}
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
                  aria-label={t('increaseSize')}
                  title={t('increaseSize')}
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
                    aria-label={t('textColor', color)}
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
              <button
                type="button"
                onPointerDown={stopLayerButtonPointer}
                onClick={() => onUpdate()(item().id, { align: nextAlign() })}
              >
                {t(item().align)}
              </button>
            </>
          )}
          actions={
            <>
              <Show when={actions}>
                <button
                  type="button"
                  aria-label={t('duplicate')}
                  title={t('duplicate')}
                  onPointerDown={stopLayerButtonPointer}
                  onClick={() => actions?.duplicate({ kind: 'annotation', id: item().id })}
                >
                  <CompositionIcon name="copy" />
                </button>
              </Show>
              <button
                type="button"
                class="is-danger"
                aria-label={t('deleteText')}
                onPointerDown={stopLayerButtonPointer}
                onClick={() => onDelete()(item().id)}
              >
                <CompositionIcon name="trash" />
              </button>
            </>
          }
        >
          <select
            aria-label={t('typography')}
            value={
              item().font_size >= 40
                ? 'title'
                : item().font_size >= 24
                  ? 'heading'
                  : item().font_size >= 16
                    ? 'body'
                    : 'caption'
            }
            onChange={(event) => {
              if (event.currentTarget.value === 'more') {
                setAdvancedOpen(!advancedOpen());
                return;
              }
              const sizes = { title: 48, heading: 30, body: 18, caption: 14 };
              const level = event.currentTarget.value as keyof typeof sizes;
              onUpdate()(item().id, {
                font_size: sizes[level],
                font_weight: level === 'title' || level === 'heading' ? 560 : 400,
              });
            }}
          >
            <For each={['title', 'heading', 'body', 'caption'] as const}>
              {(level) => <option value={level}>{t(level)}</option>}
            </For>
            <option value="more">{t('more')}</option>
          </select>
          <For each={['left', 'center'] as const}>
            {(align) => (
              <button
                type="button"
                aria-label={t(align)}
                aria-pressed={item().align === align}
                onPointerDown={stopLayerButtonPointer}
                onClick={() => onUpdate()(item().id, { align })}
              >
                <CompositionIcon name={align} />
              </button>
            )}
          </For>
          <CompositionDivider />
        </CompositionToolbar>
      </SurfaceAnchoredLayer>
      <button
        type="button"
        class="workbench-layer-resize"
        aria-label={t('resizeText')}
        data-wb-part="resize"
        onPointerDown={resize.beginResize}
      />
    </div>
  );
}

function WorkbenchBackgroundRegionControls(props: {
  item: WorkbenchBackgroundLayer;
  textEditorRegistry?: WorkbenchTextEditorRegistry;
  viewportScale: number;
  viewport?: WorkbenchViewport;
  projection?: WorkbenchLayerProjectionMode;
  preview?: WorkbenchLayerGeometryPreview | null;
  onPreviewGeometry?: (preview: WorkbenchLayerGeometryPreview | null) => void;
  onCommitResize: (layerId: string, size: { width: number; height: number }) => void;
  onUpdate: (
    layerId: string,
    patch: Partial<Pick<WorkbenchBackgroundLayer, 'fill' | 'opacity' | 'material' | 'name'>>
  ) => void;
  onDelete: (layerId: string) => void;
}) {
  const t = useWorkbenchCompositionText();
  const actions = useContext(WorkbenchCompositionActionsContext);

  const [anchor, setAnchor] = createSignal<HTMLElement>();
  const item = createOwnerSafePropAccessor(() => props.item);
  const editor = () => props.textEditorRegistry?.get(item().id);
  const editing = () => editor()?.isFocused() ?? false;
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
    onPreviewResize: (size) =>
      onPreviewGeometry()?.({
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
      ref={setAnchor}
      class="workbench-layer-control workbench-layer-control--region"
      data-floe-canvas-interactive="true"
      data-wb-plane="overlay"
      data-wb-object-kind="region"
      data-wb-object-id={item().id}
      data-wb-part="toolbar"
      style={style()}
    >
      <div class="workbench-layer-control__selection is-region" aria-hidden="true" />
      <SurfaceAnchoredLayer
        reservedSpace={{ top: 64, narrowTop: 106, bottom: 86 }}
        anchor={anchor()}
        revision={style()}
        topOffset={item().name.trim() || editing() ? 34 * viewport().scale : 0}
        class="workbench-object-tools"
      >
        <CompositionToolbar
          kind="region"
          onInsertEmoji={(emoji) => editor()?.insertTextAtSelection(emoji)}
          materials={WORKBENCH_BACKGROUND_MATERIALS}
          material={item().material}
          materialLabel={(material) => t('useRegionMaterial', t(material))}
          preview={(material) => (
            <span class="workbench-region-preview-mat">
              <span
                class={`workbench-region-material__sample is-material-${material}`}
                style={createRegionRenderVars(item())}
              />
            </span>
          )}
          onMaterial={(material) =>
            onUpdate()(item().id, { material: material as WorkbenchBackgroundLayer['material'] })
          }
          palette={
            <div class="workbench-color-options">
              <For each={WORKBENCH_REGION_COLOR_OPTIONS}>
                {(color) => (
                  <button
                    type="button"
                    class="workbench-style-choice"
                    aria-label={t('regionColor', t(color.color))}
                    aria-pressed={item().fill === color.fill}
                    onPointerDown={stopLayerButtonPointer}
                    onClick={() => onUpdate()(item().id, { fill: color.fill })}
                  >
                    <span class="workbench-region-preview-mat">
                      <span
                        class={`workbench-region-material__sample is-material-${item().material}`}
                        style={createRegionRenderVars({ ...item(), fill: color.fill })}
                      />
                    </span>
                    <Check />
                  </button>
                )}
              </For>
            </div>
          }
          more={(closeMenu) => (
            <>
              <label>
                {t('opacity')}
                <input
                  type="range"
                  aria-label={t('opacity')}
                  min="8"
                  max="100"
                  value={Math.round(item().opacity * 100)}
                  onInput={(event) =>
                    onUpdate()(item().id, { opacity: Number(event.currentTarget.value) / 100 })
                  }
                />
              </label>
              <button
                type="button"
                disabled={!item().name.trim()}
                onPointerDown={stopLayerButtonPointer}
                onClick={() => {
                  closeMenu();
                  onUpdate()(item().id, { name: '' });
                }}
              >
                {t('clearName')}
              </button>
            </>
          )}
          actions={
            <>
              <Show when={actions}>
                <button
                  type="button"
                  aria-label={t('duplicate')}
                  title={t('duplicate')}
                  onPointerDown={stopLayerButtonPointer}
                  onClick={() => actions?.duplicate({ kind: 'background_layer', id: item().id })}
                >
                  <CompositionIcon name="copy" />
                </button>
              </Show>
              <button
                type="button"
                class="is-danger"
                aria-label={t('deleteRegion')}
                onPointerDown={stopLayerButtonPointer}
                onClick={() => onDelete()(item().id)}
              >
                <CompositionIcon name="trash" />
              </button>
            </>
          }
        >
          <button
            type="button"
            class="workbench-name-trigger"
            onPointerDown={stopLayerButtonPointer}
            onClick={() => editor()?.focus()}
          >
            <CompositionIcon name="text" />
            <span>{t(item().name.trim() ? 'regionName' : 'addName')}</span>
          </button>
        </CompositionToolbar>
      </SurfaceAnchoredLayer>
      <button
        type="button"
        class="workbench-layer-resize"
        aria-label={t('resizeRegion')}
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
    '--workbench-layer-control-inverse-scale': `${1 / Math.max(visualGeometry().scale, 0.001)}`,
    ...createRegionRenderVars(item()),
  }));

  return (
    <div
      class={`workbench-region-visibility-outline is-material-${item().material}`}
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
  textEditorRegistry?: WorkbenchTextEditorRegistry;
  onUpdate?: (layerId: string, patch: { name: string }) => void;
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
                  selected={
                    props.selectedObject?.kind === 'background_layer' &&
                    props.selectedObject.id === itemId
                  }
                  editable={props.editable}
                  viewportScale={props.viewport.scale}
                  viewport={props.viewport}
                  projection={props.projection}
                  preview={props.preview}
                  onPreviewGeometry={props.onPreviewGeometry}
                  textEditorRegistry={props.textEditorRegistry}
                  onUpdate={props.onUpdate}
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
  onUpdate: (annotationId: string, patch: WorkbenchTextAnnotationPatch) => void;
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
                  selected={
                    props.selectedObject?.kind === 'annotation' &&
                    props.selectedObject.id === itemId
                  }
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
  onUpdateTextAnnotation: (annotationId: string, patch: WorkbenchTextAnnotationPatch) => void;
  onDeleteAnnotation: (annotationId: string) => void;
  onCommitBackgroundResize: (layerId: string, size: { width: number; height: number }) => void;
  onUpdateBackgroundLayer: (
    layerId: string,
    patch: Partial<Pick<WorkbenchBackgroundLayer, 'fill' | 'opacity' | 'material' | 'name'>>
  ) => void;
  onDeleteBackgroundLayer: (layerId: string) => void;
}) {
  const selectedText = createMemo(() =>
    props.selectedObject?.kind === 'annotation'
      ? (props.annotations.find(
          (item) => item.id === props.selectedObject?.id && item.kind === 'text'
        ) ?? null)
      : null
  );
  const selectedRegion = createMemo(() =>
    props.selectedObject?.kind === 'background_layer'
      ? (props.backgroundLayers.find((item) => item.id === props.selectedObject?.id) ?? null)
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
            textEditorRegistry={props.textEditorRegistry}
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
