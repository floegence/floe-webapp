// @vitest-environment jsdom

import { createRoot, createSignal, untrack } from 'solid-js';
import { render } from 'solid-js/web/dist/web.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotesOverlay } from '../src/components/notes/NotesOverlay';
import {
  normalizeNotesSnapshot,
  promoteLocalItem,
  removeSnapshotItem,
  replaceSnapshotItem,
  replaceSnapshotTrashItem,
  type NotesController,
  type NotesItem,
  type NotesSnapshot,
  type NotesTrashItem,
  type NotesViewport,
} from '../src/components/notes/types';

type MotionDivProps = Record<string, unknown> & {
  children?: unknown;
};

vi.mock('solid-motionone', () => ({
  Motion: {
    div: (props: MotionDivProps) => <div {...props}>{props.children}</div>,
  },
}));

vi.mock('../src/context', () => ({
  useNotification: () => ({
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  }),
}));

function baseSnapshot(): NotesSnapshot {
  return {
    seq: 1,
    retention_hours: 72,
    topics: [
      {
        topic_id: 'topic-1',
        name: 'Research',
        icon_key: 'fox',
        icon_accent: 'ember',
        sort_order: 1,
        created_at_unix_ms: 1,
        updated_at_unix_ms: 1,
        deleted_at_unix_ms: 0,
      },
    ],
    items: [
      {
        note_id: 'note-1',
        topic_id: 'topic-1',
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
      },
    ],
    trash_items: [],
  };
}

function toTrashItem(item: NotesItem): NotesTrashItem {
  return {
    ...item,
    topic_name: 'Research',
    topic_icon_key: 'fox',
    topic_icon_accent: 'ember',
    topic_sort_order: 1,
    deleted_at_unix_ms: Date.now(),
  };
}

