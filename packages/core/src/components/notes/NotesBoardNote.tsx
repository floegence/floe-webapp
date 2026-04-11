import { createMemo, createSignal, onCleanup, untrack, type JSX } from 'solid-js';
import { startHotInteraction } from '../../utils/hotInteraction';
import { Check, GripVertical, Pencil, Trash } from '../../icons';
import {
  getNotePreviewText,
  normalizeNoteText,
  normalizeNoteTitle,
  noteColorClass,
  notePreviewMetrics,
  samePoint,
} from './notesOverlayHelpers';
import type { NotesItem, NotesPoint } from './types';

const NOTE_FRONT_SKIP_SELECTOR = '[data-floe-notes-front-skip="true"]';

interface LocalDragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startWorldX: number;
  startWorldY: number;
  worldX: number;
  worldY: number;
  moved: boolean;
  scale: number;
  stopInteraction: () => void;
}

export interface NotesBoardNoteProps {
  item: NotesItem;
  copied: boolean;
  numberLabel: string | null;
  optimisticFront: boolean;
  shortcutPending: boolean;
  topZIndex: number;
  viewportScale: number;
  onSeedMoveProjection: (noteID: string, position: NotesPoint) => void;
  onCopy: (item: NotesItem) => void;
  onOpenContextMenu: (event: MouseEvent, item: NotesItem) => void;
  onOpenEditor: (noteID: string) => void;
  onMoveToTrash: (noteID: string) => void;
  onStartOptimisticFront: (noteID: string) => void;
  onCommitFront: (noteID: string) => void;
  onCommitMove: (noteID: string, position: NotesPoint) => Promise<void> | void;
}

