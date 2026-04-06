import {
  centerViewportOnWorldPoint,
  clampScale,
  NOTE_BUCKET_METRICS,
  type NoteColorToken,
  type NotesItem,
  type NotesPoint,
  type NotesRect,
  type NotesTrashItem,
  type NotesViewport,
  type TopicAccentToken,
} from './types';

export const NOTES_TRASH_RETENTION_MS = 72 * 60 * 60 * 1000;
export const NOTES_CANVAS_ZOOM_STEP = 1.18;
export const NOTES_DEFAULT_FRAME_WIDTH = 1280;
export const NOTES_DEFAULT_FRAME_HEIGHT = 880;
export const NOTES_MOBILE_BREAKPOINT_PX = 960;

const NOTE_COLOR_CLASS_SUFFIX: Readonly<Record<NoteColorToken, string>> = Object.freeze({
  amber: 'butter',
  azure: 'mist',
  coral: 'coral',
  graphite: 'sand',
  rose: 'blush',
  sage: 'moss',
});

const TOPIC_ACCENT_CLASS_SUFFIX: Readonly<Record<TopicAccentToken, string>> = Object.freeze({
  berry: 'rose',
  ember: 'coral',
  gold: 'amber',
  ink: 'plum',
  moss: 'mint',
  sea: 'sky',
});

export interface NotesCanvasPlacement {
  topicID: string;
  worldX: number;
  worldY: number;
}

export interface NotesContextMenuState extends NotesCanvasPlacement {
  clientX: number;
  clientY: number;
  noteID?: string | null;
}

export interface NotesOverviewBounds extends NotesRect {
  width: number;
  height: number;
}

export interface NotesOverviewViewportMetrics {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface NotesOverviewNavigationState {
  pointerId: number;
  bounds: NotesOverviewBounds;
  surfaceRect: DOMRect;
  centerOffsetX: number;
  centerOffsetY: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampOverviewCenter(center: number, span: number, min: number, max: number): number {
  const total = max - min;
  if (!Number.isFinite(total) || total <= 0) return center;
  if (span >= total) return min + total / 2;
  return clamp(center, min + span / 2, max - span / 2);
}

export function getNormalizedOverviewPoint(clientX: number, clientY: number, rect: DOMRect) {
  return {
    x: clamp((clientX - rect.left) / rect.width, 0, 1),
    y: clamp((clientY - rect.top) / rect.height, 0, 1),
  };
}

export function normalizeNoteText(text: string): string {
  return String(text ?? '').replace(/\r\n/g, '\n').trim();
}

export function getNotePreviewText(text: string, limit: number): string {
  const normalized = normalizeNoteText(text).replace(/\n{3,}/g, '\n\n');
  if (!normalized) return 'Empty note';
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}...`;
}

export function formatRemainingTrashTime(deletedAtUnixMs: number, now = Date.now()): string {
  const remaining = Math.max(0, NOTES_TRASH_RETENTION_MS - (now - deletedAtUnixMs));
  const totalHours = Math.ceil(remaining / (60 * 60 * 1000));

  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    if (hours === 0) return `${days}d left`;
    return `${days}d ${hours}h left`;
  }

  return `${Math.max(1, totalHours)}h left`;
}

export function formatDeletedTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

export function noteColorClass(token: NoteColorToken): string {
  return `notes-note--${NOTE_COLOR_CLASS_SUFFIX[token]}`;
}

export function topicAccentClass(token: TopicAccentToken): string {
  return `notes-topic-tone--${TOPIC_ACCENT_CLASS_SUFFIX[token]}`;
}

export function buildOverviewBounds(rect: NotesRect): NotesOverviewBounds {
  return {
    ...rect,
    width: rect.maxX - rect.minX,
    height: rect.maxY - rect.minY,
  };
}

export function resolveOverviewBounds(
  boardBounds: NotesRect,
  visibleRect: NotesRect,
): NotesOverviewBounds {
  const visibleWidth = visibleRect.maxX - visibleRect.minX;
  const visibleHeight = visibleRect.maxY - visibleRect.minY;

  return buildOverviewBounds({
    minX: Math.min(boardBounds.minX - visibleWidth / 2, visibleRect.minX),
    minY: Math.min(boardBounds.minY - visibleHeight / 2, visibleRect.minY),
    maxX: Math.max(boardBounds.maxX + visibleWidth / 2, visibleRect.maxX),
    maxY: Math.max(boardBounds.maxY + visibleHeight / 2, visibleRect.maxY),
  });
}

export function resolveFrameSize(frame: { width: number; height: number }) {
  return {
    width:
      frame.width > 0
        ? frame.width
        : typeof window === 'undefined'
          ? NOTES_DEFAULT_FRAME_WIDTH
          : window.innerWidth,
    height:
      frame.height > 0
        ? frame.height
        : typeof window === 'undefined'
          ? NOTES_DEFAULT_FRAME_HEIGHT
          : window.innerHeight,
  };
}

export function resolveCenteredViewport(options: {
  viewport: NotesViewport;
  frame: { width: number; height: number };
  bounds: NotesOverviewBounds;
  worldX: number;
  worldY: number;
  scale?: number;
}): NotesViewport {
  const scale = clampScale(options.scale ?? options.viewport.scale);
  const frame = resolveFrameSize(options.frame);
  const visibleWorldWidth = frame.width / scale;
  const visibleWorldHeight = frame.height / scale;
  const centeredWorldX = clampOverviewCenter(
    options.worldX,
    visibleWorldWidth,
    options.bounds.minX,
    options.bounds.maxX,
  );
  const centeredWorldY = clampOverviewCenter(
    options.worldY,
    visibleWorldHeight,
    options.bounds.minY,
    options.bounds.maxY,
  );

  return centerViewportOnWorldPoint(
    { ...options.viewport, scale },
    centeredWorldX,
    centeredWorldY,
    frame.width,
    frame.height,
  );
}

export function createOverviewItem(item: NotesItem, bounds: NotesOverviewBounds) {
  const metrics = NOTE_BUCKET_METRICS[item.size_bucket];
  return {
    id: item.note_id,
    className: noteColorClass(item.color_token),
    x: ((item.x - bounds.minX) / bounds.width) * 100,
    y: ((item.y - bounds.minY) / bounds.height) * 100,
    width: (metrics.width / bounds.width) * 100,
    height: (metrics.height / bounds.height) * 100,
  };
}

export function createContextMenuPosition(options: {
  clientX: number;
  clientY: number;
  menuWidth: number;
  menuHeight: number;
}) {
  const maxX =
    typeof window === 'undefined' ? options.clientX : window.innerWidth - options.menuWidth;
  const maxY =
    typeof window === 'undefined' ? options.clientY : window.innerHeight - options.menuHeight;

  return {
    left: Math.max(16, Math.min(options.clientX, maxX)),
    top: Math.max(16, Math.min(options.clientY, maxY)),
  };
}

export function notePreviewMetrics(item: NotesItem) {
  return NOTE_BUCKET_METRICS[item.size_bucket];
}

export function hasLiveNotesForTopic(items: readonly NotesItem[], topicID: string): number {
  return items.reduce((count, item) => count + (item.topic_id === topicID ? 1 : 0), 0);
}

export function findTrashTopicNoteCount(items: readonly NotesTrashItem[], topicID: string): number {
  return items.reduce((count, item) => count + (item.topic_id === topicID ? 1 : 0), 0);
}

export function samePoint(left: NotesPoint, right: NotesPoint): boolean {
  return left.x === right.x && left.y === right.y;
}
