import {
  createContext,
  createEffect,
  createMemo,
  onCleanup,
  useContext,
  type Accessor,
  type JSX,
} from 'solid-js';
import { createStore, produce, unwrap } from 'solid-js/store';
import { usePersisted } from '@floegence/floe-webapp-core';

export const NOTES_TRASH_RETENTION_MS = 72 * 60 * 60 * 1000;
export const NOTES_PREVIEW_LIMIT = 148;

export type NotesColorId = 'butter' | 'blush' | 'moss' | 'mist' | 'sand' | 'coral';
export type NotesSizeBucket = 0 | 1 | 2 | 3 | 4;
export type NotesTopicIconId = 'hare' | 'fox' | 'otter' | 'koi' | 'swallow' | 'crane';
export type NotesTopicToneId = 'amber' | 'coral' | 'mint' | 'sky' | 'plum' | 'rose';

export interface TopicViewport {
  x: number;
  y: number;
  scale: number;
}

export interface NotesTopic {
  id: string;
  title: string;
  iconId: NotesTopicIconId;
  toneId: NotesTopicToneId;
  deletedAt: number | null;
  createdAt: number;
}

export interface NotesNote {
  id: string;
  topicId: string;
  title: string;
  text: string;
  colorId: NotesColorId;
  x: number;
  y: number;
  layer: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface NotesDemoState {
  version: 6;
  activeTopicId: string;
  topics: NotesTopic[];
  notes: NotesNote[];
  viewports: Record<string, TopicViewport>;
}

type LegacyNotesNote = Omit<NotesNote, 'layer' | 'title'> & {
  layer?: number;
  title?: string;
};

interface LegacyTopicViewport {
  x: number;
  y: number;
  scale?: number;
}

interface LegacyNotesDemoState {
  version: 1;
  activeTopicId: string;
  topics: NotesTopic[];
  notes: LegacyNotesNote[];
  viewports: Record<string, LegacyTopicViewport>;
}

interface LegacyNotesDemoStateV2 {
  version: 2;
  activeTopicId: string;
  topics: NotesTopic[];
  notes: LegacyNotesNote[];
  viewports: Record<string, LegacyTopicViewport>;
}

interface LegacyNotesTopicV3 {
  id: string;
  title: string;
  createdAt: number;
}

interface LegacyNotesDemoStateV3 {
  version: 3;
  activeTopicId: string;
  topics: LegacyNotesTopicV3[];
  notes: LegacyNotesNote[];
  viewports: Record<string, LegacyTopicViewport>;
}

interface LegacyNotesTopicV4 {
  id: string;
  title: string;
  iconId: NotesTopicIconId;
  toneId: NotesTopicToneId;
  createdAt: number;
}

interface LegacyNotesDemoStateV4 {
  version: 4;
  activeTopicId: string;
  topics: LegacyNotesTopicV4[];
  notes: LegacyNotesNote[];
  viewports: Record<string, LegacyTopicViewport>;
}

interface LegacyNotesDemoStateV5 {
  version: 5;
  activeTopicId: string;
  topics: NotesTopic[];
  notes: LegacyNotesNote[];
  viewports: Record<string, LegacyTopicViewport>;
}

export interface NotesColorOption {
  id: NotesColorId;
  name: string;
}

export const NOTES_COLOR_OPTIONS: NotesColorOption[] = [
  { id: 'butter', name: 'Butter' },
  { id: 'blush', name: 'Blush' },
  { id: 'moss', name: 'Moss' },
  { id: 'mist', name: 'Mist' },
  { id: 'sand', name: 'Sand' },
  { id: 'coral', name: 'Coral' },
];

export const NOTES_TOPIC_VISUALS: Array<{
  iconId: NotesTopicIconId;
  toneId: NotesTopicToneId;
}> = [
  { iconId: 'hare', toneId: 'amber' },
  { iconId: 'fox', toneId: 'coral' },
  { iconId: 'otter', toneId: 'mint' },
  { iconId: 'koi', toneId: 'sky' },
  { iconId: 'swallow', toneId: 'plum' },
  { iconId: 'crane', toneId: 'rose' },
];

export const NOTES_SIZE_DIMENSIONS: Record<
  NotesSizeBucket,
  { width: number; height: number; previewLimit: number }
> = {
  0: { width: 196, height: 134, previewLimit: 68 },
  1: { width: 214, height: 148, previewLimit: 90 },
  2: { width: 232, height: 164, previewLimit: 112 },
  3: { width: 248, height: 182, previewLimit: 138 },
  4: { width: 266, height: 202, previewLimit: 164 },
};

export interface CreateNoteInput {
  topicId?: string;
  x: number;
  y: number;
  headline?: string;
  title?: string;
  text?: string;
  colorId?: NotesColorId;
}

export interface UpdateNoteInput {
  headline?: string;
  title?: string;
  text?: string;
  colorId?: NotesColorId;
}

export interface UpdateTopicInput {
  title?: string;
}

export interface NotesDemoContextValue {
  topics: Accessor<NotesTopic[]>;
  activeTopicId: Accessor<string>;
  activeTopic: Accessor<NotesTopic | undefined>;
  activeViewport: Accessor<TopicViewport>;
  trashedNotes: Accessor<NotesNote[]>;
  trashCount: Accessor<number>;
  colorOptions: typeof NOTES_COLOR_OPTIONS;
  getTopic: (topicId: string) => NotesTopic | undefined;
  getViewport: (topicId: string) => TopicViewport;
  getNotesForTopic: (topicId: string, options?: { includeDeleted?: boolean }) => NotesNote[];
  getNoteById: (noteId: string) => NotesNote | undefined;
  getLiveNoteCount: (topicId: string) => number;
  getTextPreview: (text: string, limit?: number) => string;
  getNoteSize: (text: string, title?: string) => NotesSizeBucket;
  createTopic: (title: string) => string;
  updateTopic: (topicId: string, input: UpdateTopicInput) => void;
  deleteTopic: (topicId: string) => boolean;
  setActiveTopic: (topicId: string) => void;
  setViewport: (topicId: string, viewport: TopicViewport) => void;
  createNote: (input: CreateNoteInput) => NotesNote | undefined;
  updateNote: (noteId: string, input: UpdateNoteInput) => void;
  moveNote: (noteId: string, position: { x: number; y: number }) => void;
  bringNoteToFront: (noteId: string) => void;
  trashNote: (noteId: string) => void;
  restoreNote: (noteId: string) => void;
  deleteNotePermanently: (noteId: string) => void;
  clearTrashForTopic: (topicId: string) => void;
}

const NotesDemoContext = createContext<NotesDemoContextValue>();

const DEFAULT_VIEWPORT: TopicViewport = { x: 164, y: 112, scale: 1 };

function createId(prefix: string): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim();
}