export function NotesBoardNote(props: NotesBoardNoteProps) {
  const [dragState, setDragState] = createSignal<LocalDragState | null>(null);
  let dragAbortController: AbortController | undefined;

  onCleanup(() => {
    dragAbortController?.abort();
    dragAbortController = undefined;
    untrack(dragState)?.stopInteraction();
  });

  const metrics = createMemo(() => notePreviewMetrics(props.item));
  const titleText = createMemo(() => normalizeNoteTitle(props.item.title));
  const bodyText = createMemo(() => normalizeNoteText(props.item.body));
  const previewText = createMemo(() =>
    bodyText() ? getNotePreviewText(props.item.body, metrics().preview_limit) : ''
  );
  const numberBadgeStyle = createMemo<JSX.CSSProperties | undefined>(() =>
    props.numberLabel
      ? {
          '--notes-number-length': `${Math.max(props.numberLabel.length, 1)}`,
        }
      : undefined
  );
  const hasTitle = createMemo(() => titleText().length > 0);
  const hasBody = createMemo(() => bodyText().length > 0);
  const isEmpty = createMemo(() => !hasTitle() && !hasBody());
  const isDragging = () => dragState() !== null;
  const livePosition = createMemo(() => {
    const current = dragState();
    if (!current) return { x: props.item.x, y: props.item.y };
    return { x: current.worldX, y: current.worldY };
  });
  const shouldCommitFrontFromClick = (target: EventTarget | null) =>
    !(target instanceof Element && target.closest(NOTE_FRONT_SKIP_SELECTOR));

  const finishDrag = (commitMove: boolean) => {
    const current = untrack(dragState);
    if (!current) return;

    const next = { x: current.worldX, y: current.worldY };
    const start = { x: current.startWorldX, y: current.startWorldY };
    const shouldCommitMove = commitMove && !samePoint(next, start);

    if (shouldCommitMove) {
      props.onSeedMoveProjection(props.item.note_id, next);
    }

    current.stopInteraction();
    setDragState(null);
    dragAbortController?.abort();
    dragAbortController = undefined;

    props.onCommitFront(props.item.note_id);
    if (!shouldCommitMove) return;
    void props.onCommitMove(props.item.note_id, next);
  };

  const beginDrag: JSX.EventHandler<HTMLButtonElement, PointerEvent> = (event) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    dragAbortController?.abort();
    props.onStartOptimisticFront(props.item.note_id);

    const stopInteraction = startHotInteraction({ kind: 'drag', cursor: 'grabbing' });
    const scale = Math.max(props.viewportScale, 0.001);

    setDragState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWorldX: props.item.x,
      startWorldY: props.item.y,
      worldX: props.item.x,
      worldY: props.item.y,
      moved: false,
      scale,
      stopInteraction,
    });

    const handleMove = (nextEvent: PointerEvent) => {
      setDragState((current) => {
        if (!current || current.pointerId !== nextEvent.pointerId) return current;

        const worldX =
          current.startWorldX + (nextEvent.clientX - current.startClientX) / current.scale;
        const worldY =
          current.startWorldY + (nextEvent.clientY - current.startClientY) / current.scale;
        return {
          ...current,
          worldX,
          worldY,
          moved:
            current.moved ||
            Math.abs(worldX - current.startWorldX) > 2 ||
            Math.abs(worldY - current.startWorldY) > 2,
        };
      });
    };

    const finish = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== event.pointerId) return;
      finishDrag(true);
    };

    const cancel = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== event.pointerId) return;
      finishDrag(false);
    };

    const controller = new AbortController();
    dragAbortController = controller;

    window.addEventListener('pointermove', handleMove, { signal: controller.signal });
    window.addEventListener('pointerup', finish, {
      once: true,
      signal: controller.signal,
    });
    window.addEventListener('pointercancel', cancel, {
      once: true,
      signal: controller.signal,
    });
  };

  return (
    <article
      class={`${noteColorClass(props.item.color_token)} notes-note notes-note--size-${props.item.size_bucket - 1}`}
      classList={{
        'is-copied': props.copied,
        'is-dragging': isDragging(),
        'has-title': hasTitle(),
        'is-shortcut-pending': props.shortcutPending,
      }}
      data-floe-geometry-surface="notes-note"
      data-floe-notes-note-id={props.item.note_id}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.onOpenContextMenu(event, props.item);
      }}
      onClick={(event) => {
        if (!shouldCommitFrontFromClick(event.target)) return;
        props.onCommitFront(props.item.note_id);
      }}
      style={{
        transform: `translate(${livePosition().x}px, ${livePosition().y}px)`,
        '--note-width': `${metrics().width}px`,
        '--note-height': `${metrics().height}px`,
        'z-index':
          isDragging() || props.optimisticFront
            ? `${props.topZIndex + 1}`
            : `${props.item.z_index}`,
      }}
    >
      <div class="notes-note__surface">
        <header class="notes-note__header">
          <div class="notes-note__lead">
            <button
              type="button"
              class="notes-note__drag"
              aria-label="Drag note"
              data-floe-canvas-interactive="true"
              data-floe-notes-front-skip="true"
              onPointerDown={beginDrag}
            >
              <GripVertical class="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        <button
          type="button"
          class="notes-note__body"
          classList={{
            'is-empty': isEmpty(),
            'has-title': hasTitle(),
            'is-title-only': hasTitle() && !hasBody(),
          }}
          data-floe-canvas-interactive="true"
          data-floe-canvas-pan-surface="true"
          onClick={() => props.onCopy(props.item)}
        >
          {hasTitle() ? (
            <span class="notes-note__title-block">
              <span class="notes-note__title">{titleText()}</span>
            </span>
          ) : null}
          {hasBody() ? <span class="notes-note__body-copy">{previewText()}</span> : null}
          {isEmpty() ? <span class="notes-note__body-copy">Empty note</span> : null}
        </button>

        {props.copied ? (
          <div class="notes-note__copied-state" aria-hidden="true">
            <div class="notes-note__copied-pill">
              <span class="notes-note__copied-icon">
                <Check class="w-3.5 h-3.5" />
              </span>
              <span class="notes-note__copied-copy">Copied</span>
            </div>
          </div>
        ) : null}
      </div>

      <div class="notes-note__actions">
        <button
          type="button"
          class="notes-note__icon-button"
          data-floe-canvas-interactive="true"
          aria-label="Edit note"
          onClick={() => props.onOpenEditor(props.item.note_id)}
        >
          <Pencil class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          class="notes-note__icon-button is-danger"
          data-floe-canvas-interactive="true"
          data-floe-notes-front-skip="true"
          aria-label="Move note to trash"
          onClick={() => props.onMoveToTrash(props.item.note_id)}
        >
          <Trash class="w-3.5 h-3.5" />
        </button>
      </div>

      {props.numberLabel ? (
        <div
          class="notes-note__number"
          data-floe-notes-note-number={props.numberLabel}
          data-floe-notes-note-number-length={props.numberLabel.length}
          style={numberBadgeStyle()}
          aria-hidden="true"
        >
          <span class="notes-note__number-key">{props.numberLabel}</span>
        </div>
      ) : null}
    </article>
  );
}
