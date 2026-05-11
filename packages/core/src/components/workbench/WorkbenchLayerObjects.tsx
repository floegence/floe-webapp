import { For, Show, createEffect, createMemo, createSignal, onCleanup, untrack, type Accessor, type JSX } from 'solid-js';
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
import { createWorkbenchWidgetSurfaceMetrics } from './workbenchHelpers';

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
  return [...items].sort((left, right) => {
    if (left.z_index !== right.z_index) return left.z_index - right.z_index;
    if (left.created_at_unix_ms !== right.created_at_unix_ms) {
      return left.created_at_unix_ms - right.created_at_unix_ms;
    }
    return left.id.localeCompare(right.id);
  });
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

  const readText = () => element()?.textContent ?? args.value();
  const bind = (node: HTMLDivElement) => setElement(node);
  const commitCurrentText = (node: HTMLDivElement) => {
    const nextValue = node.textContent ?? '';
    if (nextValue === args.value()) return;
    args.onCommit(nextValue);
  };

  createEffect(() => {
    const node = element();
    if (!node) return;
    if (isComposing()) return;
    if (isFocused()) return;
    const nextValue = args.value();
    if ((node.textContent ?? '') === nextValue) return;
    node.textContent = nextValue;
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

function useLayerDrag(args: {
  viewportScale: () => number;
  readPosition: () => { x: number; y: number };
  onCommitMove: (position: { x: number; y: number }) => void;
  onPreviewMove?: (position: { x: number; y: number }) => void;
  onPreviewEnd?: () => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onCommitStart?: (position: { x: number; y: number }) => void;
}) {
  const [dragState, setDragState] = createSignal<LayerDragState | null>(null);
  let session: PointerSessionController | undefined;

  onCleanup(() => {
    session?.stop({ reason: 'manual_stop', commit: false });
    session = undefined;
    untrack(dragState)?.stopInteraction();
  });

  const position = createMemo(() => {
    const current = dragState();
    return current ? { x: current.worldX, y: current.worldY } : args.readPosition();
  });

  const beginDrag: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    session?.stop({ reason: 'manual_stop', commit: false });
    const start = args.readPosition();
    const scale = Math.max(args.viewportScale(), 0.001);
    const stopHotInteraction = startHotInteraction({ kind: 'drag', cursor: 'grabbing' });
    let interactionStopped = false;
    args.onInteractionStart?.();
    const stopInteraction = () => {
      if (interactionStopped) return;
      interactionStopped = true;
      stopHotInteraction();
      args.onInteractionEnd?.();
    };
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
        let nextPosition: { x: number; y: number } | null = null;
        setDragState((current) => {
          if (!current || current.pointerId !== nextEvent.pointerId) return current;
          nextPosition = {
            x: current.startWorldX + (nextEvent.clientX - current.startClientX) / current.scale,
            y: current.startWorldY + (nextEvent.clientY - current.startClientY) / current.scale,
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
        if (nextPosition) {
          args.onPreviewMove?.(nextPosition);
        }
      },
      onEnd: ({ commit }) => {
        const current = untrack(dragState);
        if (current && commit) {
          const position = { x: current.worldX, y: current.worldY };
          args.onCommitStart?.(position);
          if (current.moved) {
            args.onCommitMove(position);
          }
        }
        current?.stopInteraction();
        setDragState(null);
        session = undefined;
        args.onPreviewEnd?.();
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
  const [resizeState, setResizeState] = createSignal<LayerResizeState | null>(null);
  let session: PointerSessionController | undefined;

  onCleanup(() => {
    session?.stop({ reason: 'manual_stop', commit: false });
    session = undefined;
    untrack(resizeState)?.stopInteraction();
  });

  const size = createMemo(() => {
    const current = resizeState();
    return current ? { width: current.width, height: current.height } : args.readSize();
  });

  const beginResize: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    session?.stop({ reason: 'manual_stop', commit: false });
    const start = args.readSize();
    const scale = Math.max(args.viewportScale(), 0.001);
    const stopHotInteraction = startHotInteraction({ kind: 'resize', cursor: 'nwse-resize' });
    let interactionStopped = false;
    args.onInteractionStart?.();
    const stopInteraction = () => {
      if (interactionStopped) return;
      interactionStopped = true;
      stopHotInteraction();
      args.onInteractionEnd?.();
    };
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
          args.onPreviewResize?.(nextSize);
        }
      },
      onEnd: ({ commit }) => {
        const current = untrack(resizeState);
        if (current && commit) {
          args.onCommitResize({ width: current.width, height: current.height });
        }
        current?.stopInteraction();
        setResizeState(null);
        session = undefined;
        args.onPreviewEnd?.();
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
  const bodyEditor = usePlainTextEditor({
    value: () => props.item.body,
    onCommit: (body) => props.onUpdate(props.item.id, { body }),
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
    props.onSelect(props.item.id);
    if (props.locked) return;
    if (
      event.target instanceof Element &&
      event.target.closest('[data-floe-workbench-sticky-local="true"]')
    ) {
      return;
    }
    props.onStartOptimisticFront?.(props.item.id);
    drag.beginDrag(event);
  };

  const drag = useLayerDrag({
    viewportScale: () => props.viewportScale,
    readPosition: () => ({ x: props.item.x, y: props.item.y }),
    onCommitMove: (position) => props.onCommitMove(props.item.id, position),
    onCommitStart: () => props.onCommitFront?.(props.item.id),
    onInteractionStart: () => props.onLayoutInteractionStart?.(),
    onInteractionEnd: () => props.onLayoutInteractionEnd?.(),
  });
  const resize = useLayerResize({
    viewportScale: () => props.viewportScale,
    readSize: () => ({ width: props.item.width, height: props.item.height }),
    minWidth: NOTE_MIN_WIDTH,
    minHeight: NOTE_MIN_HEIGHT,
    onCommitResize: (size) => props.onCommitResize(props.item.id, size),
    onInteractionStart: () => props.onLayoutInteractionStart?.(),
    onInteractionEnd: () => props.onLayoutInteractionEnd?.(),
  });
  const livePosition = createMemo(() => drag.position());
  const liveSize = createMemo(() => resize.size());
  const surfaceMetrics = createMemo<WorkbenchWidgetSurfaceMetrics | undefined>(() => {
    if (!props.projectedViewport) return undefined;
    return createWorkbenchWidgetSurfaceMetrics({
      widgetId: props.item.id,
      worldX: livePosition().x,
      worldY: livePosition().y,
      worldWidth: liveSize().width,
      worldHeight: liveSize().height,
      viewport: props.projectedViewport(),
      ready: props.surfaceReady ?? true,
    });
  });
  const projectedScale = createMemo(
    () => surfaceMetrics()?.rect.viewportScale ?? Math.max(props.viewportScale, 0.001),
  );
  const style = createMemo<JSX.CSSProperties>(() => ({
    width: `${liveSize().width}px`,
    height: `${liveSize().height}px`,
    transform: props.projectedViewport
      ? `translate(${surfaceMetrics()?.rect.screenX ?? 0}px, ${surfaceMetrics()?.rect.screenY ?? 0}px) scale(${projectedScale()})`
      : `translate(${livePosition().x}px, ${livePosition().y}px)`,
    'transform-origin': '0 0',
    'z-index': `${
      props.selected || props.optimisticFront || drag.isDragging() || resize.isResizing()
        ? props.topRenderLayer + 1
        : props.renderLayer
    }`,
  }));

  return (
    <article
      class="workbench-sticky"
      classList={{
        'is-selected': props.selected,
        'is-locked': props.locked,
        'is-filtered-out': props.filtered,
        'is-dragging': drag.isDragging(),
        'is-resizing': resize.isResizing(),
        'is-copied': copied(),
        [STICKY_COLOR_CLASS[props.item.color]]: true,
      }}
      data-floe-canvas-interactive="true"
      data-floe-workbench-widget-root="true"
      data-floe-workbench-widget-id={props.item.id}
      data-wb-plane="work"
      data-wb-object-kind="sticky"
      data-wb-object-id={props.item.id}
      data-floe-workbench-sticky-id={props.item.id}
      style={style()}
      tabIndex={0}
      onPointerDown={handleStickyPointerDown}
      onFocus={() => props.onSelect(props.item.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.onContextMenu?.(event, props.item);
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
              props.onSelect(props.item.id);
              props.onStartOptimisticFront?.(props.item.id);
              drag.beginDrag(event);
            }}
          >
            <GripVertical class="w-3.5 h-3.5" />
          </button>
        </header>
        <div
          ref={bodyEditor.bind}
          class="workbench-sticky__body"
          contentEditable={props.locked ? false : 'plaintext-only'}
          role="textbox"
          aria-multiline="true"
          aria-disabled={props.locked ? 'true' : undefined}
          aria-label="Sticky note body"
          spellcheck={false}
          data-floe-workbench-text-selection-surface="true"
          data-wb-text-editor="plain"
          data-floe-workbench-sticky-local="true"
          data-wb-part="content"
          onPointerDown={(event) => {
            event.stopPropagation();
            props.onSelect(props.item.id);
          }}
          onFocus={bodyEditor.handleFocus}
          onBlur={bodyEditor.handleBlur}
          onInput={bodyEditor.handleInput}
          onCompositionStart={bodyEditor.handleCompositionStart}
          onCompositionEnd={bodyEditor.handleCompositionEnd}
        />
      </div>
      <Show when={props.selected && !props.locked}>
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
              props.onUpdate(props.item.id, {
                color: nextValue<WorkbenchStickyNoteColor>(
                  WORKBENCH_STICKY_NOTE_COLORS,
                  props.item.color,
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
              props.onDelete(props.item.id);
            }}
          >
            <Trash class="w-3.5 h-3.5" />
          </button>
        </div>
      </Show>
      <Show when={!props.locked}>
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
  const textEditor = usePlainTextEditor({
    value: () => props.item.text,
    onCommit: (text) => props.onUpdate(props.item.id, { text }),
  });
  createEffect(() => {
    const registry = props.textEditorRegistry;
    if (!registry) return;
    const unregister = registry.register(props.item.id, {
      focus: textEditor.focus,
      insertTextAtSelection: textEditor.insertTextAtSelection,
      readText: textEditor.readText,
    });
    onCleanup(unregister);
  });
  const drag = useLayerDrag({
    viewportScale: () => props.viewportScale,
    readPosition: () => ({ x: props.item.x, y: props.item.y }),
    onCommitMove: (position) => props.onCommitMove(props.item.id, position),
    onPreviewMove: (position) => props.onPreviewGeometry?.({
      kind: 'annotation',
      id: props.item.id,
      x: position.x,
      y: position.y,
      width: props.item.width,
      height: props.item.height,
    }),
    onPreviewEnd: () => props.onPreviewGeometry?.(null),
  });
  const visualGeometry = createMemo(() => {
    const preview = readPreviewGeometry(props.preview, 'annotation', props.item.id);
    return {
      x: preview?.x ?? drag.position().x,
      y: preview?.y ?? drag.position().y,
      width: preview?.width ?? props.item.width,
      height: preview?.height ?? props.item.height,
    };
  });
  const style = createMemo<JSX.CSSProperties>(() => ({
    width: `${visualGeometry().width}px`,
    height: `${visualGeometry().height}px`,
    transform: `translate(${visualGeometry().x}px, ${visualGeometry().y}px)`,
    'z-index': `${props.item.z_index}`,
    '--workbench-text-color': props.item.color,
    '--workbench-text-size': `${props.item.font_size}px`,
    '--workbench-text-weight': `${props.item.font_weight}`,
    '--workbench-text-align': props.item.align,
    '--workbench-text-family': props.item.font_family,
  }));
  const handleTextFramePointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (!props.editable || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest(
        '.workbench-text-annotation__content',
      )
    ) {
      return;
    }
    event.stopPropagation();
    props.onSelect(props.item.id);
  };

  return (
    <article
      class="workbench-text-annotation"
      classList={{ 'is-selected': props.selected, 'is-editable': props.editable }}
      data-floe-canvas-interactive={props.editable ? 'true' : undefined}
      data-wb-plane="annotation"
      data-wb-object-kind="text"
      data-wb-object-id={props.item.id}
      data-wb-part="body"
      style={style()}
      onPointerDown={handleTextFramePointerDown}
      onContextMenu={(event) => {
        if (!props.editable) return;
        event.preventDefault();
        event.stopPropagation();
        props.onSelect(props.item.id);
        props.onContextMenu?.(event, props.item);
      }}
    >
      <div
        ref={textEditor.bind}
        class="workbench-text-annotation__content"
        contentEditable={props.editable ? 'plaintext-only' : false}
        tabIndex={props.editable ? 0 : undefined}
        role={props.editable ? 'textbox' : undefined}
        aria-multiline={props.editable ? 'true' : undefined}
        aria-disabled={props.editable ? undefined : 'true'}
        spellcheck={false}
        data-floe-workbench-text-selection-surface="true"
        data-wb-text-editor="plain"
        data-wb-part="content"
        onPointerDown={(event) => {
          if (!props.editable || event.button !== 0) return;
          props.onSelect(props.item.id);
        }}
        onFocus={(event) => {
          textEditor.handleFocus(event);
          if (props.editable) props.onSelect(props.item.id);
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
  preview?: WorkbenchLayerGeometryPreview | null;
  onPreviewGeometry?: (preview: WorkbenchLayerGeometryPreview | null) => void;
  onSelect: (layerId: string) => void;
  onContextMenu?: (event: MouseEvent, item: WorkbenchBackgroundLayer) => void;
  onCommitMove: (layerId: string, position: { x: number; y: number }) => void;
}) {
  const drag = useLayerDrag({
    viewportScale: () => props.viewportScale,
    readPosition: () => ({ x: props.item.x, y: props.item.y }),
    onCommitMove: (position) => props.onCommitMove(props.item.id, position),
    onPreviewMove: (position) => props.onPreviewGeometry?.({
      kind: 'background_layer',
      id: props.item.id,
      x: position.x,
      y: position.y,
      width: props.item.width,
      height: props.item.height,
    }),
    onPreviewEnd: () => props.onPreviewGeometry?.(null),
  });
  const visualGeometry = createMemo(() => {
    const preview = readPreviewGeometry(props.preview, 'background_layer', props.item.id);
    return {
      x: preview?.x ?? drag.position().x,
      y: preview?.y ?? drag.position().y,
      width: preview?.width ?? props.item.width,
      height: preview?.height ?? props.item.height,
    };
  });
  const style = createMemo<JSX.CSSProperties>(() => ({
    width: `${visualGeometry().width}px`,
    height: `${visualGeometry().height}px`,
    transform: `translate(${visualGeometry().x}px, ${visualGeometry().y}px)`,
    'z-index': `${props.item.z_index}`,
    ...createRegionRenderVars(props.item),
  }));
  const handleRegionPointerDown: JSX.EventHandler<HTMLElement, PointerEvent> = (event) => {
    if (!props.editable || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest('.workbench-background-region__toolbar, .workbench-layer-resize')
    ) {
      return;
    }
    props.onSelect(props.item.id);
    drag.beginDrag(event);
  };

  return (
    <article
      class="workbench-background-region"
      classList={{
        'is-selected': props.selected,
        'is-editable': props.editable,
        'is-transforming': drag.isDragging(),
        [`is-material-${props.item.material}`]: true,
      }}
      data-floe-canvas-interactive={props.editable ? 'true' : undefined}
      data-wb-plane="background"
      data-wb-object-kind="region"
      data-wb-object-id={props.item.id}
      data-wb-part="body"
      style={style()}
      tabIndex={props.editable ? 0 : undefined}
      onPointerDown={handleRegionPointerDown}
      onFocus={() => props.editable && props.onSelect(props.item.id)}
      onContextMenu={(event) => {
        if (!props.editable) return;
        event.preventDefault();
        event.stopPropagation();
        props.onSelect(props.item.id);
        props.onContextMenu?.(event, props.item);
      }}
    />
  );
}

function WorkbenchTextAnnotationControls(props: {
  item: WorkbenchTextAnnotationItem;
  viewportScale: number;
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
  let sizeInputEl: HTMLInputElement | undefined;
  let fontPickerEl: HTMLDivElement | undefined;
  let emojiPickerEl: HTMLDivElement | undefined;
  const [fontSizeDraft, setFontSizeDraft] = createSignal('');
  const [fontPickerOpen, setFontPickerOpen] = createSignal(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = createSignal(false);
  const activeFont = createMemo(() =>
    WORKBENCH_TEXT_FONT_OPTIONS.find((font) => font.fontFamily === props.item.font_family)
      ?? WORKBENCH_TEXT_FONT_OPTIONS[0]!
  );
  const move = useLayerDrag({
    viewportScale: () => props.viewportScale,
    readPosition: () => ({ x: props.item.x, y: props.item.y }),
    onCommitMove: (position) => props.onCommitMove(props.item.id, position),
    onPreviewMove: (position) => props.onPreviewGeometry?.({
      kind: 'annotation',
      id: props.item.id,
      x: position.x,
      y: position.y,
      width: props.item.width,
      height: props.item.height,
    }),
    onPreviewEnd: () => props.onPreviewGeometry?.(null),
  });
  const resize = useLayerResize({
    viewportScale: () => props.viewportScale,
    readSize: () => ({ width: props.item.width, height: props.item.height }),
    minWidth: TEXT_MIN_WIDTH,
    minHeight: TEXT_MIN_HEIGHT,
    onCommitResize: (size) => props.onCommitResize(props.item.id, size),
    onPreviewResize: (size) => props.onPreviewGeometry?.({
      kind: 'annotation',
      id: props.item.id,
      x: props.item.x,
      y: props.item.y,
      width: size.width,
      height: size.height,
    }),
    onPreviewEnd: () => props.onPreviewGeometry?.(null),
  });
  const visualGeometry = createMemo(() => {
    const preview = readPreviewGeometry(props.preview, 'annotation', props.item.id);
    return {
      x: preview?.x ?? move.position().x,
      y: preview?.y ?? move.position().y,
      width: resize.size().width,
      height: resize.size().height,
    };
  });
  const style = createMemo<JSX.CSSProperties>(() => ({
    width: `${visualGeometry().width}px`,
    height: `${visualGeometry().height}px`,
    transform: `translate(${visualGeometry().x}px, ${visualGeometry().y}px)`,
    'z-index': `${props.item.z_index}`,
    '--workbench-layer-control-inverse-scale': `${1 / Math.max(props.viewportScale, 0.001)}`,
  }));
  const nextAlign = (): WorkbenchTextAnnotationAlign =>
    nextValue<WorkbenchTextAnnotationAlign>(['left', 'center', 'right'], props.item.align);
  const updateFontSize = (value: number) => {
    if (!Number.isFinite(value)) return;
    const next = clampTextFontSize(value);
    setFontSizeDraft(String(next));
    props.onUpdate(props.item.id, { font_size: next });
  };
  const commitFontSizeDraft = () => {
    const raw = fontSizeDraft().trim();
    const next = Number(raw);
    if (raw.length > 0 && Number.isFinite(next)) {
      updateFontSize(next);
      return;
    }
    setFontSizeDraft(String(props.item.font_size));
  };

  createEffect(() => {
    if (typeof document !== 'undefined' && document.activeElement === sizeInputEl) return;
    setFontSizeDraft(String(props.item.font_size));
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
      data-wb-object-id={props.item.id}
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
                    aria-checked={props.item.font_family === font.fontFamily}
                    aria-label={`Use ${font.label} bold font`}
                    title={`${font.label} bold`}
                    class="workbench-text-font-option"
                    classList={{ 'is-active': props.item.font_family === font.fontFamily }}
                    onPointerDown={stopLayerButtonPointer}
                    onClick={(event) => {
                      stopLayerButtonClick(event);
                      props.onUpdate(props.item.id, {
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
              updateFontSize(props.item.font_size - 1);
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
              updateFontSize(props.item.font_size + 1);
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
              classList={{ 'is-active': props.item.color === color }}
              style={{ background: color }}
              onPointerDown={stopLayerButtonPointer}
              onClick={(event) => {
                stopLayerButtonClick(event);
                props.onUpdate(props.item.id, { color });
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
                      props.textEditorRegistry?.get(props.item.id)?.insertTextAtSelection(emoji);
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
            props.onUpdate(props.item.id, { align: nextAlign() });
          }}
        >
          {props.item.align}
        </button>
        <button
          type="button"
          class="workbench-layer-mini-button is-danger"
          aria-label="Delete text"
          onPointerDown={stopLayerButtonPointer}
          onClick={(event) => {
            stopLayerButtonClick(event);
            props.onDelete(props.item.id);
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
  preview?: WorkbenchLayerGeometryPreview | null;
  onPreviewGeometry?: (preview: WorkbenchLayerGeometryPreview | null) => void;
  onCommitResize: (layerId: string, size: { width: number; height: number }) => void;
  onUpdate: (
    layerId: string,
    patch: Partial<Pick<WorkbenchBackgroundLayer, 'fill' | 'opacity' | 'material' | 'name'>>,
  ) => void;
  onDelete: (layerId: string) => void;
}) {
  const resize = useLayerResize({
    viewportScale: () => props.viewportScale,
    readSize: () => ({ width: props.item.width, height: props.item.height }),
    minWidth: REGION_MIN_WIDTH,
    minHeight: REGION_MIN_HEIGHT,
    onCommitResize: (size) => props.onCommitResize(props.item.id, size),
    onPreviewResize: (size) => props.onPreviewGeometry?.({
      kind: 'background_layer',
      id: props.item.id,
      x: props.item.x,
      y: props.item.y,
      width: size.width,
      height: size.height,
    }),
    onPreviewEnd: () => props.onPreviewGeometry?.(null),
  });
  const visualGeometry = createMemo(() => {
    const preview = readPreviewGeometry(props.preview, 'background_layer', props.item.id);
    return {
      x: preview?.x ?? props.item.x,
      y: preview?.y ?? props.item.y,
      width: resize.size().width,
      height: resize.size().height,
    };
  });
  const style = createMemo<JSX.CSSProperties>(() => ({
    width: `${visualGeometry().width}px`,
    height: `${visualGeometry().height}px`,
    transform: `translate(${visualGeometry().x}px, ${visualGeometry().y}px)`,
    'z-index': `${props.item.z_index}`,
    '--workbench-layer-control-inverse-scale': `${1 / Math.max(props.viewportScale, 0.001)}`,
    ...createRegionRenderVars(props.item),
  }));

  return (
    <div
      class="workbench-layer-control workbench-layer-control--region"
      data-floe-canvas-interactive="true"
      data-wb-plane="overlay"
      data-wb-object-kind="region"
      data-wb-object-id={props.item.id}
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
              classList={{ 'is-active': props.item.fill === fill }}
              style={{ background: fill }}
              onPointerDown={stopLayerButtonPointer}
              onClick={(event) => {
                stopLayerButtonClick(event);
                props.onUpdate(props.item.id, { fill });
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
                  'is-active': props.item.material === material,
                  [`is-${material}`]: true,
                }}
                onPointerDown={stopLayerButtonPointer}
                onClick={(event) => {
                  stopLayerButtonClick(event);
                  props.onUpdate(props.item.id, { material });
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
            props.onUpdate(props.item.id, {
              opacity: props.item.opacity >= 0.88 ? 0.42 : props.item.opacity + 0.18,
            });
          }}
        >
          {Math.round(props.item.opacity * 100)}%
        </button>
        <button
          type="button"
          class="workbench-layer-mini-button is-danger"
          aria-label="Delete background region"
          onPointerDown={stopLayerButtonPointer}
          onClick={(event) => {
            stopLayerButtonClick(event);
            props.onDelete(props.item.id);
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

export function WorkbenchBackgroundLayerView(props: {
  items: readonly WorkbenchBackgroundLayer[];
  selectedObject: WorkbenchSelection | null;
  editable: boolean;
  filtered: boolean;
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
      <Show when={props.editable && selectedRegion()}>
        {(item) => (
          <WorkbenchBackgroundRegionControls
            item={item()}
            viewportScale={props.viewport.scale}
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