function resolveInputHeadline(input: Readonly<{ headline?: string; title?: string }>): string {
  return typeof input.headline === 'string'
    ? input.headline
    : typeof input.title === 'string'
      ? input.title
      : '';
}

function getRandomColorId(): NotesColorId {
  const index = Math.floor(Math.random() * NOTES_COLOR_OPTIONS.length);
  return NOTES_COLOR_OPTIONS[index]?.id ?? 'butter';
}

function isTopicIconId(value: unknown): value is NotesTopicIconId {
  return NOTES_TOPIC_VISUALS.some((item) => item.iconId === value);
}

function isTopicToneId(value: unknown): value is NotesTopicToneId {
  return NOTES_TOPIC_VISUALS.some((item) => item.toneId === value);
}

function getTopicVisual(index: number): { iconId: NotesTopicIconId; toneId: NotesTopicToneId } {
  return NOTES_TOPIC_VISUALS[index % NOTES_TOPIC_VISUALS.length] ?? NOTES_TOPIC_VISUALS[0]!;
}

function getNextLayer(notes: Array<{ layer?: number }>): number {
  return (
    notes.reduce((maxLayer, note) => {
      const layer = typeof note.layer === 'number' && Number.isFinite(note.layer) ? note.layer : 0;
      return Math.max(maxLayer, layer);
    }, 0) + 1
  );
}

export function getNoteTextWeight(text: string): number {
  const normalized = normalizeText(text);
  const lineBreaks = (normalized.match(/\n/g) ?? []).length;
  return normalized.length + lineBreaks * 18;
}

