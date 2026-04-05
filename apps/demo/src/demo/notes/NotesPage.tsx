import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
  type Component,
  type JSX,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { Motion, Presence } from 'solid-motionone';
import {
  duration,
  easing,
  startHotInteraction,
  useLayout,
  useNotification,
} from '@floegence/floe-webapp-core';
import {
  Check,
  GripVertical,
  Layers,
  Minus,
  Paste,
  Pencil,
  Plus,
  Trash,
  X,
} from '@floegence/floe-webapp-core/icons';
import { Button, Dialog, InfiniteCanvas, Textarea } from '@floegence/floe-webapp-core/ui';
import {
  NOTES_SIZE_DIMENSIONS,
  NOTES_TRASH_RETENTION_MS,
  useNotesDemo,
  type NotesColorId,
  type NotesNote,
  type NotesTopic,
} from './NotesDemoContext';

const NOTES_CANVAS_WORLD_WIDTH = 2800;
const NOTES_CANVAS_WORLD_HEIGHT = 2200;
const NOTES_CANVAS_MIN_SCALE = 0.45;
const NOTES_CANVAS_MAX_SCALE = 2.2;
const NOTES_CANVAS_ZOOM_STEP = 1.18;
const NOTES_DEFAULT_FRAME_WIDTH = 1280;
const NOTES_DEFAULT_FRAME_HEIGHT = 880;
const NOTES_OVERVIEW_WORLD_PADDING_X = 180;
const NOTES_OVERVIEW_WORLD_PADDING_Y = 156;

interface CanvasMenuState {
  clientX: number;
  clientY: number;
  worldX: number;
  worldY: number;
  topicId: string;
}

interface DragState {
  noteId: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  moved: boolean;
  scale: number;
  stopInteraction: () => void;
}

interface ManualPasteState {
  topicId: string;
  worldX: number;
  worldY: number;
}

interface TrashTopicSection {
  topic: NotesTopic;
  notes: NotesNote[];
  latestDeletedAt: number;
}

interface CanvasFrameSize {
  width: number;
  height: number;
}

interface OverviewBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

interface OverviewViewportMetrics {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface OverviewNavigationState {
  pointerId: number;
  bounds: OverviewBounds;
  surfaceRect: DOMRect;
  centerOffsetX: number;
  centerOffsetY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampOverviewCenter(center: number, span: number, min: number, max: number): number {
  const total = max - min;
  if (!Number.isFinite(total) || total <= 0) return center;
  if (span >= total) return min + total / 2;
  return clamp(center, min + span / 2, max - span / 2);
}

function getNormalizedOverviewPoint(clientX: number, clientY: number, rect: DOMRect) {
  return {
    x: clamp((clientX - rect.left) / rect.width, 0, 1),
    y: clamp((clientY - rect.top) / rect.height, 0, 1),
  };
}

function NotesTrashDockIcon(props: { class?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
      aria-hidden="true"
    >
      <path d="M10 8.5h12" />
      <path d="M13 5.5h6" />
      <path d="M11.5 8.5h9a1.2 1.2 0 0 1 1.2 1.3l-1 13.1a2.1 2.1 0 0 1-2.1 1.9h-5.2a2.1 2.1 0 0 1-2.1-1.9l-1-13.1a1.2 1.2 0 0 1 1.2-1.3Z" />
      <path d="M14 12.5v7.2" />
      <path d="M18 12.5v7.2" />
      <path d="M8 8.5h16" />
    </svg>
  );
}

function formatRemainingTrashTime(deletedAt: number | null, now = Date.now()): string {
  if (deletedAt === null) return 'Restored';

  const remaining = Math.max(0, NOTES_TRASH_RETENTION_MS - (now - deletedAt));
  const totalHours = Math.ceil(remaining / (60 * 60 * 1000));

  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    if (hours === 0) return `${days}d left`;
    return `${days}d ${hours}h left`;
  }

