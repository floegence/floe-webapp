import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
  type JSX,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { Motion, Presence } from 'solid-motionone';
import {
  duration,
  easing,
} from '../../utils/animations';
import { startHotInteraction } from '../../utils/hotInteraction';
import { useNotification } from '../../context';
import { Check, GripVertical, Layers, Minus, Paste, Pencil, Plus, Trash, X } from '../../icons';
import { Button, InfiniteCanvas, Input, Textarea } from '../../ui';
import {
  computeBoardBounds,
  mergeBoardBounds,
  NOTES_SCALE_MAX,
  NOTES_SCALE_MIN,
  type NoteColorToken,
  type NotesController,
  type NotesItem,
  type NotesTrashItem,
  type NotesTopic as CanonicalNotesTopic,
  visibleWorldRect,
} from './types';

type NotesColorId = 'butter' | 'blush' | 'moss' | 'mist' | 'sand' | 'coral';
type NotesTopicIconId = 'hare' | 'fox' | 'otter' | 'koi' | 'swallow' | 'crane';
type NotesTopicToneId = 'amber' | 'coral' | 'mint' | 'sky' | 'plum' | 'rose';
type NotesSizeBucket = 0 | 1 | 2 | 3 | 4;

interface NotesColorOption {
  id: NotesColorId;
  name: string;
  token: NoteColorToken;
}

interface NotesTopic {
  id: string;
  title: string;
  iconId: NotesTopicIconId;
  toneId: NotesTopicToneId;
  deletedAt: number | null;
  createdAt: number;
}

interface NotesNote {
  id: string;
  topicId: string;
  text: string;
  colorId: NotesColorId;
  x: number;
  y: number;
  layer: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  sizeBucket: NotesSizeBucket;
}

interface NotesTrashNote extends NotesNote {
  deletedAt: number;
  topicName: string;
  topicIconId: NotesTopicIconId;
  topicToneId: NotesTopicToneId;
  topicSortOrder: number;
}

const NOTES_COLOR_OPTIONS: NotesColorOption[] = [
  { id: 'butter', name: 'Butter', token: 'amber' },
  { id: 'blush', name: 'Blush', token: 'rose' },
  { id: 'moss', name: 'Moss', token: 'sage' },
  { id: 'mist', name: 'Mist', token: 'azure' },
  { id: 'sand', name: 'Sand', token: 'graphite' },
  { id: 'coral', name: 'Coral', token: 'coral' },
];

const NOTES_SIZE_DIMENSIONS: Record<
  NotesSizeBucket,
  { width: number; height: number; previewLimit: number }
> = {
  0: { width: 196, height: 134, previewLimit: 68 },
  1: { width: 214, height: 148, previewLimit: 90 },
  2: { width: 232, height: 164, previewLimit: 112 },
  3: { width: 248, height: 182, previewLimit: 138 },
  4: { width: 266, height: 202, previewLimit: 164 },
};

const NOTES_TRASH_RETENTION_MS = 72 * 60 * 60 * 1000;
const NOTES_CANVAS_MIN_SCALE = NOTES_SCALE_MIN;
const NOTES_CANVAS_MAX_SCALE = NOTES_SCALE_MAX;
const NOTES_CANVAS_ZOOM_STEP = 1.18;
const NOTES_DEFAULT_FRAME_WIDTH = 1280;
const NOTES_DEFAULT_FRAME_HEIGHT = 880;
const MOBILE_BREAKPOINT_PX = 960;

function normalizeText(text: string): string {
  return String(text ?? '').replace(/\r\n/g, '\n').trim();
}