function createController(snapshot = baseSnapshot()) {
  return createRoot((dispose) => {
    const [currentSnapshot, setCurrentSnapshot] = createSignal(normalizeNotesSnapshot(snapshot));
    const [activeTopicID, setActiveTopicID] = createSignal(snapshot.topics[0]?.topic_id ?? '');
    const [viewport, setViewport] = createSignal<NotesViewport>({ x: 240, y: 120, scale: 1 });

    const bringNoteToFront = vi.fn(async (noteID: string) => {
      setCurrentSnapshot((value) => normalizeNotesSnapshot(promoteLocalItem(value, noteID)));
      return untrack(currentSnapshot).items.find((entry) => entry.note_id === noteID);
    });

    const deleteNote = vi.fn(async (noteID: string) => {
      const note = untrack(currentSnapshot).items.find((entry) => entry.note_id === noteID);
      if (!note) return;
      setCurrentSnapshot((value) =>
        normalizeNotesSnapshot(replaceSnapshotTrashItem(removeSnapshotItem(value, noteID), toTrashItem(note)))
      );
    });

    const restoreNote = vi.fn(async (noteID: string) => {
      const trashItem = untrack(currentSnapshot).trash_items.find((entry) => entry.note_id === noteID);
      if (!trashItem) {
        throw new Error('Trash note missing');
      }
      const restored: NotesItem = {
        note_id: trashItem.note_id,
        topic_id: trashItem.topic_id,
        body: trashItem.body,
        preview_text: trashItem.preview_text,
        character_count: trashItem.character_count,
        size_bucket: trashItem.size_bucket,
        style_version: trashItem.style_version,
        color_token: trashItem.color_token,
        x: trashItem.x,
        y: trashItem.y,
        z_index: trashItem.z_index + 1,
        created_at_unix_ms: trashItem.created_at_unix_ms,
        updated_at_unix_ms: Date.now(),
      };

      setCurrentSnapshot((value) =>
        normalizeNotesSnapshot({
          ...replaceSnapshotItem(
            {
              ...value,
              trash_items: value.trash_items.filter((item) => item.note_id !== noteID),
            },
            restored,
          ),
        })
      );

      return restored;
    });

    const clearTrashTopic = vi.fn(async (topicID: string) => {
      setCurrentSnapshot((value) =>
        normalizeNotesSnapshot({
          ...value,
          trash_items: value.trash_items.filter((item) => item.topic_id !== topicID),
        })
      );
    });

    const controller: NotesController = {
      snapshot: currentSnapshot,
      activeTopicID,
      setActiveTopicID,
      viewport,
      setViewport,
      loading: () => false,
      connectionState: () => 'live',
      createTopic: async () => snapshot.topics[0]!,
      updateTopic: async (topicID, input) => {
        const current = currentSnapshot().topics.find((topic) => topic.topic_id === topicID);
        if (!current) {
          throw new Error('Topic missing');
        }
        return { ...current, name: input.name, updated_at_unix_ms: Date.now() };
      },
      deleteTopic: async () => true,
      createNote: async (input) => {
        const created: NotesItem = {
          note_id: 'note-created',
          topic_id: input.topic_id,
          body: input.body,
          preview_text: input.body,
          character_count: input.body.length,
          size_bucket: 1,
          style_version: 'note/v1',
          color_token: input.color_token ?? 'sage',
          x: input.x,
          y: input.y,
          z_index: 2,
          created_at_unix_ms: Date.now(),
          updated_at_unix_ms: Date.now(),
        };
        setCurrentSnapshot((value) => normalizeNotesSnapshot(replaceSnapshotItem(value, created)));
        return created;
      },
      updateNote: async (noteID, input) => {
        const current = currentSnapshot().items.find((item) => item.note_id === noteID);
        if (!current) {
          throw new Error('Note missing');
        }
        const next: NotesItem = {
          ...current,
          body: input.body ?? current.body,
          preview_text: input.body ?? current.preview_text,
          color_token: input.color_token ?? current.color_token,
          x: input.x ?? current.x,
          y: input.y ?? current.y,
          updated_at_unix_ms: Date.now(),
        };
        setCurrentSnapshot((value) => normalizeNotesSnapshot(replaceSnapshotItem(value, next)));
        return next;
      },
      bringNoteToFront,
      deleteNote,
      restoreNote,
      clearTrashTopic,
    };

    return { controller, viewport, bringNoteToFront, deleteNote, restoreNote, clearTrashTopic, dispose };
  });
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

describe('NotesOverlay', () => {
  const disposers: Array<() => void> = [];

  beforeEach(() => {
    if (typeof PointerEvent === 'undefined') {
      (globalThis as typeof globalThis & { PointerEvent?: typeof MouseEvent }).PointerEvent = MouseEvent as typeof PointerEvent;
    }
    if (typeof ResizeObserver === 'undefined') {
      (globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver = class {
        observe() {}
        disconnect() {}
        unobserve() {}
      } as unknown as typeof ResizeObserver;
    }
    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = (() => undefined) as typeof HTMLElement.prototype.setPointerCapture;
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = (() => undefined) as typeof HTMLElement.prototype.releasePointerCapture;
    }
    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = (() => true) as typeof HTMLElement.prototype.hasPointerCapture;
    }

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(async () => undefined),
        readText: vi.fn(async () => 'Clipboard note'),
      },
    });
  });

  afterEach(() => {
    while (disposers.length) {
      disposers.pop()?.();
    }
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('copies a note on the first click and shows the copied state', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    render(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    const note = host.querySelector('.notes-note') as HTMLDivElement | null;
    expect(note).toBeTruthy();

    note!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 60, clientY: 80, pointerId: 1 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, clientX: 60, clientY: 80, pointerId: 1 }));
    await settle();

    expect((navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('Primary note body');
    expect(state.bringNoteToFront).toHaveBeenCalledWith('note-1');
    expect(host.textContent).toContain('Copied');
  });

  it('treats dragging a note as canvas pan instead of copy', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    render(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    const note = host.querySelector('.notes-note') as HTMLDivElement | null;
    expect(note).toBeTruthy();

    note!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 40, clientY: 50, pointerId: 2 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 78, clientY: 96, pointerId: 2 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, clientX: 78, clientY: 96, pointerId: 2 }));
    await settle();

    expect((navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain('Copied');
  });

  it('moves deleted notes into trash and restores them through the trash panel', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    render(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    const deleteButton = host.querySelector('button[aria-label="Delete note"]') as HTMLButtonElement | null;
    expect(deleteButton).toBeTruthy();
    deleteButton!.click();
    await settle();

    expect(state.deleteNote).toHaveBeenCalledWith('note-1');

    const trashDock = host.querySelector('button[aria-label="Open trash"]') as HTMLButtonElement | null;
    expect(trashDock).toBeTruthy();
    trashDock!.click();
    await settle();

    expect(host.textContent).toContain('Research');

    const restoreButton = host.querySelector('button[aria-label="Restore note"]') as HTMLButtonElement | null;
    expect(restoreButton).toBeTruthy();
    restoreButton!.click();
    await settle();

    expect(state.restoreNote).toHaveBeenCalledWith('note-1');
    expect(host.querySelector('button[aria-label="Open trash"]')).toBeTruthy();
  });

  it('collapses the topic rail on mobile and reopens it from the HUD', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    render(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    const rail = host.querySelector('.notes-overlay__rail') as HTMLElement | null;
    expect(rail?.className).toContain('is-closed');

    const hudButton = host.querySelector('button[aria-label="Open topics"]') as HTMLButtonElement | null;
    expect(hudButton).toBeTruthy();
    hudButton!.click();
    await settle();

    expect(rail?.className).toContain('is-open');
  });

  it('updates the viewport continuously while dragging on the minimap', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const setup = createController();
    disposers.push(setup.dispose);

    render(() => <NotesOverlay open controller={setup.controller} onClose={() => undefined} />, host);
    await settle();

    const minimap = host.querySelector('.notes-minimap') as HTMLDivElement | null;
    expect(minimap).toBeTruthy();

    Object.defineProperty(minimap!, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 170,
        bottom: 118,
        width: 170,
        height: 118,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const initialViewport = setup.viewport();

    minimap!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 20, clientY: 18, pointerId: 7 }));
    await settle();
    const afterDownViewport = setup.viewport();

    minimap!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 138, clientY: 94, pointerId: 7 }));
    await settle();
    const afterMoveViewport = setup.viewport();

    minimap!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, clientX: 138, clientY: 94, pointerId: 7 }));
    await settle();

    expect(afterDownViewport).not.toEqual(initialViewport);
    expect(afterMoveViewport).not.toEqual(afterDownViewport);
  });
});