  return `${Math.max(1, totalHours)}h left`;
}

function formatDeletedTimestamp(timestamp: number | null): string {
  if (timestamp === null) return 'Restored';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

export const NotesPage: Component = () => {
  const notes = useNotesDemo();
  const layout = useLayout();
  const notifications = useNotification();

  const [contextMenu, setContextMenu] = createSignal<CanvasMenuState | null>(null);
  const [editingNoteId, setEditingNoteId] = createSignal<string | null>(null);
  const [draftText, setDraftText] = createSignal('');
  const [draftColor, setDraftColor] = createSignal<NotesColorId>('butter');
  const [trashOpen, setTrashOpen] = createSignal(false);
  const [overviewOpen, setOverviewOpen] = createSignal(false);
  const [overviewNavigationState, setOverviewNavigationState] =
    createSignal<OverviewNavigationState | null>(null);
  const [manualPasteTarget, setManualPasteTarget] = createSignal<ManualPasteState | null>(null);
  const [manualPasteText, setManualPasteText] = createSignal('');
  const [copiedNoteId, setCopiedNoteId] = createSignal<string | null>(null);
  const [dragState, setDragState] = createSignal<DragState | null>(null);
  const [canvasFrameSize, setCanvasFrameSize] = createSignal<CanvasFrameSize>({
    width: 0,
    height: 0,
  });
  const [clock, setClock] = createSignal(Date.now());
  let copiedResetTimer: number | undefined;
  let dragCleanup: (() => void) | undefined;
  let overviewAbortController: AbortController | undefined;
  let editorSeededForNoteId: string | null = null;
  let canvasFrameRef: HTMLDivElement | undefined;

  const activeTopic = createMemo(() => notes.activeTopic());
  const activeTopicId = createMemo(() => notes.activeTopicId());
  const activeNotes = createMemo(() => {
    const topic = activeTopic();
    return topic
      ? notes
          .getNotesForTopic(topic.id)
          .slice()
          .sort((a, b) => a.layer - b.layer || a.createdAt - b.createdAt)
      : [];
  });
  const trashedNotes = createMemo(() => notes.trashedNotes());
  const editingNote = createMemo(() => {
    const noteId = editingNoteId();
    return noteId ? notes.getNoteById(noteId) : undefined;
  });
  const activeTopicLabel = createMemo(() => activeTopic()?.title ?? 'No topic');
  const boardScaleLabel = createMemo(() => `${Math.round(notes.activeViewport().scale * 100)}%`);
  const topActiveLayer = createMemo(() =>
    activeNotes().reduce((maxLayer, note) => Math.max(maxLayer, note.layer), 1)
  );
  const viewportMetrics = createMemo(() => {
    const viewport = notes.activeViewport();
    const frame = canvasFrameSize();
    const visibleWidth =
      (frame.width > 0 ? frame.width : NOTES_DEFAULT_FRAME_WIDTH) / viewport.scale;
    const visibleHeight =
      (frame.height > 0 ? frame.height : NOTES_DEFAULT_FRAME_HEIGHT) / viewport.scale;

    return {
      worldLeft: -viewport.x / viewport.scale,
      worldTop: -viewport.y / viewport.scale,
      worldWidth: visibleWidth,
      worldHeight: visibleHeight,
    };
  });
  const overviewSourceNotes = createMemo(() => {
    const topic = activeTopic();
    if (!topic) return [];

    return notes.getNotesForTopic(topic.id).map((note) => ({
      id: note.id,
      colorId: note.colorId,
      x: note.x,
      y: note.y,
      text: note.text,
      updatedAt: note.updatedAt,
    }));
  });
  const overviewBounds = createMemo<OverviewBounds>(() => {
    const notesForOverview = overviewSourceNotes();
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    const includeRect = (x: number, y: number, width: number, height: number) => {
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height)
      ) {
        return;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    };

    includeRect(0, 0, NOTES_CANVAS_WORLD_WIDTH, NOTES_CANVAS_WORLD_HEIGHT);

    for (const note of notesForOverview) {
      const dimensions = NOTES_SIZE_DIMENSIONS[notes.getNoteSize(note.text)];
      includeRect(note.x, note.y, dimensions.width, dimensions.height);
    }

    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(minY) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(maxY)
    ) {
      minX = 0;
      minY = 0;
      maxX = NOTES_CANVAS_WORLD_WIDTH;
      maxY = NOTES_CANVAS_WORLD_HEIGHT;
    }

    minX -= NOTES_OVERVIEW_WORLD_PADDING_X;
    maxX += NOTES_OVERVIEW_WORLD_PADDING_X;
    minY -= NOTES_OVERVIEW_WORLD_PADDING_Y;
    maxY += NOTES_OVERVIEW_WORLD_PADDING_Y;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  });
  const overviewNotes = createMemo(() => {
    const bounds = overviewBounds();
    const notesForOverview = overviewSourceNotes();

    return notesForOverview.map((note) => {
      const sizeBucket = notes.getNoteSize(note.text);
      const dimensions = NOTES_SIZE_DIMENSIONS[sizeBucket];

      return {
        id: note.id,
        colorId: note.colorId,
        x: ((note.x - bounds.minX) / bounds.width) * 100,
        y: ((note.y - bounds.minY) / bounds.height) * 100,
        width: (dimensions.width / bounds.width) * 100,
        height: (dimensions.height / bounds.height) * 100,
      };
    });
  });
  const overviewViewportMetrics = createMemo<OverviewViewportMetrics>(() => {
    const bounds = overviewBounds();
    const metrics = viewportMetrics();
    const left = clamp(metrics.worldLeft, bounds.minX, bounds.maxX);
    const top = clamp(metrics.worldTop, bounds.minY, bounds.maxY);
    const right = clamp(metrics.worldLeft + metrics.worldWidth, bounds.minX, bounds.maxX);
    const bottom = clamp(metrics.worldTop + metrics.worldHeight, bounds.minY, bounds.maxY);
    const width = Math.max(((right - left) / bounds.width) * 100, 6);
    const height = Math.max(((bottom - top) / bounds.height) * 100, 8);
    const normalizedLeft = ((left - bounds.minX) / bounds.width) * 100;
    const normalizedTop = ((top - bounds.minY) / bounds.height) * 100;

    return {
      left: normalizedLeft,
      top: normalizedTop,
      width,
      height,
      centerX: normalizedLeft + width / 2,
      centerY: normalizedTop + height / 2,
    };
  });
  const overviewViewportStyle = createMemo(() => {
    const viewport = overviewViewportMetrics();

    return {
      left: `${viewport.left}%`,
      top: `${viewport.top}%`,
      width: `${viewport.width}%`,
      height: `${viewport.height}%`,
    };
  });
  const trashSections = createMemo<TrashTopicSection[]>(() => {
    const groups = new Map<string, TrashTopicSection>();

    for (const note of trashedNotes()) {
      const topic = notes.getTopic(note.topicId);
      if (!topic || note.deletedAt === null) continue;

      const existing = groups.get(topic.id);
      if (existing) {
        existing.notes.push(note);
        existing.latestDeletedAt = Math.max(existing.latestDeletedAt, note.deletedAt);
        continue;
      }

      groups.set(topic.id, {
        topic,
        notes: [note],
        latestDeletedAt: note.deletedAt,
      });
    }

    return Array.from(groups.values())
      .map((section) => ({
        ...section,
        notes: section.notes.slice().sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
      }))
      .sort((a, b) => b.latestDeletedAt - a.latestDeletedAt);
  });

