import type { NotesItem } from './types';

export interface NotesNumberedItem {
  readonly item: NotesItem;
  readonly index: number;
  readonly label: string;
}

export type NotesDigitSequenceResolution =
  | Readonly<{ kind: 'invalid' }>
  | Readonly<{ kind: 'pending'; exactMatch: NotesNumberedItem | null }>
  | Readonly<{ kind: 'ready'; match: NotesNumberedItem }>;

export function sortNotesForNumbering(items: readonly NotesItem[]): NotesItem[] {
  return [...items].sort((left, right) =>
    left.created_at_unix_ms !== right.created_at_unix_ms
      ? left.created_at_unix_ms - right.created_at_unix_ms
      : left.note_id.localeCompare(right.note_id)
  );
}

export function numberNotesInTopic(
  items: readonly NotesItem[],
  topicID: string
): NotesNumberedItem[] {
  return sortNotesForNumbering(items.filter((item) => item.topic_id === topicID)).map(
    (item, index) => ({
      item,
      index: index + 1,
      label: String(index + 1),
    })
  );
}

export function resolveNotesDigitSequence(
  sequence: string,
  numberedItems: readonly NotesNumberedItem[]
): NotesDigitSequenceResolution {
  const normalized = String(sequence ?? '').trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    return { kind: 'invalid' };
  }

  const exactMatch = numberedItems.find((entry) => entry.label === normalized) ?? null;
  const hasLongerPrefix = numberedItems.some(
    (entry) => entry.label.startsWith(normalized) && entry.label !== normalized
  );

  if (exactMatch && !hasLongerPrefix) {
    return { kind: 'ready', match: exactMatch };
  }

  if (exactMatch || hasLongerPrefix) {
    return { kind: 'pending', exactMatch };
  }

  return { kind: 'invalid' };
}