function getTextPreview(text: string, limit = 90): string {
  const normalized = normalizeText(text).replace(/\n{3,}/g, '\n\n');
  if (!normalized) return 'Empty note';
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function toLegacyColorId(colorToken: NoteColorToken): NotesColorId {
  switch (colorToken) {
    case 'amber':
      return 'butter';
    case 'rose':
      return 'blush';
    case 'sage':
      return 'moss';
    case 'azure':
      return 'mist';
    case 'coral':
      return 'coral';
    case 'graphite':
    default:
      return 'sand';
  }
}

function toColorToken(colorId: NotesColorId): NoteColorToken {
  switch (colorId) {
    case 'butter':
      return 'amber';
    case 'blush':
      return 'rose';
    case 'moss':
      return 'sage';
    case 'mist':
      return 'azure';
    case 'coral':
      return 'coral';
    case 'sand':
    default:
      return 'graphite';
  }
}

function toLegacyTopicIconId(iconKey: CanonicalNotesTopic['icon_key']): NotesTopicIconId {
  switch (iconKey) {
    case 'hare':
      return 'hare';
    case 'fox':
      return 'fox';
    case 'otter':
      return 'otter';
    case 'crane':
      return 'crane';
    case 'whale':
      return 'koi';
    case 'lynx':
    default:
      return 'swallow';
  }
}

function toLegacyTopicToneId(iconAccent: CanonicalNotesTopic['icon_accent']): NotesTopicToneId {
  switch (iconAccent) {
    case 'gold':
      return 'amber';
    case 'ember':
      return 'coral';
    case 'moss':
      return 'mint';
    case 'sea':
      return 'sky';
    case 'ink':
      return 'plum';
    case 'berry':
    default:
      return 'rose';
  }
}

function toLegacySizeBucket(sizeBucket: number): NotesSizeBucket {
  const rounded = Math.round(Number(sizeBucket) || 1);
  if (rounded <= 1) return 0;
  if (rounded >= 5) return 4;
  return (rounded - 1) as NotesSizeBucket;
}

function mapTopic(topic: CanonicalNotesTopic): NotesTopic {
  return {
    id: topic.topic_id,
    title: topic.name,
    iconId: toLegacyTopicIconId(topic.icon_key),
    toneId: toLegacyTopicToneId(topic.icon_accent),
    deletedAt: topic.deleted_at_unix_ms > 0 ? topic.deleted_at_unix_ms : null,
    createdAt: topic.created_at_unix_ms,
  };
}

function mapNote(item: NotesItem): NotesNote {
  return {
    id: item.note_id,
    topicId: item.topic_id,
    text: item.body,
    colorId: toLegacyColorId(item.color_token),
    x: item.x,
    y: item.y,
    layer: item.z_index,
    createdAt: item.created_at_unix_ms,
    updatedAt: item.updated_at_unix_ms,
    deletedAt: null,
    sizeBucket: toLegacySizeBucket(item.size_bucket),
  };
}

function mapTrashNote(item: NotesTrashItem): NotesTrashNote {
  return {
    id: item.note_id,
    topicId: item.topic_id,
    text: item.body,
    colorId: toLegacyColorId(item.color_token),
    x: item.x,
    y: item.y,
    layer: item.z_index,
    createdAt: item.created_at_unix_ms,
    updatedAt: item.updated_at_unix_ms,
    deletedAt: item.deleted_at_unix_ms,
    sizeBucket: toLegacySizeBucket(item.size_bucket),
    topicName: item.topic_name,
    topicIconId: toLegacyTopicIconId(item.topic_icon_key),
    topicToneId: toLegacyTopicToneId(item.topic_icon_accent),
    topicSortOrder: item.topic_sort_order,
  };
}

interface CanvasMenuState {
  clientX: number;
  clientY: number;
  worldX: number;
  worldY: number;
  topicId: string;
  noteId?: string | null;
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
  notes: NotesTrashNote[];
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

function NotesTopicAnimalIcon(props: { iconId: NotesTopicIconId; class?: string }) {
  const icon = createMemo(() => {
    switch (props.iconId) {
      case 'hare':
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            class={props.class}
            aria-hidden="true"
          >
            <path d="M8.5 18.1c0-3.2 1.6-5.2 3.5-5.2s3.5 2 3.5 5.2" />
            <path d="M9.5 12.2 8.3 5.3c-.2-1 .3-1.8 1.1-2 .8-.2 1.5.3 1.7 1.2l.8 4.9" />
            <path d="m14.5 12.2 1.1-6.6c.2-.9.9-1.4 1.7-1.2.8.2 1.3 1 1.1 2l-1.1 5.8" />
            <path d="M10 16.2h.01" />
            <path d="M14 16.2h.01" />
            <path d="M11.2 18.1c.3.4.7.6 1.2.6s.9-.2 1.2-.6" />
          </svg>
        );
      case 'fox':
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            class={props.class}
            aria-hidden="true"
          >
            <path d="m8.3 8-2.2-3.7 4.1 1.9" />
            <path d="m15.7 8 2.2-3.7-4.1 1.9" />
            <path d="M12 19.3c-3.7 0-6-2.7-6-6.3 0-1.7.6-3.3 2.3-5L12 10.9 15.7 8c1.7 1.7 2.3 3.3 2.3 5 0 3.6-2.3 6.3-6 6.3Z" />
            <path d="M10 14.6h.01" />
            <path d="M14 14.6h.01" />
            <path d="M10.8 17c.4.3.8.5 1.2.5s.8-.2 1.2-.5" />
          </svg>
        );
      case 'otter':
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            class={props.class}
            aria-hidden="true"
          >
            <path d="M7.4 18.4c0-3.9 2-6.3 4.6-6.3s4.6 2.4 4.6 6.3" />
            <path d="M9 11.2 7.7 8.4l2.7.7" />
            <path d="m15 11.2 1.3-2.8-2.7.7" />
            <path d="M10 15.1h.01" />
            <path d="M14 15.1h.01" />
            <path d="M12 16.2c.7 0 1.2-.4 1.2-1s-.5-1-1.2-1-1.2.4-1.2 1 .5 1 1.2 1Z" />
            <path d="M7.3 15.7 5 15.1" />
            <path d="m16.7 15.7 2.3-.6" />
          </svg>
        );
      case 'koi':
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            class={props.class}
            aria-hidden="true"
          >
            <path d="M5.5 12c2.2-3.2 5-4.8 8.3-4.8 3.2 0 4.7 2.1 4.7 4.8s-1.5 4.8-4.7 4.8c-3.3 0-6.1-1.6-8.3-4.8Z" />
            <path d="m5.5 12-2.8-2.7v5.4Z" />
            <path d="M15.9 10.1h.01" />
            <path d="M11.7 12c1.1 0 2 .9 2 2" />
            <path d="M11.7 12c1.1 0 2-.9 2-2" />
          </svg>
        );
      case 'swallow':
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            class={props.class}
            aria-hidden="true"
          >
            <path d="M4 12.8c2.7-3.6 5.6-5.4 8.5-5.4 1.8 0 3.4.6 4.9 1.8" />
            <path d="M20 11.2c-2.7 3.6-5.6 5.4-8.5 5.4-1.8 0-3.4-.6-4.9-1.8" />
            <path d="m13.4 11.2 6.1-.8-3.7 3.8" />
            <path d="m10.6 12.8-6.1.8 3.7-3.8" />
          </svg>
        );
      case 'crane':
      default:
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            class={props.class}
            aria-hidden="true"
          >
            <path d="M8.5 18.6c0-3.8 1.8-5.9 4.2-5.9 2.6 0 3.8 2.1 3.8 5.9" />
            <path d="M12.6 12.7V8.6c0-2.2 1.5-4.2 4.1-4.2h2" />
            <path d="m18.7 4.4 2.2-1.5" />
            <path d="M9 12.7 7.1 10" />
            <path d="M10.2 15.5h.01" />
            <path d="M14.1 15.5h.01" />
          </svg>
        );
    }
  });

  return <>{icon()}</>;
}