  const contextMenuPosition = createMemo(() => {
    const menu = contextMenu();
    if (!menu) return undefined;

    const maxX = typeof window === 'undefined' ? menu.clientX : window.innerWidth - 248;
    const maxY = typeof window === 'undefined' ? menu.clientY : window.innerHeight - 148;

    return {
      left: `${Math.max(16, Math.min(menu.clientX, maxX))}px`,
      top: `${Math.max(16, Math.min(menu.clientY, maxY))}px`,
    };
  });

  const closeContextMenu = () => setContextMenu(null);
  const closeTrashDock = () => setTrashOpen(false);
  const clearOverviewNavigation = () => {
    overviewAbortController?.abort();
    overviewAbortController = undefined;
    setOverviewNavigationState(null);
  };

  const resetCopiedNote = () => {
    if (copiedResetTimer === undefined) return;
    window.clearTimeout(copiedResetTimer);
    copiedResetTimer = undefined;
  };

  createEffect(() => {
    const note = editingNote();
    if (!note) {
      editorSeededForNoteId = null;
      return;
    }

    if (editorSeededForNoteId === note.id) return;

    editorSeededForNoteId = note.id;
    setDraftText(note.text);
    setDraftColor(note.colorId);
  });

  createEffect(() => {
    activeTopicId();
    closeContextMenu();
  });

