import { createMemo } from 'solid-js';
import {
  normalizeNotesSnapshot,
  type NoteColorToken,
  type NotesController,
  type NotesItem,
  type NotesSizeBucket,
  type NotesSnapshot,
  type NotesTopic,
  type NotesTrashItem,
  type NotesViewport,
  type TopicAccentToken,
  type TopicIconKey,
} from '@floegence/floe-webapp-core/notes';
import {
  useNotesDemo,
  type NotesColorId,
  type NotesNote,
  type NotesTopic as DemoTopic,
  type NotesTopicIconId,
  type NotesTopicToneId,
} from './NotesDemoContext';

function toTopicIconKey(iconId: NotesTopicIconId): TopicIconKey {
  switch (iconId) {
    case 'hare':
      return 'hare';
    case 'fox':
      return 'fox';
    case 'otter':
      return 'otter';
    case 'crane':
      return 'crane';
    case 'koi':
      return 'whale';
    case 'swallow':
    default:
      return 'lynx';
  }
}

function toTopicAccentToken(toneId: NotesTopicToneId): TopicAccentToken {
  switch (toneId) {
    case 'amber':
      return 'gold';
    case 'coral':
      return 'ember';
    case 'mint':
      return 'moss';
    case 'sky':
      return 'sea';
    case 'plum':
      return 'ink';
    case 'rose':
    default:
      return 'berry';
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

function toDemoColorId(colorToken: NoteColorToken): NotesColorId {
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

function mapTopic(topic: DemoTopic, sortOrder: number): NotesTopic {
  return {
    topic_id: topic.id,
    name: topic.title,
    icon_key: toTopicIconKey(topic.iconId),
    icon_accent: toTopicAccentToken(topic.toneId),
    sort_order: sortOrder,
    created_at_unix_ms: topic.createdAt,
    updated_at_unix_ms: topic.createdAt,
    deleted_at_unix_ms: topic.deletedAt ?? 0,
  };
}

function toSizeBucket(value: number): NotesSizeBucket {
  const rounded = Math.round(value);
  if (rounded <= 1) return 1;
  if (rounded >= 5) return 5;
  return rounded as NotesSizeBucket;
}

function mapItem(note: NotesNote, previewText: string, sizeBucket: NotesSizeBucket): NotesItem {
  return {
    note_id: note.id,
    topic_id: note.topicId,
    body: note.text,
    preview_text: previewText,
    character_count: note.text.length,
    size_bucket: sizeBucket,
    style_version: 'note/v1',
    color_token: toColorToken(note.colorId),
    x: note.x,
    y: note.y,
    z_index: note.layer,
    created_at_unix_ms: note.createdAt,
    updated_at_unix_ms: note.updatedAt,
  };
}

function mapTrashItem(note: NotesNote, topic: DemoTopic | undefined, sortOrder: number): NotesTrashItem {
  const item = mapItem(note, note.text, toSizeBucket(1));
  return {
    ...item,
    topic_name: topic?.title ?? 'Untitled topic',
    topic_icon_key: toTopicIconKey(topic?.iconId ?? 'fox'),
    topic_icon_accent: toTopicAccentToken(topic?.toneId ?? 'coral'),
    topic_sort_order: sortOrder,
    deleted_at_unix_ms: note.deletedAt ?? note.updatedAt,
  };
}

function toViewport(value: { x: number; y: number; scale: number }): NotesViewport {
  return {
    x: value.x,
    y: value.y,
    scale: value.scale,
  };
}

export function useNotesDemoController(): NotesController {
  const notes = useNotesDemo();
  const viewport = createMemo(() => toViewport(notes.activeViewport()));

  const snapshot = createMemo<NotesSnapshot>(() => {
    const topics = notes.topics().map((topic, index) => mapTopic(topic, index + 1));
    const topicOrder = new Map<string, number>(topics.map((topic) => [topic.topic_id, topic.sort_order]));

    return normalizeNotesSnapshot({
      seq: 0,
      retention_hours: 72,
      topics,
      items: topics.flatMap((topic) =>
        notes.getNotesForTopic(topic.topic_id).map((note) => {
          const mapped = mapItem(
            note,
            notes.getTextPreview(note.text),
            toSizeBucket(notes.getNoteSize(note.text) + 1),
          );
          return {
            ...mapped,
          };
        })
      ),
      trash_items: notes.trashedNotes().map((note) => {
        const topic = notes.getTopic(note.topicId);
        return {
          ...mapTrashItem(note, topic, topicOrder.get(note.topicId) ?? Math.max(1, Math.round(topic?.createdAt ?? 1))),
          preview_text: notes.getTextPreview(note.text),
          size_bucket: toSizeBucket(notes.getNoteSize(note.text) + 1),
        };
      }),
    });
  });

  return {
    snapshot,
    activeTopicID: notes.activeTopicId,
    setActiveTopicID: notes.setActiveTopic,
    viewport,
    setViewport: (viewport) => notes.setViewport(notes.activeTopicId(), viewport),
    loading: () => false,
    connectionState: () => 'live',
    createTopic: (input) => {
      const topicID = notes.createTopic(input.name);
      const topic = notes.getTopic(topicID);
      if (!topic) {
        throw new Error('Topic creation failed');
      }
      const liveTopics = notes.topics();
      return mapTopic(topic, Math.max(1, liveTopics.findIndex((item) => item.id === topicID) + 1));
    },
    updateTopic: (topicID, input) => {
      notes.updateTopic(topicID, { title: input.name });
      const topic = notes.getTopic(topicID);
      if (!topic) {
        throw new Error('Topic update failed');
      }
      const liveTopics = notes.topics();
      return mapTopic(topic, Math.max(1, liveTopics.findIndex((item) => item.id === topicID) + 1));
    },
    deleteTopic: (topicID) => notes.deleteTopic(topicID),
    createNote: (input) => {
      const note = notes.createNote({
        topicId: input.topic_id,
        x: input.x,
        y: input.y,
        text: input.body,
        colorId: input.color_token ? toDemoColorId(input.color_token) : undefined,
      });
      if (!note) {
        throw new Error('Note creation failed');
      }
      return mapItem(note, notes.getTextPreview(note.text), toSizeBucket(notes.getNoteSize(note.text) + 1));
    },
    updateNote: (noteID, input) => {
      notes.updateNote(noteID, {
        text: input.body,
        colorId: input.color_token ? toDemoColorId(input.color_token) : undefined,
      });
      if (typeof input.x === 'number' || typeof input.y === 'number') {
        const current = notes.getNoteById(noteID);
        if (current) {
          notes.moveNote(noteID, {
            x: typeof input.x === 'number' ? input.x : current.x,
            y: typeof input.y === 'number' ? input.y : current.y,
          });
        }
      }
      const note = notes.getNoteById(noteID);
      if (!note) {
        throw new Error('Note update failed');
      }
      return mapItem(note, notes.getTextPreview(note.text), toSizeBucket(notes.getNoteSize(note.text) + 1));
    },
    bringNoteToFront: (noteID) => {
      notes.bringNoteToFront(noteID);
      const note = notes.getNoteById(noteID);
      return note
        ? mapItem(note, notes.getTextPreview(note.text), toSizeBucket(notes.getNoteSize(note.text) + 1))
        : undefined;
    },
    deleteNote: (noteID) => {
      notes.trashNote(noteID);
    },
    restoreNote: (noteID) => {
      notes.restoreNote(noteID);
      const note = notes.getNoteById(noteID);
      if (!note) {
        throw new Error('Note restore failed');
      }
      return mapItem(note, notes.getTextPreview(note.text), toSizeBucket(notes.getNoteSize(note.text) + 1));
    },
    deleteTrashedNotePermanently: (noteID) => {
      notes.deleteNotePermanently(noteID);
    },
    clearTrashTopic: (topicID) => {
      notes.clearTrashForTopic(topicID);
    },
  };
}