export interface NotesOverlayProps {
  open: boolean;
  onClose: () => void;
  controller: NotesController;
}

export function NotesOverlay(props: NotesOverlayProps) {
  const notifications = useNotification();

  const [contextMenu, setContextMenu] = createSignal<CanvasMenuState | null>(null);
  const [draftTopicTitle, setDraftTopicTitle] = createSignal('');
  const [renamingTopicId, setRenamingTopicId] = createSignal<string | null>(null);
  const [renamingTopicTitle, setRenamingTopicTitle] = createSignal('');
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
  const [isMobile, setIsMobile] = createSignal(false);

  const snapshot = createMemo(() => props.controller.snapshot());
  const liveTopics = createMemo(() => snapshot().topics.map(mapTopic));
  const liveNotes = createMemo(() => snapshot().items.map(mapNote));
  const trashNotes = createMemo(() => snapshot().trash_items.map(mapTrashNote));
  const activeCanonicalTopicID = createMemo(() => props.controller.activeTopicID());

  const getTopic = (topicId: string) => liveTopics().find((topic) => topic.id === topicId);
  const getNoteById = (noteId: string) => liveNotes().find((note) => note.id === noteId);
  const getNotesForTopic = (topicId: string, options?: { includeDeleted?: boolean }) => {
    const current = liveNotes().filter((note) => note.topicId === topicId);
    if (!options?.includeDeleted) return current;
    return [...current, ...trashNotes().filter((note) => note.topicId === topicId)];
  };
  const getLiveNoteCount = (topicId: string) =>
    liveNotes().reduce((count, note) => count + (note.topicId === topicId ? 1 : 0), 0);

  const resolvedActiveTopicID = createMemo(() => {
    const current = activeCanonicalTopicID();
    if (liveTopics().some((topic) => topic.id === current)) return current;
    return liveTopics()[0]?.id ?? '';
  });

  const notes = {
    topics: liveTopics,
    activeTopicId: resolvedActiveTopicID,
    activeTopic: () => getTopic(resolvedActiveTopicID()),
    activeViewport: () => props.controller.viewport(),
    trashedNotes: trashNotes,
    trashCount: () => trashNotes().length,
    colorOptions: NOTES_COLOR_OPTIONS,
    getTopic,
    getViewport: (_topicId?: string) => props.controller.viewport(),
    getNotesForTopic,
    getNoteById,
    getLiveNoteCount,
    createTopic: async (title: string) => {
      const topic = await props.controller.createTopic({ name: title.trim() });
      return mapTopic(topic);
    },
    updateTopic: async (topicId: string, input: { title?: string }) => {
      const topic = await props.controller.updateTopic(topicId, {
        name: String(input.title ?? '').trim(),
      });
      return mapTopic(topic);
    },
    deleteTopic: (topicId: string) => props.controller.deleteTopic(topicId),
    setActiveTopic: (topicId: string) => props.controller.setActiveTopicID(topicId),
    setViewport: (_topicId: string, viewport: { x: number; y: number; scale: number }) =>
      props.controller.setViewport(viewport),
    createNote: async (input: {
      topicId?: string;
      x: number;
      y: number;
      text?: string;
      colorId?: NotesColorId;
    }) => {
      const topicId = input.topicId ?? resolvedActiveTopicID();
      if (!topicId) return undefined;
      const note = await props.controller.createNote({
        topic_id: topicId,
        x: input.x,
        y: input.y,
        body: input.text ?? '',
        color_token: input.colorId ? toColorToken(input.colorId) : undefined,
      });
      return mapNote(note);
    },
    updateNote: async (noteId: string, input: { text?: string; colorId?: NotesColorId }) => {
      const note = await props.controller.updateNote(noteId, {
        body: input.text,
        color_token: input.colorId ? toColorToken(input.colorId) : undefined,
      });
      return mapNote(note);
    },
    moveNote: async (noteId: string, position: { x: number; y: number }) => {
      const note = await props.controller.updateNote(noteId, {
        x: position.x,
        y: position.y,
      });
      return mapNote(note);
    },
    bringNoteToFront: (noteId: string) => props.controller.bringNoteToFront(noteId),
    trashNote: (noteId: string) => props.controller.deleteNote(noteId),
    restoreNote: async (noteId: string) => {
      const note = await props.controller.restoreNote(noteId);
      return mapNote(note);
    },
    deleteNotePermanently: (noteId: string) =>
      props.controller.deleteTrashedNotePermanently?.(noteId),
    clearTrashForTopic: (topicId: string) => props.controller.clearTrashTopic(topicId),
  };

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
  const totalLiveNotes = createMemo(() =>
    notes.topics().reduce((count, topic) => count + notes.getLiveNoteCount(topic.id), 0)
  );
  const activeTopicLabel = createMemo(() => activeTopic()?.title ?? 'No topic');
  const boardScaleLabel = createMemo(() => `${Math.round(notes.activeViewport().scale * 100)}%`);
  const topActiveLayer = createMemo(() =>
    activeNotes().reduce((maxLayer, note) => Math.max(maxLayer, note.layer), 1)
  );
  const activeSnapshotItems = createMemo(() =>
    snapshot()
      .items.filter((item) => item.topic_id === resolvedActiveTopicID())
      .slice()
      .sort(
        (left, right) =>
          left.z_index - right.z_index ||
          left.created_at_unix_ms - right.created_at_unix_ms ||
          left.note_id.localeCompare(right.note_id)
      )
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
      sizeBucket: note.sizeBucket,
    }));
  });
  const overviewBounds = createMemo<OverviewBounds>(() => {
    const frame = canvasFrameSize();
    const visible = visibleWorldRect(
      notes.activeViewport(),
      frame.width > 0 ? frame.width : NOTES_DEFAULT_FRAME_WIDTH,
      frame.height > 0 ? frame.height : NOTES_DEFAULT_FRAME_HEIGHT
    );
    const bounds = mergeBoardBounds(computeBoardBounds(activeSnapshotItems()), visible);

    return {
      minX: bounds.minX,
      minY: bounds.minY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
    };
  });
  const overviewNotes = createMemo(() => {
    const bounds = overviewBounds();
    const notesForOverview = overviewSourceNotes();

    return notesForOverview.map((note) => {
      const dimensions = NOTES_SIZE_DIMENSIONS[note.sizeBucket];

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
      const topic =
        notes.getTopic(note.topicId) ??
        ({
          id: note.topicId,
          title: note.topicName,
          iconId: note.topicIconId,
          toneId: note.topicToneId,
          deletedAt: note.deletedAt,
          createdAt: note.createdAt,
        } satisfies NotesTopic);

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
      .sort(
        (a, b) =>
          b.latestDeletedAt - a.latestDeletedAt ||
          ('topicSortOrder' in a.notes[0]! ? a.notes[0]!.topicSortOrder : 0) -
            ('topicSortOrder' in b.notes[0]! ? b.notes[0]!.topicSortOrder : 0)
      );
  });

  const contextMenuPosition = createMemo(() => {
    const menu = contextMenu();
    if (!menu) return undefined;

    const menuWidth = 224;
    const menuHeight = menu.noteId ? 184 : 132;
    const maxX = typeof window === 'undefined' ? menu.clientX : window.innerWidth - menuWidth;
    const maxY = typeof window === 'undefined' ? menu.clientY : window.innerHeight - menuHeight;

    return {
      left: `${Math.max(16, Math.min(menu.clientX, maxX))}px`,
      top: `${Math.max(16, Math.min(menu.clientY, maxY))}px`,
    };
  });

  const closeContextMenu = () => setContextMenu(null);
  const closeTrashDock = () => setTrashOpen(false);
  const closeOverlay = () => {
    closeContextMenu();
    closeTrashDock();
    setOverviewOpen(false);
    setRenamingTopicId(null);
    setRenamingTopicTitle('');
    setEditingNoteId(null);
    setManualPasteTarget(null);
    setManualPasteText('');
    props.onClose();
  };
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
    if (typeof window === 'undefined') return;

    const syncLayoutMode = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    };

    syncLayoutMode();
    window.addEventListener('resize', syncLayoutMode);
    onCleanup(() => window.removeEventListener('resize', syncLayoutMode));
  });

  createEffect(() => {
    const resolved = resolvedActiveTopicID();
    if (!resolved) return;
    if (activeCanonicalTopicID() === resolved) return;
    props.controller.setActiveTopicID(resolved);
  });

  createEffect(() => {
    if (props.open) return;
    closeContextMenu();
    closeTrashDock();
    setOverviewOpen(false);
    setEditingNoteId(null);
    setManualPasteTarget(null);
  });

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
    if (!trashOpen()) return;
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
    if (!isMobile()) {
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
    void Promise.resolve(notes.bringNoteToFront(noteId)).catch(() => undefined);
  };

  const submitTopic: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault();
    const title = draftTopicTitle().trim();
    if (!title) return;
    try {
      const topic = await notes.createTopic(title);
      setDraftTopicTitle('');
      notes.setActiveTopic(topic.id);
    } catch (error) {
      notifications.error('Topic failed', error instanceof Error ? error.message : String(error));
    }
  };

  const beginTopicRename = (topic: NotesTopic) => {
    setRenamingTopicId(topic.id);
    setRenamingTopicTitle(topic.title);
  };

  const cancelTopicRename = () => {
    setRenamingTopicId(null);
    setRenamingTopicTitle('');
  };

  const saveTopicRename = async () => {
    const topicId = renamingTopicId();
    if (!topicId) return;
    const nextTitle = renamingTopicTitle().trim();
    cancelTopicRename();
    if (!nextTitle) return;
    try {
      await notes.updateTopic(topicId, { title: nextTitle });
    } catch (error) {
      notifications.error('Rename failed', error instanceof Error ? error.message : String(error));
    }
  };

  const handleDeleteTopic = async (topic: NotesTopic) => {
    const notesForTopic = notes.getNotesForTopic(topic.id, { includeDeleted: true }).length;
    if (renamingTopicId() === topic.id) {
      cancelTopicRename();
    }

    try {
      const deleted = await notes.deleteTopic(topic.id);
      if (deleted === false) {
        notifications.info('Keep one topic', 'At least one topic needs to remain available.');
        return;
      }

      if (notesForTopic > 0) {
        setTrashOpen(true);
        notifications.success('Topic deleted', 'Live notes moved into trash for this topic.');
        return;
      }

      notifications.success('Topic deleted', 'The empty topic was removed.');
    } catch (error) {
      notifications.error('Delete failed', error instanceof Error ? error.message : String(error));
    }
  };

  const openEditor = (noteId: string) => {
    closeContextMenu();
    setEditingNoteId(noteId);
  };

  const closeEditor = () => {
    setEditingNoteId(null);
  };

  const saveEditor = async () => {
    const noteId = editingNoteId();
    if (!noteId) return;

    try {
      await notes.updateNote(noteId, {
        text: draftText(),
        colorId: draftColor(),
      });
      notifications.success('Saved', 'Note updated.');
      closeEditor();
    } catch (error) {
      notifications.error('Save failed', error instanceof Error ? error.message : String(error));
    }
  };

  const createNewNoteAt = async (placement: ManualPasteState) => {
    try {
      const created = await notes.createNote({
        topicId: placement.topicId,
        x: placement.worldX,
        y: placement.worldY,
      });

      if (!created) return;
      openEditor(created.id);
    } catch (error) {
      notifications.error('Create failed', error instanceof Error ? error.message : String(error));
    }
  };

  const createPastedNoteAt = async (placement: ManualPasteState, text: string) => {
    try {
      const created = await notes.createNote({
        topicId: placement.topicId,
        x: placement.worldX,
        y: placement.worldY,
        text,
      });

      if (!created) return;
      notifications.success('Pasted', 'Created a new note from clipboard text.');
    } catch (error) {
      notifications.error('Paste failed', error instanceof Error ? error.message : String(error));
    }
  };

  const getPlacementFromClientPoint = (
    clientX: number,
    clientY: number,
    topicId = activeTopic()?.id
  ): ManualPasteState | null => {
    if (!topicId) return null;

    const topic = notes.getTopic(topicId);
    if (!topic || topic.deletedAt !== null) return null;

    const frame = canvasFrameRef;
    if (!frame) return getViewportCenterPlacement();

    const rect = frame.getBoundingClientRect();
    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }

    const viewport = notes.getViewport(topic.id);

    return {
      topicId: topic.id,
      worldX: (clientX - rect.left - viewport.x) / viewport.scale,
      worldY: (clientY - rect.top - viewport.y) / viewport.scale,
    };
  };

  const openContextMenuAtClientPoint = (
    clientX: number,
    clientY: number,
    options?: { topicId?: string; noteId?: string | null }
  ) => {
    const placement = getPlacementFromClientPoint(clientX, clientY, options?.topicId);
    if (!placement) return false;

    setContextMenu({
      clientX,
      clientY,
      worldX: placement.worldX,
      worldY: placement.worldY,
      topicId: placement.topicId,
      noteId: options?.noteId ?? null,
    });

    return true;
  };

  const getViewportCenterPlacement = (): ManualPasteState | null => {
    const topic = activeTopic();
    if (!topic) return null;

    const frame = canvasFrameSize();
    if (frame.width <= 0 || frame.height <= 0) {
      const metrics = viewportMetrics();
      return {
        topicId: topic.id,
        worldX: metrics.worldLeft + metrics.worldWidth / 2,
        worldY: metrics.worldTop + metrics.worldHeight / 2,
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

      await createPastedNoteAt(placement, text);
    } catch (error) {
      console.error(error);
      notifications.info('Clipboard blocked', 'Manual paste is available as a fallback.');
      openManualPaste(placement);
    }
  };

  const handleNewFromMenu = async () => {
    const menu = contextMenu();
    if (!menu) return;
    closeContextMenu();
    await createNewNoteAt(menu);
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

  const moveNoteToTrash = async (noteId: string) => {
    try {
      await notes.trashNote(noteId);
      resetCopiedNote();
      setCopiedNoteId((current) => (current === noteId ? null : current));
      setTrashOpen(true);
    } catch (error) {
      notifications.error('Delete failed', error instanceof Error ? error.message : String(error));
    }
  };

  const restoreTrashedNote = async (noteId: string) => {
    try {
      await notes.restoreNote(noteId);
    } catch (error) {
      notifications.error('Restore failed', error instanceof Error ? error.message : String(error));
    }
  };

  const deleteTrashedNoteNow = async (noteId: string) => {
    if (!props.controller.deleteTrashedNotePermanently) return;
    try {
      await notes.deleteNotePermanently(noteId);
    } catch (error) {
      notifications.error('Delete failed', error instanceof Error ? error.message : String(error));
    }
  };

  const clearTopicTrash = async (topicId: string) => {
    try {
      await notes.clearTrashForTopic(topicId);
    } catch (error) {
      notifications.error('Trash failed', error instanceof Error ? error.message : String(error));
    }
  };

  const handleDeleteFromMenu = async () => {
    const menu = contextMenu();
    if (!menu?.noteId) return;

    closeContextMenu();
    await moveNoteToTrash(menu.noteId);
  };

  const handleMobileNewNote = async () => {
    const placement = getViewportCenterPlacement();
    if (!placement) return;
    setOverviewOpen(false);
    await createNewNoteAt(placement);
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

  const confirmManualPaste = async () => {
    const target = manualPasteTarget();
    if (!target) return;

    const text = manualPasteText().trim();
    if (!text) return;

    await createPastedNoteAt(target, manualPasteText());
    setManualPasteTarget(null);
    setManualPasteText('');
  };

  const copyNote = async (note: NotesNote) => {
    if (!note.text.trim()) {
      openEditor(note.id);
      return;
    }

    try {
      promoteNote(note.id);
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
        void notes.moveNote(note.id, {
          x: current.currentX,
          y: current.currentY,
        }).catch((error) => {
          notifications.error('Move failed', error instanceof Error ? error.message : String(error));
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
      <Show when={props.open}>
        <Motion.section
          class="notes-overlay"
          role="region"
          aria-label="Notes overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: duration.fast }}
        >
          <Motion.div
            class="notes-overlay__frame"
            initial={{ opacity: 0, y: 18, scale: 0.986 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: duration.normal, easing: easing.easeOut }}
          >
            <header class="notes-overlay__header" data-floe-canvas-interactive="true">
              <div class="notes-overlay__header-brand">
                <div class="notes-overlay__header-title">Notes</div>
                <div class="notes-overlay__header-separator" />
                <div class="notes-overlay__header-stat">{notes.topics().length} topics</div>
                <div class="notes-overlay__header-stat">
                  {totalLiveNotes()} live note{totalLiveNotes() === 1 ? '' : 's'}
                </div>
                <div class="notes-overlay__header-stat">{notes.trashCount()} trash</div>
              </div>

              <div class="notes-overlay__header-actions">
                <button
                  type="button"
                  class="notes-overlay__close"
                  aria-label="Close notes overlay"
                  onClick={closeOverlay}
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </header>

            <div class="notes-overlay__body">
              <aside class="notes-overlay__rail" data-floe-canvas-interactive="true">
                <section class="notes-overlay__rail-header">
                  <div class="notes-overlay__rail-heading">Topics</div>
                  <div class="notes-overlay__rail-total">{notes.topics().length}</div>
                </section>

                <form
                  class="notes-topic-composer notes-overlay__topic-composer"
                  onSubmit={submitTopic}
                  data-floe-canvas-interactive="true"
                >
                  <Input
                    size="sm"
                    value={draftTopicTitle()}
                    onInput={(event) => setDraftTopicTitle(event.currentTarget.value)}
                    placeholder="Add topic"
                  />
                  <button type="submit" class="notes-topic-composer__button" aria-label="Add topic">
                    <Plus class="w-3.5 h-3.5" />
                  </button>
                </form>

                <div class="notes-topic-list" data-floe-canvas-interactive="true">
                  <For each={notes.topics()}>
                    {(topic) => {
                      const liveCount = () => notes.getLiveNoteCount(topic.id);

                      return (
                        <div
                          role="button"
                          tabIndex={0}
                          class={`notes-topic-row notes-topic-tone--${topic.toneId}`}
                          classList={{ 'is-active': topic.id === notes.activeTopicId() }}
                          onClick={() => notes.setActiveTopic(topic.id)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            notes.setActiveTopic(topic.id);
                          }}
                        >
                          <div class={`notes-topic-mark notes-topic-tone--${topic.toneId}`}>
                            <NotesTopicAnimalIcon
                              iconId={topic.iconId}
                              class="notes-topic-mark__icon"
                            />
                          </div>
                          <div class="notes-topic-row__copy">
                            <Show
                              when={renamingTopicId() === topic.id}
                              fallback={
                                <div class="notes-topic-row__title-line">
                                  <div class="notes-topic-row__title">{topic.title}</div>
                                </div>
                              }
                            >
                              <form
                                class="notes-topic-row__editor"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  saveTopicRename();
                                }}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <Input
                                  size="sm"
                                  value={renamingTopicTitle()}
                                  onInput={(event) =>
                                    setRenamingTopicTitle(event.currentTarget.value)
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key !== 'Escape') return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    cancelTopicRename();
                                  }}
                                  placeholder="Topic name"
                                />
                                <button
                                  type="submit"
                                  class="notes-topic-row__edit-button"
                                  aria-label="Save topic name"
                                >
                                  <Check class="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  class="notes-topic-row__edit-button"
                                  aria-label="Cancel topic edit"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    cancelTopicRename();
                                  }}
                                >
                                  <X class="w-3.5 h-3.5" />
                                </button>
                              </form>
                            </Show>
                            <div class="notes-topic-row__meta">
                              {liveCount()} live note{liveCount() === 1 ? '' : 's'}
                            </div>
                          </div>
                          <div class="notes-topic-row__tail">
                            <div class="notes-topic-row__count">{liveCount()}</div>
                            <button
                              type="button"
                              class="notes-topic-row__edit"
                              aria-label={`Edit topic ${topic.title}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                beginTopicRename(topic);
                              }}
                            >
                              <Pencil class="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              class="notes-topic-row__edit notes-topic-row__delete"
                              aria-label={`Delete topic ${topic.title}`}
                              disabled={notes.topics().length <= 1}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteTopic(topic);
                              }}
                            >
                              <Trash class="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </aside>

              <section class="notes-page notes-overlay__board">
                <div class="notes-overlay__board-head" data-floe-canvas-interactive="true">
                  <div class="notes-overlay__board-topic">
                    <Show when={activeTopic()}>
                      {(topic) => (
                        <>
                          <div class={`notes-topic-mark notes-topic-mark--board notes-topic-tone--${topic().toneId}`}>
                            <NotesTopicAnimalIcon
                              iconId={topic().iconId}
                              class="notes-topic-mark__icon"
                            />
                          </div>
                          <div class="notes-overlay__board-topic-copy">
                            <div class="notes-page__eyebrow">Active Topic</div>
                            <div class="notes-overlay__board-title">{topic().title}</div>
                            <div class="notes-overlay__board-meta">
                              {activeNotes().length} live note{activeNotes().length === 1 ? '' : 's'}
                            </div>
                          </div>
                        </>
                      )}
                    </Show>
                  </div>

                  <div class="notes-overlay__board-actions">
                    <button
                      type="button"
                      class="notes-overlay__hud-button"
                      aria-label="Zoom out"
                      onClick={() => adjustViewportScale('out')}
                    >
                      <Minus class="w-3.5 h-3.5" />
                    </button>
                    <div class="notes-overlay__hud-scale">{boardScaleLabel()}</div>
                    <button
                      type="button"
                      class="notes-overlay__hud-button"
                      aria-label="Zoom in"
                      onClick={() => adjustViewportScale('in')}
                    >
                      <Plus class="w-3.5 h-3.5" />
                    </button>
                    <Show when={isMobile()}>
                      <button
                        type="button"
                        class="notes-overlay__hud-button"
                        aria-label="Open overview map"
                        onClick={() => setOverviewOpen(true)}
                      >
                        <Layers class="w-3.5 h-3.5" />
                      </button>
                    </Show>
                  </div>
                </div>

                <Show when={isMobile()}>
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
                          const sizeBucket = createMemo(() => note.sizeBucket);
                          const dimensions = createMemo(() => NOTES_SIZE_DIMENSIONS[sizeBucket()]);
                          const preview = createMemo(() => getTextPreview(note.text, dimensions().previewLimit));
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
                              onContextMenu={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                promoteNote(note.id);
                                openContextMenuAtClientPoint(event.clientX, event.clientY, {
                                  topicId: note.topicId,
                                  noteId: note.id,
                                });
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
                                      onClick={() => void moveNoteToTrash(note.id)}
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

                <Show when={!isMobile()}>{overviewPanel('desktop')}</Show>

                <Show when={isMobile() && !overviewOpen()}>
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
                </div>
              </section>
            </div>
          </Motion.div>
        </Motion.section>

      <Presence>
        <Show when={isMobile() && overviewOpen()}>
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

      <Presence>
        <Show when={trashOpen()}>
          <Portal>
            <Motion.div
              class="notes-trash-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.fast }}
              onContextMenu={(event: MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
                closeTrashDock();
                openContextMenuAtClientPoint(event.clientX, event.clientY);
              }}
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
                onContextMenu={(event: MouseEvent) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
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
                                <div class="notes-trash-section__title-line">
                                  <div
                                    class={`notes-topic-mark notes-topic-mark--trash notes-topic-tone--${section.topic.toneId}`}
                                  >
                                    <NotesTopicAnimalIcon
                                      iconId={section.topic.iconId}
                                      class="notes-topic-mark__icon"
                                    />
                                  </div>
                                  <div class="notes-trash-section__title">{section.topic.title}</div>
                                </div>
                                <div class="notes-trash-section__meta">
                                  {section.notes.length} deleted note
                                  {section.notes.length === 1 ? '' : 's'}
                              </div>
                            </div>
                            <button
                              type="button"
                              class="notes-trash-section__clear"
                              onClick={() => void clearTopicTrash(section.topic.id)}
                            >
                              Clear topic trash
                            </button>
                          </div>

                          <div class="notes-trash-section__grid">
                            <For each={section.notes}>
                              {(note) => {
                                const sizeBucket = note.sizeBucket;
                                const dimensions = NOTES_SIZE_DIMENSIONS[sizeBucket];
                                const preview = getTextPreview(note.text, dimensions.previewLimit);

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
                                          onClick={() => void restoreTrashedNote(note.id)}
                                        >
                                          Restore
                                        </button>
                                        <Show when={Boolean(props.controller.deleteTrashedNotePermanently)}>
                                          <button
                                            type="button"
                                            class="is-danger"
                                            onClick={() => void deleteTrashedNoteNow(note.id)}
                                          >
                                            Delete now
                                          </button>
                                        </Show>
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
              <Show when={Boolean(contextMenu()?.noteId)}>
                <button
                  type="button"
                  class="notes-menu__item is-danger"
                  onClick={() => void handleDeleteFromMenu()}
                >
                  <Trash class="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </Show>
            </Motion.div>
          </Portal>
        </Show>
      </Presence>

      <Presence>
        <Show when={Boolean(editingNote())}>
          <Portal>
            <Motion.div
              class="notes-flyout notes-flyout--editor"
              initial={{ opacity: 0, x: 24, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.985 }}
              transition={{ duration: duration.normal, easing: easing.easeOut }}
              onPointerDown={(event: PointerEvent) => event.stopPropagation()}
            >
              <div class="notes-flyout__header">
                <div>
                  <div class="notes-editor__label">Edit note</div>
                  <div class="notes-flyout__title">{editingNote()?.text.trim() ? 'Refine note' : 'Compose note'}</div>
                </div>
                <button
                  type="button"
                  class="notes-flyout__close"
                  aria-label="Close editor"
                  onClick={closeEditor}
                >
                  <X class="w-4 h-4" />
                </button>
              </div>

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
                    rows={10}
                    value={draftText()}
                    onInput={(event) => setDraftText(event.currentTarget.value)}
                    placeholder="Type or paste anything worth keeping..."
                  />
                </div>
              </div>

              <div class="notes-flyout__footer">
                <Button variant="ghost" onClick={closeEditor}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void saveEditor()}>
                  Save
                </Button>
              </div>
            </Motion.div>
          </Portal>
        </Show>
      </Presence>

      <Presence>
        <Show when={Boolean(manualPasteTarget())}>
          <Portal>
            <Motion.div
              class="notes-flyout notes-flyout--paste"
              initial={{ opacity: 0, x: 24, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.985 }}
              transition={{ duration: duration.normal, easing: easing.easeOut }}
              onPointerDown={(event: PointerEvent) => event.stopPropagation()}
            >
              <div class="notes-flyout__header">
                <div>
                  <div class="notes-editor__label">Manual paste</div>
                  <div class="notes-flyout__title">Clipboard access was unavailable</div>
                </div>
                <button
                  type="button"
                  class="notes-flyout__close"
                  aria-label="Close paste panel"
                  onClick={() => {
                    setManualPasteTarget(null);
                    setManualPasteText('');
                  }}
                >
                  <X class="w-4 h-4" />
                </button>
              </div>

              <div class="notes-flyout__body">
                <Textarea
                  rows={12}
                  value={manualPasteText()}
                  onInput={(event) => setManualPasteText(event.currentTarget.value)}
                  placeholder="Paste clipboard text here..."
                />
              </div>

              <div class="notes-flyout__footer">
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
                  onClick={() => void confirmManualPaste()}
                >
                  Create note
                </Button>
              </div>
            </Motion.div>
          </Portal>
        </Show>
      </Presence>
      </Show>
  );
}