  createEffect(() => {
    const menu = contextMenu();
    if (!menu) return;

    const close = () => closeContextMenu();
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);

    onCleanup(() => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    });
  });

  createEffect(() => {
    const frame = canvasFrameRef;
    if (!frame) return;

    const updateSize = () => {
      setCanvasFrameSize({
        width: frame.clientWidth,
        height: frame.clientHeight,
      });
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      onCleanup(() => window.removeEventListener('resize', updateSize));
      return;
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(frame);

    onCleanup(() => observer.disconnect());
  });

  createEffect(() => {
    if (typeof window === 'undefined') return;

    const timer = window.setInterval(() => setClock(Date.now()), 60 * 1000);
    onCleanup(() => window.clearInterval(timer));
  });

  createEffect(() => {
    if (!trashOpen()) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeTrashDock();
    };

    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
  });

  createEffect(() => {
    if (!layout.isMobile()) {
      setOverviewOpen(false);
      return;
    }

    if (!overviewOpen()) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOverviewOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
  });

  createEffect(() => {
    if (overviewOpen()) return;
    clearOverviewNavigation();
  });

  onCleanup(() => {
    resetCopiedNote();
    dragCleanup?.();
    clearOverviewNavigation();
  });

  const markCopied = (noteId: string) => {
    resetCopiedNote();
    setCopiedNoteId(noteId);
    copiedResetTimer = window.setTimeout(() => {
      copiedResetTimer = undefined;
      setCopiedNoteId((current) => (current === noteId ? null : current));
    }, 1100);
  };

  const promoteNote = (noteId: string) => {
    notes.bringNoteToFront(noteId);
  };

  const openEditor = (noteId: string) => {
    closeContextMenu();
    setEditingNoteId(noteId);
  };

  const closeEditor = () => {
    setEditingNoteId(null);
  };

  const saveEditor = () => {
    const noteId = editingNoteId();
    if (!noteId) return;

    notes.updateNote(noteId, {
      text: draftText(),
      colorId: draftColor(),
    });

    notifications.success('Saved', 'Note updated.');
    closeEditor();
  };

  const createNewNoteAt = (placement: ManualPasteState) => {
    const created = notes.createNote({
      topicId: placement.topicId,
      x: placement.worldX,
      y: placement.worldY,
    });

    if (!created) return;
    openEditor(created.id);
  };

  const createPastedNoteAt = (placement: ManualPasteState, text: string) => {
    const created = notes.createNote({
      topicId: placement.topicId,
      x: placement.worldX,
      y: placement.worldY,
      text,
    });

    if (!created) return;
    notifications.success('Pasted', 'Created a new note from clipboard text.');
  };

  const getViewportCenterPlacement = (): ManualPasteState | null => {
    const topic = activeTopic();
    if (!topic) return null;

    const frame = canvasFrameSize();
    if (frame.width <= 0 || frame.height <= 0) {
      return {
        topicId: topic.id,
        worldX: NOTES_CANVAS_WORLD_WIDTH / 2,
        worldY: NOTES_CANVAS_WORLD_HEIGHT / 2,
      };
    }

    const viewport = notes.activeViewport();
    return {
      topicId: topic.id,
      worldX: (frame.width / 2 - viewport.x) / viewport.scale,
      worldY: (frame.height / 2 - viewport.y) / viewport.scale,
    };
  };

  const setViewportCenter = (
    worldX: number,
    worldY: number,
    scale = notes.activeViewport().scale
  ) => {
    const topic = activeTopic();
    if (!topic) return;

    const frame = canvasFrameSize();
    const frameWidth =
      frame.width ||
      (typeof window === 'undefined' ? NOTES_DEFAULT_FRAME_WIDTH : window.innerWidth);
    const frameHeight =
      frame.height ||
      (typeof window === 'undefined' ? NOTES_DEFAULT_FRAME_HEIGHT : window.innerHeight);
    const visibleWorldWidth = frameWidth / scale;
    const visibleWorldHeight = frameHeight / scale;
    const bounds = overviewBounds();
    const centeredWorldX = clampOverviewCenter(worldX, visibleWorldWidth, bounds.minX, bounds.maxX);
    const centeredWorldY = clampOverviewCenter(
      worldY,
      visibleWorldHeight,
      bounds.minY,
      bounds.maxY
    );

    notes.setViewport(topic.id, {
      x: frameWidth / 2 - centeredWorldX * scale,
      y: frameHeight / 2 - centeredWorldY * scale,
      scale,
    });
  };

  const adjustViewportScale = (direction: 'in' | 'out') => {
    const current = notes.activeViewport();
    const nextScale = clamp(
      current.scale * (direction === 'in' ? NOTES_CANVAS_ZOOM_STEP : 1 / NOTES_CANVAS_ZOOM_STEP),
      NOTES_CANVAS_MIN_SCALE,
      NOTES_CANVAS_MAX_SCALE
    );

    if (Math.abs(nextScale - current.scale) < 0.001) return;

    const metrics = viewportMetrics();
    const centerWorldX = metrics.worldLeft + metrics.worldWidth / 2;
    const centerWorldY = metrics.worldTop + metrics.worldHeight / 2;

    setViewportCenter(centerWorldX, centerWorldY, nextScale);
  };

  const pasteNoteAt = async (placement: ManualPasteState) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        notifications.info('Clipboard empty', 'Paste text into the dialog to create a note.');
        openManualPaste(placement);
        return;
      }

      createPastedNoteAt(placement, text);
    } catch (error) {
      console.error(error);
      notifications.info('Clipboard blocked', 'Manual paste is available as a fallback.');
      openManualPaste(placement);
    }
  };

  const handleNewFromMenu = () => {
    const menu = contextMenu();
    if (!menu) return;
    closeContextMenu();
    createNewNoteAt(menu);
  };

  const openManualPaste = (placement: ManualPasteState) => {
    setManualPasteText('');
    setManualPasteTarget(placement);
  };

  const handlePasteFromMenu = async () => {
    const menu = contextMenu();
    if (!menu) return;

    closeContextMenu();
    await pasteNoteAt(menu);
  };

  const handleMobileNewNote = () => {
    const placement = getViewportCenterPlacement();
    if (!placement) return;
    setOverviewOpen(false);
    createNewNoteAt(placement);
  };

  const handleMobilePaste = async () => {
    const placement = getViewportCenterPlacement();
    if (!placement) return;
    setOverviewOpen(false);
    await pasteNoteAt(placement);
  };

  const syncOverviewToClientPoint = (
    clientX: number,
    clientY: number,
    navigationState: OverviewNavigationState
  ) => {
    const rect = navigationState.surfaceRect;
    if (rect.width <= 0 || rect.height <= 0) return;

    const pointer = getNormalizedOverviewPoint(clientX, clientY, rect);
    const centerX = clamp(pointer.x - navigationState.centerOffsetX, 0, 1);
    const centerY = clamp(pointer.y - navigationState.centerOffsetY, 0, 1);
    const bounds = navigationState.bounds;

    setViewportCenter(bounds.minX + centerX * bounds.width, bounds.minY + centerY * bounds.height);
  };

  const beginOverviewNavigation: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.button !== 0 && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;

    const surface = event.currentTarget;
    const surfaceRect = surface.getBoundingClientRect();
    if (surfaceRect.width <= 0 || surfaceRect.height <= 0) return;

    const pointer = getNormalizedOverviewPoint(event.clientX, event.clientY, surfaceRect);
    const viewport = overviewViewportMetrics();
    const pointerLeft = pointer.x * 100;
    const pointerTop = pointer.y * 100;
    const insideViewport =
      pointerLeft >= viewport.left &&
      pointerLeft <= viewport.left + viewport.width &&
      pointerTop >= viewport.top &&
      pointerTop <= viewport.top + viewport.height;
    const navigationState: OverviewNavigationState = {
      pointerId: event.pointerId,
      bounds: overviewBounds(),
      surfaceRect,
      centerOffsetX: insideViewport ? pointer.x - viewport.centerX / 100 : 0,
      centerOffsetY: insideViewport ? pointer.y - viewport.centerY / 100 : 0,
    };
    const syncPosition = (clientX: number, clientY: number) =>
      syncOverviewToClientPoint(clientX, clientY, navigationState);

    clearOverviewNavigation();
    event.preventDefault();
    event.stopPropagation();
    setOverviewNavigationState(navigationState);
    syncPosition(event.clientX, event.clientY);
    surface.setPointerCapture?.(event.pointerId);
    const controller = new AbortController();
    overviewAbortController = controller;

    const handleMove = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== event.pointerId) return;
      syncPosition(nextEvent.clientX, nextEvent.clientY);
    };

    const finish = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== event.pointerId) return;
      if (surface.hasPointerCapture?.(event.pointerId)) {
        surface.releasePointerCapture(event.pointerId);
      }

      clearOverviewNavigation();
    };

    surface.addEventListener('pointermove', handleMove, { signal: controller.signal });
    surface.addEventListener('pointerup', finish, { once: true, signal: controller.signal });
    surface.addEventListener('pointercancel', finish, {
      once: true,
      signal: controller.signal,
    });
  };

  const confirmManualPaste = () => {
    const target = manualPasteTarget();
    if (!target) return;

    const text = manualPasteText().trim();
    if (!text) return;

    createPastedNoteAt(target, manualPasteText());
    setManualPasteTarget(null);
    setManualPasteText('');
  };

  const copyNote = async (note: NotesNote) => {
    if (!note.text.trim()) {
      openEditor(note.id);
      return;
    }

    try {
      await navigator.clipboard.writeText(note.text);
      markCopied(note.id);
    } catch (error) {
      console.error(error);
      notifications.error('Copy failed', 'Clipboard write was not available.');
    }
  };

  const beginNoteDrag = (note: NotesNote, event: PointerEvent) => {
    if (event.button !== 0) return;

    closeContextMenu();
    event.preventDefault();
    event.stopPropagation();
    dragCleanup?.();
    promoteNote(note.id);

    const stopInteraction = startHotInteraction({ kind: 'drag', cursor: 'grabbing' });
    const scale = Math.max(notes.activeViewport().scale, 0.001);

    setDragState({
      noteId: note.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: note.x,
      startY: note.y,
      currentX: note.x,
      currentY: note.y,
      moved: false,
      scale,
      stopInteraction,
    });

    const handleMove = (nextEvent: PointerEvent) => {
      setDragState((current) => {
        if (!current || current.noteId !== note.id) return current;

        const nextX = current.startX + (nextEvent.clientX - current.startClientX) / current.scale;
        const nextY = current.startY + (nextEvent.clientY - current.startClientY) / current.scale;
        const moved =
          current.moved ||
          Math.abs(nextX - current.startX) > 2 ||
          Math.abs(nextY - current.startY) > 2;

        return {
          ...current,
          currentX: nextX,
          currentY: nextY,
          moved,
        };
      });
    };

    const finish = () => {
      const current = untrack(dragState);
      if (current && current.noteId === note.id) {
        notes.moveNote(note.id, {
          x: current.currentX,
          y: current.currentY,
        });
        current.stopInteraction();
      }

      setDragState(null);
      dragCleanup?.();
      dragCleanup = undefined;
    };

    const cancel = () => {
      const current = untrack(dragState);
      if (current && current.noteId === note.id) {
        current.stopInteraction();
      }

      setDragState(null);
      dragCleanup?.();
      dragCleanup = undefined;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', cancel, { once: true });

    dragCleanup = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
    };
  };

  const overviewPanel = (mode: 'desktop' | 'mobile') => (
    <div
      class={`notes-overview notes-overview--${mode}`}
      data-floe-canvas-interactive="true"
      onPointerDown={(event: PointerEvent) => event.stopPropagation()}
    >
      <div
        class="notes-overview__surface"
        classList={{ 'is-navigating': overviewNavigationState() !== null }}
        data-floe-canvas-interactive="true"
        onPointerDown={beginOverviewNavigation}
      >
        <div class="notes-overview__grid" aria-hidden="true" />
        <For each={overviewNotes()}>
          {(item) => (
            <div
              class={`notes-overview__note notes-note--${item.colorId}`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.width}%`,
                height: `${item.height}%`,
              }}
            />
          )}
        </For>
        <div class="notes-overview__viewport" style={overviewViewportStyle()} />

        <div class="notes-overview__hud" aria-hidden="true">
          <div class="notes-overview__scale">{boardScaleLabel()}</div>
        </div>

        <Show when={mode === 'mobile'}>
          <div class="notes-overview__controls">
            <div class="notes-overview__zoom-group">
              <button
                type="button"
                class="notes-overview__zoom-button"
                aria-label="Zoom out"
                onClick={() => adjustViewportScale('out')}
              >
                <Minus class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                class="notes-overview__zoom-button"
                aria-label="Zoom in"
                onClick={() => adjustViewportScale('in')}
              >
                <Plus class="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="button"
              class="notes-overview__close"
              aria-label="Close overview"
              onClick={() => setOverviewOpen(false)}
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </Show>
      </div>
    </div>
  );

  return (
    <div class="notes-page">
      <div class="notes-page__toolbar" data-floe-canvas-interactive="true">
        <div class="notes-page__toolbar-copy">
          <div class="notes-page__toolbar-topline">
            <div class="notes-page__eyebrow">Active Topic</div>
            <div class="notes-page__scale">{boardScaleLabel()}</div>
          </div>
          <div class="notes-page__title-row">
            <div class="notes-page__title">{activeTopicLabel()}</div>
          </div>
          <div class="notes-page__meta">
            <span>
              {activeNotes().length} live note{activeNotes().length === 1 ? '' : 's'}
            </span>
            <span>{notes.trashCount()} in trash</span>
          </div>
        </div>

        <Show when={layout.isMobile()}>
          <div class="notes-page__mobile-toolbar">
            <div class="notes-page__mobile-topics">
              <For each={notes.topics()}>
                {(topic) => (
                  <button
                    type="button"
                    class="notes-page__mobile-topic"
                    classList={{ 'is-active': topic.id === activeTopicId() }}
                    onClick={() => notes.setActiveTopic(topic.id)}
                  >
                    {topic.title}
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>

      <div class="notes-page__canvas" ref={canvasFrameRef}>
        <InfiniteCanvas
          ariaLabel={`Canvas for ${activeTopicLabel()}`}
          class="notes-canvas"
          viewport={notes.activeViewport()}
          onViewportChange={(viewport) => {
            const topic = activeTopic();
            if (!topic) return;
            notes.setViewport(topic.id, viewport);
          }}
          onCanvasContextMenu={(event) => {
            const topic = activeTopic();
            if (!topic) return;

            setContextMenu({
              clientX: event.clientX,
              clientY: event.clientY,
              worldX: event.worldX,
              worldY: event.worldY,
              topicId: topic.id,
            });
          }}
        >
          <div class="notes-canvas__field">
            <For each={activeNotes()}>
              {(note) => {
                const sizeBucket = createMemo(() => notes.getNoteSize(note.text));
                const dimensions = createMemo(() => NOTES_SIZE_DIMENSIONS[sizeBucket()]);
                const preview = createMemo(() =>
                  notes.getTextPreview(note.text, dimensions().previewLimit)
                );
                const isCopied = () => copiedNoteId() === note.id;
                const isEmpty = createMemo(() => !note.text.trim());
                const isDragging = () => dragState()?.noteId === note.id;
                const livePosition = () => {
                  const currentDrag = dragState();
                  if (currentDrag?.noteId === note.id) {
                    return { x: currentDrag.currentX, y: currentDrag.currentY };
                  }

                  return { x: note.x, y: note.y };
                };

                return (
                  <article
                    class={`notes-note notes-note--${note.colorId} notes-note--size-${sizeBucket()}`}
                    classList={{
                      'is-copied': isCopied(),
                      'is-dragging': isDragging(),
                    }}
                    onClick={() => promoteNote(note.id)}
                    style={{
                      transform: `translate(${livePosition().x}px, ${livePosition().y}px)`,
                      '--note-width': `${dimensions().width}px`,
                      '--note-height': `${dimensions().height}px`,
                      'z-index': isDragging() ? `${topActiveLayer() + 1}` : `${note.layer}`,
                    }}
                  >
                    <div class="notes-note__surface">
                      <header class="notes-note__header">
                        <button
                          type="button"
                          class="notes-note__drag"
                          aria-label="Drag note"
                          data-floe-canvas-interactive="true"
                          onPointerDown={(event) => beginNoteDrag(note, event)}
                        >
                          <GripVertical class="w-3.5 h-3.5" />
                        </button>

                        <div class="notes-note__actions">
                          <button
                            type="button"
                            class="notes-note__icon-button"
                            data-floe-canvas-interactive="true"
                            aria-label="Edit note"
                            onClick={() => openEditor(note.id)}
                          >
                            <Pencil class="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            class="notes-note__icon-button is-danger"
                            data-floe-canvas-interactive="true"
                            aria-label="Move note to trash"
                            onClick={() => {
                              notes.trashNote(note.id);
                              setTrashOpen(true);
                            }}
                          >
                            <Trash class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </header>

                      <button
                        type="button"
                        class="notes-note__body"
                        classList={{ 'is-empty': isEmpty() }}
                        data-floe-canvas-interactive="true"
                        data-floe-canvas-pan-surface="true"
                        onClick={() => void copyNote(note)}
                      >
                        <span>{preview()}</span>
                      </button>

                      <Show when={isCopied()}>
                        <div class="notes-note__copied-state" aria-hidden="true">
                          <div class="notes-note__copied-pill">
                            <span class="notes-note__copied-icon">
                              <Check class="w-3.5 h-3.5" />
                            </span>
                            <span class="notes-note__copied-copy">Copied</span>
                          </div>
                        </div>
                      </Show>
                    </div>
                  </article>
                );
              }}
            </For>
          </div>
        </InfiniteCanvas>
      </div>

      <Show when={!layout.isMobile()}>{overviewPanel('desktop')}</Show>

      <Show when={layout.isMobile() && !overviewOpen()}>
        <div class="notes-mobile-dock" data-floe-canvas-interactive="true">
          <button
            type="button"
            class="notes-mobile-dock__action"
            aria-label="Create note at canvas center"
            onClick={handleMobileNewNote}
          >
            <Plus class="w-4 h-4" />
            <span>New</span>
          </button>
          <button
            type="button"
            class="notes-mobile-dock__action"
            aria-label="Paste note at canvas center"
            onClick={() => void handleMobilePaste()}
          >
            <Paste class="w-4 h-4" />
            <span>Paste</span>
          </button>
          <button
            type="button"
            class="notes-mobile-dock__action is-emphasis"
            aria-label="Open overview map"
            onClick={() => setOverviewOpen(true)}
          >
            <Layers class="w-4 h-4" />
            <span>Map</span>
          </button>
        </div>
      </Show>

      <Presence>
        <Show when={layout.isMobile() && overviewOpen()}>
          <Portal>
            <Motion.div
              class="notes-overview-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.fast }}
              onClick={() => setOverviewOpen(false)}
            />
            <Motion.div
              class="notes-overview-flyout"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: duration.normal, easing: easing.easeOut }}
            >
              {overviewPanel('mobile')}
            </Motion.div>
          </Portal>
        </Show>
      </Presence>

      <div
        class="notes-trash"
        classList={{ 'is-open': trashOpen() }}
        data-floe-canvas-interactive="true"
      >
        <Show when={!trashOpen()}>
          <button
            type="button"
            class="notes-trash__toggle"
            aria-label={`Open trash dock${notes.trashCount() > 0 ? `, ${notes.trashCount()} items` : ''}`}
            onClick={() => setTrashOpen(true)}
          >
            <div class="notes-trash__toggle-mark">
              <NotesTrashDockIcon class="notes-trash__toggle-icon" />
            </div>
          </button>
        </Show>

        <Presence>
          <Show when={trashOpen()}>
            <Portal>
              <Motion.div
                class="notes-trash-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: duration.fast }}
                onClick={closeTrashDock}
              />
              <Motion.div
                class="notes-trash__flyout"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                transition={{ duration: duration.normal, easing: easing.easeOut }}
              >
                <div
                  class="notes-trash__panel"
                  onPointerDown={(event: PointerEvent) => event.stopPropagation()}
                >
                  <div class="notes-trash__panel-header">
                    <div class="notes-trash__panel-title-group">
                      <div class="notes-trash__panel-title-row">
                        <div class="notes-trash__panel-title">Trash Dock</div>
                        <div class="notes-trash__panel-header-actions">
                          <div class="notes-trash__panel-count">{notes.trashCount()} items</div>
                          <button
                            type="button"
                            class="notes-trash__panel-close"
                            aria-label="Close trash dock"
                            onClick={closeTrashDock}
                          >
                            <X class="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div class="notes-trash__panel-body">
                        Grouped by topic, sorted by latest deletion, and recoverable for 72 hours.
                      </div>
                    </div>
                  </div>

                  <Show
                    when={trashSections().length > 0}
                    fallback={
                      <div class="notes-trash__empty">
                        <NotesTrashDockIcon class="notes-trash__empty-icon" />
                        <div>
                          <strong>Trash is empty</strong>
                          <span>Deleted notes from any topic will appear here.</span>
                        </div>
                      </div>
                    }
                  >
                    <div class="notes-trash__sections">
                      <For each={trashSections()}>
                        {(section) => (
                          <section class="notes-trash-section">
                            <div class="notes-trash-section__header">
                              <div class="notes-trash-section__title-group">
                                <div class="notes-trash-section__title">{section.topic.title}</div>
                                <div class="notes-trash-section__meta">
                                  {section.notes.length} deleted note
                                  {section.notes.length === 1 ? '' : 's'}
                                </div>
                              </div>
                              <button
                                type="button"
                                class="notes-trash-section__clear"
                                onClick={() => notes.clearTrashForTopic(section.topic.id)}
                              >
                                Clear topic trash
                              </button>
                            </div>

                            <div class="notes-trash-section__grid">
                              <For each={section.notes}>
                                {(note) => {
                                  const sizeBucket = notes.getNoteSize(note.text);
                                  const dimensions = NOTES_SIZE_DIMENSIONS[sizeBucket];
                                  const preview = notes.getTextPreview(
                                    note.text,
                                    dimensions.previewLimit
                                  );

                                  return (
                                    <article
                                      class={`notes-note notes-trash-note notes-note--${note.colorId} notes-note--size-${sizeBucket}`}
                                      style={{
                                        '--note-width': `${dimensions.width}px`,
                                        '--note-height': `${dimensions.height}px`,
                                      }}
                                    >
                                      <div class="notes-note__surface">
                                        <div class="notes-trash-note__meta">
                                          <span>{formatDeletedTimestamp(note.deletedAt)}</span>
                                          <strong>
                                            {formatRemainingTrashTime(note.deletedAt, clock())}
                                          </strong>
                                        </div>

                                        <div class="notes-trash-note__body">
                                          <span>{preview}</span>
                                        </div>

                                        <div class="notes-trash-note__actions">
                                          <button
                                            type="button"
                                            onClick={() => notes.restoreNote(note.id)}
                                          >
                                            Restore
                                          </button>
                                          <button
                                            type="button"
                                            class="is-danger"
                                            onClick={() => notes.deleteNotePermanently(note.id)}
                                          >
                                            Delete now
                                          </button>
                                        </div>
                                      </div>
                                    </article>
                                  );
                                }}
                              </For>
                            </div>
                          </section>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              </Motion.div>
            </Portal>
          </Show>
        </Presence>
      </div>

      <Presence>
        <Show when={contextMenu()}>
          <Portal>
            <Motion.div
              class="notes-menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.fast }}
              onClick={closeContextMenu}
            />
            <Motion.div
              class="notes-menu"
              style={contextMenuPosition()}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: duration.fast, easing: easing.easeOut }}
              onPointerDown={(event: PointerEvent) => event.stopPropagation()}
            >
              <button
                type="button"
                class="notes-menu__item"
                onClick={() => void handlePasteFromMenu()}
              >
                <Paste class="w-4 h-4" />
                <span>Paste here</span>
              </button>
              <button type="button" class="notes-menu__item" onClick={handleNewFromMenu}>
                <Plus class="w-4 h-4" />
                <span>New note</span>
              </button>
            </Motion.div>
          </Portal>
        </Show>
      </Presence>

      <Dialog
        open={Boolean(editingNote())}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
        title="Edit note"
        description="Update note text or switch to another color."
        footer={
          <>
            <Button variant="ghost" onClick={closeEditor}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveEditor}>
              Save
            </Button>
          </>
        }
      >
        <div class="notes-editor">
          <div class="notes-editor__palette">
            <div class="notes-editor__label">Color</div>
            <div class="notes-editor__swatches">
              <For each={notes.colorOptions}>
                {(option) => (
                  <button
                    type="button"
                    class={`notes-editor__swatch notes-note--${option.id}`}
                    classList={{ 'is-active': draftColor() === option.id }}
                    onClick={() => setDraftColor(option.id)}
                  >
                    <span>{option.name}</span>
                  </button>
                )}
              </For>
            </div>
          </div>

          <div class="notes-editor__field">
            <div class="notes-editor__label">Text</div>
            <Textarea
              rows={9}
              value={draftText()}
              onInput={(event) => setDraftText(event.currentTarget.value)}
              placeholder="Type or paste anything worth keeping..."
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(manualPasteTarget())}
        onOpenChange={(open) => {
          if (!open) {
            setManualPasteTarget(null);
            setManualPasteText('');
          }
        }}
        title="Paste text"
        description="Clipboard access was unavailable, so you can paste the content manually here."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setManualPasteTarget(null);
                setManualPasteText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!manualPasteText().trim()}
              onClick={confirmManualPaste}
            >
              Create note
            </Button>
          </>
        }
      >
        <Textarea
          rows={10}
          value={manualPasteText()}
          onInput={(event) => setManualPasteText(event.currentTarget.value)}
          placeholder="Paste clipboard text here..."
        />
      </Dialog>
    </div>
  );
};