export function getNoteWeight(text: string, title = ''): number {
  const normalizedTitle = normalizeTitle(title);
  const titleWeight = normalizedTitle ? normalizedTitle.length * 1.45 + 20 : 0;
  return getNoteTextWeight(text) + titleWeight;
}

export function getNoteSizeBucket(text: string, title = ''): NotesSizeBucket {
  const weight = getNoteWeight(text, title);

  if (weight <= 28) return 0;
  if (weight <= 86) return 1;
  if (weight <= 168) return 2;
  if (weight <= 300) return 3;
  return 4;
}

export function getNotePreviewText(text: string, limit = NOTES_PREVIEW_LIMIT): string {
  const normalized = normalizeText(text).replace(/\n{3,}/g, '\n\n');
  if (!normalized) return 'Empty note';
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

const DEFAULT_NOTE_TITLES: Readonly<Record<string, string>> = Object.freeze({
  'note-seed-1': 'Atmosphere',
  'note-seed-2': 'Paste Flow',
  'note-seed-3': 'Sizing Rule',
  'note-seed-4': 'Review Loop',
  'note-seed-5': 'Right-click Only',
  'note-seed-6': 'Holding Pen',
  'note-trash-1': 'Retired Route',
});

function getDefaultNoteTitle(noteId: string): string {
  return DEFAULT_NOTE_TITLES[noteId] ?? '';
}

function createDefaultState(): NotesDemoState {
  const now = Date.now();

  const topics: NotesTopic[] = [
    {
      id: 'topic-research-threads',
      title: 'Research Threads',
      iconId: 'hare',
      toneId: 'amber',
      deletedAt: null,
      createdAt: now - 9 * 60 * 60 * 1000,
    },
    {
      id: 'topic-launch-wall',
      title: 'Launch Wall',
      iconId: 'fox',
      toneId: 'coral',
      deletedAt: null,
      createdAt: now - 5 * 60 * 60 * 1000,
    },
    {
      id: 'topic-loose-fragments',
      title: 'Loose Fragments',
      iconId: 'otter',
      toneId: 'mint',
      deletedAt: null,
      createdAt: now - 2 * 60 * 60 * 1000,
    },
  ];

  return {
    version: 6,
    activeTopicId: topics[0].id,
    topics,
    viewports: {
      [topics[0].id]: { x: 172, y: 120, scale: 1 },
      [topics[1].id]: { x: 210, y: 116, scale: 1 },
      [topics[2].id]: { x: 240, y: 108, scale: 1 },
    },
    notes: [
      {
        id: 'note-seed-1',
        topicId: topics[0].id,
        title: 'Atmosphere',
        text: 'The board should feel like a quiet worktable, not a generic whiteboard. Keep the paper mood calm and useful.',
        colorId: 'butter',
        x: 88,
        y: 96,
        layer: 1,
        createdAt: now - 7 * 60 * 60 * 1000,
        updatedAt: now - 6 * 60 * 60 * 1000,
        deletedAt: null,
      },
      {
        id: 'note-seed-2',
        topicId: topics[0].id,
        title: 'Paste Flow',
        text: 'Paste Here needs to be fast. One gesture, one note, clipboard text already inside.',
        colorId: 'mist',
        x: 356,
        y: 132,
        layer: 2,
        createdAt: now - 6 * 60 * 60 * 1000,
        updatedAt: now - 4 * 60 * 60 * 1000,
        deletedAt: null,
      },
      {
        id: 'note-seed-3',
        topicId: topics[0].id,
        title: 'Sizing Rule',
        text: 'Big notes should look slightly larger, but never explode into giant cards. Size is a signal, not a layout takeover.',
        colorId: 'moss',
        x: 246,
        y: 342,
        layer: 3,
        createdAt: now - 5 * 60 * 60 * 1000,
        updatedAt: now - 4 * 60 * 60 * 1000,
        deletedAt: null,
      },
      {
        id: 'note-seed-4',
        topicId: topics[1].id,
        title: 'Review Loop',
        text: 'Review loop:\n1. capture\n2. cluster\n3. copy to spec\n4. archive loose scraps',
        colorId: 'sand',
        x: 120,
        y: 118,
        layer: 1,
        createdAt: now - 4 * 60 * 60 * 1000,
        updatedAt: now - 3 * 60 * 60 * 1000,
        deletedAt: null,
      },
      {
        id: 'note-seed-5',
        topicId: topics[1].id,
        title: 'Right-click Only',
        text: 'Right click should be enough. No toolbar hunting.',
        colorId: 'coral',
        x: 388,
        y: 264,
        layer: 2,
        createdAt: now - 3 * 60 * 60 * 1000,
        updatedAt: now - 2 * 60 * 60 * 1000,
        deletedAt: null,
      },
      {
        id: 'note-seed-6',
        topicId: topics[2].id,
        title: 'Holding Pen',
        text: 'Tiny scraps live here until they deserve a real topic.',
        colorId: 'blush',
        x: 148,
        y: 148,
        layer: 1,
        createdAt: now - 70 * 60 * 1000,
        updatedAt: now - 62 * 60 * 1000,
        deletedAt: null,
      },
      {
        id: 'note-trash-1',
        topicId: topics[0].id,
        title: 'Retired Route',
        text: 'Old direction that can disappear if nobody restores it.',
        colorId: 'blush',
        x: 522,
        y: 220,
        layer: 4,
        createdAt: now - 13 * 60 * 60 * 1000,
        updatedAt: now - 12 * 60 * 60 * 1000,
        deletedAt: now - 8 * 60 * 60 * 1000,
      },
    ],
  };
}

function purgeExpiredNotes(notes: NotesNote[], now = Date.now()): NotesNote[] {
  return notes.filter(
    (note) => note.deletedAt === null || now - note.deletedAt < NOTES_TRASH_RETENTION_MS
  );
}

function sanitizeState(
  input:
    | NotesDemoState
    | LegacyNotesDemoState
    | LegacyNotesDemoStateV2
    | LegacyNotesDemoStateV3
    | LegacyNotesDemoStateV4
    | LegacyNotesDemoStateV5
    | undefined
): NotesDemoState {
  if (
    !input ||
    (input.version !== 1 &&
      input.version !== 2 &&
      input.version !== 3 &&
      input.version !== 4 &&
      input.version !== 5 &&
      input.version !== 6) ||
    !Array.isArray(input.topics) ||
    !Array.isArray(input.notes)
  ) {
    return createDefaultState();
  }

  const topics = input.topics
    .filter((topic) => topic && typeof topic.id === 'string' && typeof topic.title === 'string')
    .map((topic, index) => {
      const visual = getTopicVisual(index);

      return {
        id: topic.id,
        title: topic.title.trim() || 'Untitled topic',
        iconId: isTopicIconId((topic as Partial<NotesTopic>).iconId)
          ? (topic as NotesTopic).iconId
          : visual.iconId,
        toneId: isTopicToneId((topic as Partial<NotesTopic>).toneId)
          ? (topic as NotesTopic).toneId
          : visual.toneId,
        deletedAt:
          (topic as Partial<NotesTopic>).deletedAt === null ||
          Number.isFinite((topic as Partial<NotesTopic>).deletedAt)
            ? ((topic as Partial<NotesTopic>).deletedAt ?? null)
            : null,
        createdAt: Number.isFinite(topic.createdAt) ? topic.createdAt : Date.now(),
      };
    });

  if (topics.length === 0) {
    return createDefaultState();
  }

  if (!topics.some((topic) => topic.deletedAt === null)) {
    topics[0]!.deletedAt = null;
  }

  const topicIds = new Set(topics.map((topic) => topic.id));
  const firstLiveTopicId = topics.find((topic) => topic.deletedAt === null)?.id ?? topics[0].id;

  const notes = purgeExpiredNotes(
    input.notes
      .filter((note) => note && typeof note.id === 'string' && topicIds.has(note.topicId))
      .map((note, index) => {
        const migratedTitle =
          input.version === 6
            ? typeof note.title === 'string'
              ? note.title
              : ''
            : typeof note.title === 'string'
              ? note.title
              : getDefaultNoteTitle(note.id);

        return {
          id: note.id,
          topicId: note.topicId,
          title: normalizeTitle(migratedTitle),
          text: typeof note.text === 'string' ? note.text : '',
          colorId: NOTES_COLOR_OPTIONS.some((option) => option.id === note.colorId)
            ? note.colorId
            : getRandomColorId(),
          x: Number.isFinite(note.x) ? note.x : 0,
          y: Number.isFinite(note.y) ? note.y : 0,
          layer:
            typeof note.layer === 'number' && Number.isFinite(note.layer) && note.layer > 0
              ? note.layer
              : index + 1,
          createdAt: Number.isFinite(note.createdAt) ? note.createdAt : Date.now(),
          updatedAt: Number.isFinite(note.updatedAt) ? note.updatedAt : Date.now(),
          deletedAt:
            note.deletedAt === null || Number.isFinite(note.deletedAt) ? note.deletedAt : null,
        };
      })
  );

  const viewports: Record<string, TopicViewport> = {};
  for (const topic of topics) {
    const viewport = input.viewports?.[topic.id];
    const rawScale = typeof viewport?.scale === 'number' ? viewport.scale : undefined;
    const scale =
      rawScale !== undefined && Number.isFinite(rawScale) && rawScale > 0
        ? rawScale
        : DEFAULT_VIEWPORT.scale;
    viewports[topic.id] = {
      x: Number.isFinite(viewport?.x) ? viewport.x : DEFAULT_VIEWPORT.x,
      y: Number.isFinite(viewport?.y) ? viewport.y : DEFAULT_VIEWPORT.y,
      scale,
    };
  }

  return {
    version: 6,
    activeTopicId:
      topicIds.has(input.activeTopicId) &&
      topics.some((topic) => topic.id === input.activeTopicId && topic.deletedAt === null)
        ? input.activeTopicId
        : firstLiveTopicId,
    topics,
    notes,
    viewports,
  };
}

function getFirstLiveTopicId(topics: NotesTopic[]): string | undefined {
  return topics.find((topic) => topic.deletedAt === null)?.id;
}

function pruneDeletedTopics(draft: NotesDemoState) {
  const noteTopicIds = new Set(draft.notes.map((note) => note.topicId));
  const removedTopicIds = new Set<string>();

  draft.topics = draft.topics.filter((topic) => {
    const keepTopic = topic.deletedAt === null || noteTopicIds.has(topic.id);
    if (!keepTopic) {
      removedTopicIds.add(topic.id);
    }
    return keepTopic;
  });

  for (const topicId of removedTopicIds) {
    delete draft.viewports[topicId];
  }
}

function ensureActiveTopic(draft: NotesDemoState) {
  if (draft.topics.some((topic) => topic.id === draft.activeTopicId && topic.deletedAt === null)) {
    return;
  }

  const fallbackTopicId = getFirstLiveTopicId(draft.topics);
  if (fallbackTopicId) {
    draft.activeTopicId = fallbackTopicId;
  }
}

export function NotesDemoProvider(props: { children: JSX.Element }) {
  const [persistedState, setPersistedState] = usePersisted<
    | NotesDemoState
    | LegacyNotesDemoState
    | LegacyNotesDemoStateV2
    | LegacyNotesDemoStateV3
    | LegacyNotesDemoStateV4
    | LegacyNotesDemoStateV5
  >('demo.notes.state.v1', createDefaultState());
  const [state, setState] = createStore<NotesDemoState>(sanitizeState(persistedState()));

  createEffect(() => {
    setPersistedState(sanitizeState(unwrap(state)));
  });

  createEffect(() => {
    if (
      state.topics.some((topic) => topic.id === state.activeTopicId && topic.deletedAt === null)
    ) {
      return;
    }
    const fallbackTopicId = getFirstLiveTopicId(state.topics);
    if (!fallbackTopicId) return;
    setState('activeTopicId', fallbackTopicId);
  });

  const purgeExpired = () => {
    const now = Date.now();
    setState(
      produce((draft) => {
        draft.notes = purgeExpiredNotes(draft.notes, now);
        pruneDeletedTopics(draft);
        ensureActiveTopic(draft);
      })
    );
  };

  purgeExpired();

  const purgeTimer =
    typeof window === 'undefined' ? undefined : window.setInterval(purgeExpired, 60 * 1000);
  onCleanup(() => {
    if (purgeTimer !== undefined) {
      window.clearInterval(purgeTimer);
    }
  });

  const topics = createMemo(() => state.topics.filter((topic) => topic.deletedAt === null));
  const activeTopicId = createMemo(() => state.activeTopicId);
  const activeTopic = createMemo(() =>
    state.topics.find((topic) => topic.id === state.activeTopicId && topic.deletedAt === null)
  );
  const trashedNotes = createMemo(() =>
    state.notes
      .filter((note) => note.deletedAt !== null)
      .slice()
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
  );
  const trashCount = createMemo(() => trashedNotes().length);
  const activeViewport = createMemo<TopicViewport>(() => {
    const topicId = activeTopicId();
    return state.viewports[topicId] ?? DEFAULT_VIEWPORT;
  });

  const getTopic = (topicId: string) => state.topics.find((topic) => topic.id === topicId);
  const getLiveTopic = (topicId: string) =>
    state.topics.find((topic) => topic.id === topicId && topic.deletedAt === null);

  const getViewport = (topicId: string): TopicViewport =>
    state.viewports[topicId] ?? DEFAULT_VIEWPORT;

  const getNotesForTopic = (topicId: string, options?: { includeDeleted?: boolean }) =>
    state.notes.filter(
      (note) =>
        note.topicId === topicId && (options?.includeDeleted ? true : note.deletedAt === null)
    );

  const getLiveNoteCount = (topicId: string) =>
    state.notes.filter((note) => note.topicId === topicId && note.deletedAt === null).length;

  const getNoteById = (noteId: string) => state.notes.find((note) => note.id === noteId);

  const createTopic = (title: string): string => {
    const trimmed = title.trim();
    const topicId = createId('topic');
    const topicTitle = trimmed || `Topic ${state.topics.length + 1}`;
    const createdAt = Date.now();
    const visual = getTopicVisual(state.topics.length);

    setState(
      produce((draft) => {
        draft.topics.push({
          id: topicId,
          title: topicTitle,
          iconId: visual.iconId,
          toneId: visual.toneId,
          deletedAt: null,
          createdAt,
        });
        draft.viewports[topicId] = { ...DEFAULT_VIEWPORT };
        draft.activeTopicId = topicId;
      })
    );

    return topicId;
  };

  const updateTopic = (topicId: string, input: UpdateTopicInput) => {
    setState(
      produce((draft) => {
        const topic = draft.topics.find((item) => item.id === topicId);
        if (!topic) return;
        if (typeof input.title === 'string') {
          topic.title = input.title.trim() || 'Untitled topic';
        }
      })
    );
  };

  const deleteTopic = (topicId: string): boolean => {
    const liveTopics = state.topics.filter((topic) => topic.deletedAt === null);
    if (liveTopics.length <= 1) return false;

    const topic = liveTopics.find((item) => item.id === topicId);
    if (!topic) return false;

    const deletedAt = Date.now();

    setState(
      produce((draft) => {
        const draftTopic = draft.topics.find((item) => item.id === topicId);
        if (!draftTopic || draftTopic.deletedAt !== null) return;

        draftTopic.deletedAt = deletedAt;

        for (const note of draft.notes) {
          if (note.topicId !== topicId || note.deletedAt !== null) continue;
          note.deletedAt = deletedAt;
          note.updatedAt = deletedAt;
        }

        pruneDeletedTopics(draft);
        ensureActiveTopic(draft);
      })
    );

    return true;
  };

  const setActiveTopic = (topicId: string) => {
    if (!getLiveTopic(topicId)) return;
    setState('activeTopicId', topicId);
  };

  const setViewport = (topicId: string, viewport: TopicViewport) => {
    if (!getLiveTopic(topicId)) return;
    setState(
      produce((draft) => {
        draft.viewports[topicId] = viewport;
      })
    );
  };

  const createNote = (input: CreateNoteInput): NotesNote | undefined => {
    const topicId = input.topicId ?? state.activeTopicId;
    if (!getLiveTopic(topicId)) return undefined;

    const now = Date.now();
    const layer = getNextLayer(state.notes);
    const note: NotesNote = {
      id: createId('note'),
      topicId,
      title: normalizeTitle(resolveInputHeadline(input)),
      text: input.text ?? '',
      colorId: input.colorId ?? getRandomColorId(),
      x: input.x,
      y: input.y,
      layer,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    setState(
      produce((draft) => {
        draft.notes.push(note);
      })
    );

    return note;
  };

  const updateNote = (noteId: string, input: UpdateNoteInput) => {
    setState(
      produce((draft) => {
        const note = draft.notes.find((item) => item.id === noteId);
        if (!note) return;

        if (typeof input.headline === 'string' || typeof input.title === 'string') {
          note.title = normalizeTitle(resolveInputHeadline(input));
        }
        if (typeof input.text === 'string') note.text = input.text;
        if (input.colorId) note.colorId = input.colorId;
        note.updatedAt = Date.now();
      })
    );
  };

  const moveNote = (noteId: string, position: { x: number; y: number }) => {
    setState(
      produce((draft) => {
        const note = draft.notes.find((item) => item.id === noteId);
        if (!note) return;
        note.x = position.x;
        note.y = position.y;
        note.updatedAt = Date.now();
      })
    );
  };

  const bringNoteToFront = (noteId: string) => {
    setState(
      produce((draft) => {
        const note = draft.notes.find((item) => item.id === noteId);
        if (!note) return;

        const topLayer = draft.notes.reduce((maxLayer, item) => Math.max(maxLayer, item.layer), 0);
        if (note.layer >= topLayer) return;

        note.layer = topLayer + 1;
      })
    );
  };

  const trashNote = (noteId: string) => {
    setState(
      produce((draft) => {
        const note = draft.notes.find((item) => item.id === noteId);
        if (!note || note.deletedAt !== null) return;
        note.deletedAt = Date.now();
        note.updatedAt = Date.now();
      })
    );
  };

  const restoreNote = (noteId: string) => {
    setState(
      produce((draft) => {
        const note = draft.notes.find((item) => item.id === noteId);
        if (!note || note.deletedAt === null) return;
        note.deletedAt = null;
        note.layer = getNextLayer(draft.notes);
        note.updatedAt = Date.now();

        const topic = draft.topics.find((item) => item.id === note.topicId);
        if (topic && topic.deletedAt !== null) {
          topic.deletedAt = null;
        }

        ensureActiveTopic(draft);
      })
    );
  };

  const deleteNotePermanently = (noteId: string) => {
    setState(
      produce((draft) => {
        draft.notes = draft.notes.filter((note) => note.id !== noteId);
        pruneDeletedTopics(draft);
        ensureActiveTopic(draft);
      })
    );
  };

  const clearTrashForTopic = (topicId: string) => {
    setState(
      produce((draft) => {
        draft.notes = draft.notes.filter(
          (note) => !(note.topicId === topicId && note.deletedAt !== null)
        );
        pruneDeletedTopics(draft);
        ensureActiveTopic(draft);
      })
    );
  };

  const value: NotesDemoContextValue = {
    topics,
    activeTopicId,
    activeTopic,
    activeViewport,
    trashedNotes,
    trashCount,
    colorOptions: NOTES_COLOR_OPTIONS,
    getTopic,
    getViewport,
    getNotesForTopic,
    getNoteById,
    getLiveNoteCount,
    getTextPreview: getNotePreviewText,
    getNoteSize: getNoteSizeBucket,
    createTopic,
    updateTopic,
    deleteTopic,
    setActiveTopic,
    setViewport,
    createNote,
    updateNote,
    moveNote,
    bringNoteToFront,
    trashNote,
    restoreNote,
    deleteNotePermanently,
    clearTrashForTopic,
  };

  return <NotesDemoContext.Provider value={value}>{props.children}</NotesDemoContext.Provider>;
}

export function useNotesDemo(): NotesDemoContextValue {
  const context = useContext(NotesDemoContext);
  if (!context) {
    throw new Error('useNotesDemo must be used within NotesDemoProvider');
  }

  return context;
}
