import { describe, expect, it } from 'vitest';
import type { NotesItem } from '../src/components/notes/types';
import {
  numberNotesInTopic,
  resolveNotesDigitSequence,
} from '../src/components/notes/notesNumbering';

function note(overrides: Partial<NotesItem> = {}): NotesItem {
  return {
    note_id: 'note-1',
    topic_id: 'topic-1',
    title: '',
    body: 'Primary note body',
    preview_text: 'Primary note body',
    character_count: 17,
    size_bucket: 2,
    style_version: 'note/v1',
    color_token: 'sage',
    x: 120,
    y: 90,
    z_index: 1,
    created_at_unix_ms: 2,
    updated_at_unix_ms: 2,
    ...overrides,
  };
}

describe('notesNumbering', () => {
  it('numbers only the active topic and keeps creation order stable', () => {
    const numbered = numberNotesInTopic(
      [
        note({ note_id: 'note-3', topic_id: 'topic-2', created_at_unix_ms: 1 }),
        note({ note_id: 'note-2', created_at_unix_ms: 6 }),
        note({ note_id: 'note-1', created_at_unix_ms: 3 }),
      ],
      'topic-1'
    );

    expect(numbered.map((entry) => entry.item.note_id)).toEqual(['note-1', 'note-2']);
    expect(numbered.map((entry) => entry.label)).toEqual(['1', '2']);
  });

  it('renumbers continuously after items disappear from the topic list', () => {
    const initial = numberNotesInTopic(
      [
        note({ note_id: 'note-1', created_at_unix_ms: 1 }),
        note({ note_id: 'note-2', created_at_unix_ms: 2 }),
        note({ note_id: 'note-3', created_at_unix_ms: 3 }),
      ],
      'topic-1'
    );
    expect(initial.map((entry) => entry.label)).toEqual(['1', '2', '3']);

    const afterDelete = numberNotesInTopic(
      [
        note({ note_id: 'note-1', created_at_unix_ms: 1 }),
        note({ note_id: 'note-3', created_at_unix_ms: 3 }),
      ],
      'topic-1'
    );
    expect(afterDelete.map((entry) => entry.item.note_id)).toEqual(['note-1', 'note-3']);
    expect(afterDelete.map((entry) => entry.label)).toEqual(['1', '2']);
  });

  it('treats exact multi-digit prefixes as pending until the sequence is unambiguous', () => {
    const numbered = numberNotesInTopic(
      Array.from({ length: 12 }, (_, index) =>
        note({
          note_id: `note-${index + 1}`,
          body: `Body ${index + 1}`,
          created_at_unix_ms: index + 1,
          updated_at_unix_ms: index + 1,
          z_index: index + 1,
        })
      ),
      'topic-1'
    );

    expect(resolveNotesDigitSequence('1', numbered)).toEqual({
      kind: 'pending',
      exactMatch: numbered[0],
    });
    expect(resolveNotesDigitSequence('12', numbered)).toEqual({
      kind: 'ready',
      match: numbered[11],
    });
    expect(resolveNotesDigitSequence('19', numbered)).toEqual({ kind: 'invalid' });
    expect(resolveNotesDigitSequence('0', numbered)).toEqual({ kind: 'invalid' });
  });
});
