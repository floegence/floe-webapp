// @vitest-environment jsdom

import { createRoot, createSignal, untrack } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotesOverlay } from '../src/components/notes/NotesOverlay';
import {
  normalizeNotesSnapshot,
  promoteLocalItem,
  removeSnapshotItem,
  removeSnapshotTrashItem,
  replaceSnapshotItem,
  replaceSnapshotTrashItem,
  type NotesController,
  type NotesItem,
  type NotesSnapshot,
  type NotesTrashItem,
  type NotesViewport,
} from '../src/components/notes/types';

const notificationState = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
}));

vi.mock('../src/context', () => ({
  useNotification: () => notificationState,
}));

vi.mock('solid-motionone', async () => {
  const solid = await vi.importActual<typeof import('solid-js')>('solid-js');
  const web = await vi.importActual<typeof import('solid-js/web')>('solid-js/web');
  const createMotionDiv = (
    props: Record<string, unknown> & {
      children?: unknown;
      ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
    }
  ) => {
    const [local, rest] = solid.splitProps(props, [
      'children',
      'ref',
      'initial',
      'animate',
      'exit',
      'transition',
    ]);
    return <web.Dynamic component="div" ref={local.ref} {...rest}>{local.children}</web.Dynamic>;
  };
  const createMotionSection = (
    props: Record<string, unknown> & {
      children?: unknown;
      ref?: HTMLElement | ((el: HTMLElement) => void);
    }
  ) => {
    const [local, rest] = solid.splitProps(props, [
      'children',
      'ref',
      'initial',
      'animate',
      'exit',
      'transition',
    ]);
    return <web.Dynamic component="section" ref={local.ref} {...rest}>{local.children}</web.Dynamic>;
  };

  return {
    Motion: {
      div: createMotionDiv,
      section: createMotionSection,
    },
    Presence: (props: { children?: unknown }) => <>{props.children}</>,
  };
});

vi.mock('../src/ui', async () => {
  const actual = await vi.importActual<typeof import('../src/ui')>('../src/ui');

  return {
    ...actual,
    Input: (props: Record<string, unknown>) => <input {...props} />,
    Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
    Button: (props: Record<string, unknown> & { children?: unknown }) => (
      <button {...props}>{props.children}</button>
    ),
  };
});

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

function baseItem(overrides: Partial<NotesItem> = {}): NotesItem {
  return {
    ...baseSnapshot().items[0]!,
    ...overrides,
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

    const deleteTrashedNotePermanently = vi.fn(async (noteID: string) => {
      setCurrentSnapshot((value) => normalizeNotesSnapshot(removeSnapshotTrashItem(value, noteID)));
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
      deleteTrashedNotePermanently,
      clearTrashTopic,
    };

    return {
      controller,
      viewport,
      bringNoteToFront,
      deleteNote,
      restoreNote,
      deleteTrashedNotePermanently,
      clearTrashTopic,
      dispose,
    };
  });
}

function createDeferredMoveController(snapshot = baseSnapshot()) {
  return createRoot((dispose) => {
    const [currentSnapshot, setCurrentSnapshot] = createSignal(normalizeNotesSnapshot(snapshot));
    const [activeTopicID, setActiveTopicID] = createSignal(snapshot.topics[0]?.topic_id ?? '');
    const [viewport, setViewport] = createSignal<NotesViewport>({ x: 240, y: 120, scale: 1 });

    let resolveMove!: () => void;
    let rejectMove!: (error: unknown) => void;
    const movePromise = new Promise<void>((resolve, reject) => {
      resolveMove = resolve;
      rejectMove = reject;
    });

    const bringNoteToFront = vi.fn(async (noteID: string) => {
      setCurrentSnapshot((value) => normalizeNotesSnapshot(promoteLocalItem(value, noteID)));
      return untrack(currentSnapshot).items.find((entry) => entry.note_id === noteID);
    });

    const updateNote = vi.fn(async (noteID: string, input: { x?: number; y?: number }) => {
      await movePromise;
      const current = untrack(currentSnapshot).items.find((item) => item.note_id === noteID);
      if (!current) {
        throw new Error('Note missing');
      }

      const next: NotesItem = {
        ...current,
        x: input.x ?? current.x,
        y: input.y ?? current.y,
        updated_at_unix_ms: Date.now(),
      };

      setCurrentSnapshot((value) => normalizeNotesSnapshot(replaceSnapshotItem(value, next)));
      return next;
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
      createNote: async (input) =>
        baseSnapshot().items[0]
          ? {
              ...baseSnapshot().items[0]!,
              note_id: 'note-created',
              topic_id: input.topic_id,
              body: input.body,
              preview_text: input.body,
              character_count: input.body.length,
              x: input.x,
              y: input.y,
            }
          : baseItem(),
      updateNote,
      bringNoteToFront,
      deleteNote: vi.fn(async () => undefined),
      restoreNote: vi.fn(async () => {
        throw new Error('Unused in test');
      }),
      deleteTrashedNotePermanently: vi.fn(async () => undefined),
      clearTrashTopic: vi.fn(async () => undefined),
    };

    return {
      controller,
      viewport,
      bringNoteToFront,
      updateNote,
      removeLiveNote(noteID: string) {
        setCurrentSnapshot((value) =>
          normalizeNotesSnapshot({
            ...value,
            items: value.items.filter((item) => item.note_id !== noteID),
          }),
        );
      },
      resolveMove,
      rejectMove,
      dispose,
    };
  });
}

function createDeferredFrontController(snapshot = baseSnapshot()) {
  return createRoot((dispose) => {
    const [currentSnapshot, setCurrentSnapshot] = createSignal(normalizeNotesSnapshot(snapshot));
    const [activeTopicID, setActiveTopicID] = createSignal(snapshot.topics[0]?.topic_id ?? '');
    const [viewport, setViewport] = createSignal<NotesViewport>({ x: 240, y: 120, scale: 1 });

    let rejectFront!: (error: unknown) => void;
    const frontPromise = new Promise<void>((_, reject) => {
      rejectFront = reject;
    });

    const bringNoteToFront = vi.fn(async (noteID: string) => {
      await frontPromise;
      const note = untrack(currentSnapshot).items.find((entry) => entry.note_id === noteID);
      if (!note) {
        throw new Error('note not found');
      }
      setCurrentSnapshot((value) => normalizeNotesSnapshot(promoteLocalItem(value, noteID)));
      return untrack(currentSnapshot).items.find((entry) => entry.note_id === noteID);
    });

    const deleteNote = vi.fn(async (noteID: string) => {
      const note = untrack(currentSnapshot).items.find((entry) => entry.note_id === noteID);
      if (!note) return;
      setCurrentSnapshot((value) =>
        normalizeNotesSnapshot(replaceSnapshotTrashItem(removeSnapshotItem(value, noteID), toTrashItem(note))),
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
        if (!current) throw new Error('Topic missing');
        return { ...current, name: input.name, updated_at_unix_ms: Date.now() };
      },
      deleteTopic: async () => true,
      createNote: async (input) => ({
        ...baseItem(),
        note_id: 'note-created',
        topic_id: input.topic_id,
        body: input.body,
        preview_text: input.body,
        character_count: input.body.length,
        x: input.x,
        y: input.y,
      }),
      updateNote: async (noteID, input) => {
        const current = currentSnapshot().items.find((item) => item.note_id === noteID);
        if (!current) throw new Error('Note missing');
        const next = {
          ...current,
          x: input.x ?? current.x,
          y: input.y ?? current.y,
          body: input.body ?? current.body,
          preview_text: input.body ?? current.preview_text,
          color_token: input.color_token ?? current.color_token,
          updated_at_unix_ms: Date.now(),
        };
        setCurrentSnapshot((value) => normalizeNotesSnapshot(replaceSnapshotItem(value, next)));
        return next;
      },
      bringNoteToFront,
      deleteNote,
      restoreNote: vi.fn(async () => {
        throw new Error('Unused in test');
      }),
      deleteTrashedNotePermanently: vi.fn(async () => undefined),
      clearTrashTopic: vi.fn(async () => undefined),
    };

    return {
      controller,
      bringNoteToFront,
      deleteNote,
      rejectFront,
      dispose,
    };
  });
}

function createDeferredFrontTopicDeleteController(snapshot: NotesSnapshot) {
  return createRoot((dispose) => {
    const [currentSnapshot, setCurrentSnapshot] = createSignal(normalizeNotesSnapshot(snapshot));
    const [activeTopicID, setActiveTopicID] = createSignal(snapshot.topics[0]?.topic_id ?? '');
    const [viewport, setViewport] = createSignal<NotesViewport>({ x: 240, y: 120, scale: 1 });

    let rejectFront!: (error: unknown) => void;
    const frontPromise = new Promise<void>((_, reject) => {
      rejectFront = reject;
    });

    const bringNoteToFront = vi.fn(async (noteID: string) => {
      await frontPromise;
      const note = untrack(currentSnapshot).items.find((entry) => entry.note_id === noteID);
      if (!note) {
        throw new Error('note not found');
      }
      return note;
    });

    const deleteTopic = vi.fn(async (topicID: string) => {
      setCurrentSnapshot((value) =>
        normalizeNotesSnapshot({
          ...value,
          topics: value.topics.filter((topic) => topic.topic_id !== topicID),
          items: value.items.filter((item) => item.topic_id !== topicID),
          trash_items: [
            ...value.trash_items,
            ...value.items
              .filter((item) => item.topic_id === topicID)
              .map((item) => ({
                ...toTrashItem(item),
                topic_id: topicID,
              })),
          ],
        }),
      );
      setActiveTopicID((current) => (current === topicID ? 'topic-2' : current));
      return true;
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
        if (!current) throw new Error('Topic missing');
        return { ...current, name: input.name, updated_at_unix_ms: Date.now() };
      },
      deleteTopic,
      createNote: async (input) => ({
        ...baseItem(),
        note_id: 'note-created',
        topic_id: input.topic_id,
        body: input.body,
        preview_text: input.body,
        character_count: input.body.length,
        x: input.x,
        y: input.y,
      }),
      updateNote: async (noteID, input) => {
        const current = currentSnapshot().items.find((item) => item.note_id === noteID);
        if (!current) throw new Error('Note missing');
        const next = {
          ...current,
          x: input.x ?? current.x,
          y: input.y ?? current.y,
          updated_at_unix_ms: Date.now(),
        };
        setCurrentSnapshot((value) => normalizeNotesSnapshot(replaceSnapshotItem(value, next)));
        return next;
      },
      bringNoteToFront,
      deleteNote: vi.fn(async () => undefined),
      restoreNote: vi.fn(async () => {
        throw new Error('Unused in test');
      }),
      deleteTrashedNotePermanently: vi.fn(async () => undefined),
      clearTrashTopic: vi.fn(async () => undefined),
    };

    return {
      controller,
      bringNoteToFront,
      deleteTopic,
      rejectFront,
      dispose,
    };
  });
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  if (typeof requestAnimationFrame !== 'undefined') {
    await new Promise((resolve) =>
      requestAnimationFrame(() => window.setTimeout(resolve, 0)),
    );
  }
}

function mockCanvasFrameRect(host: HTMLElement): void {
  const frame = host.querySelector('.notes-page__canvas') as HTMLDivElement | null;
  if (!frame) return;

  Object.defineProperty(frame, 'clientWidth', {
    configurable: true,
    value: 960,
  });

  Object.defineProperty(frame, 'clientHeight', {
    configurable: true,
    value: 640,
  });

  Object.defineProperty(frame, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      right: 960,
      bottom: 640,
      width: 960,
      height: 640,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
}

function mockElementsFromPoint(
  resolver: (clientX: number, clientY: number) => Element[],
): () => void {
  const original = document.elementsFromPoint;
  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    value: vi.fn((clientX: number, clientY: number) => resolver(clientX, clientY)),
  });

  return () => {
    if (original) {
      Object.defineProperty(document, 'elementsFromPoint', {
        configurable: true,
        value: original,
      });
      return;
    }

    delete (document as Document & { elementsFromPoint?: Document['elementsFromPoint'] }).elementsFromPoint;
  };
}

function dragNote(handle: HTMLButtonElement, pointerId: number, nextClientX: number, nextClientY: number) {
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 20,
      clientY: 24,
      pointerId,
    }),
  );
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      clientX: nextClientX,
      clientY: nextClientY,
      pointerId,
    }),
  );
  window.dispatchEvent(
    new PointerEvent('pointerup', {
      bubbles: true,
      button: 0,
      clientX: nextClientX,
      clientY: nextClientY,
      pointerId,
    }),
  );
}

function trackWindowKeydownListeners() {
  const originalAddEventListener = window.addEventListener.bind(window);
  const originalRemoveEventListener = window.removeEventListener.bind(window);
  const handlers = new Set<(event: KeyboardEvent) => void>();

  const addSpy = vi
    .spyOn(window, 'addEventListener')
    .mockImplementation((type, listener, options) => {
      if (type === 'keydown' && typeof listener === 'function') {
        handlers.add(listener as (event: KeyboardEvent) => void);
      }
      return originalAddEventListener(type, listener, options as AddEventListenerOptions);
    });

  const removeSpy = vi
    .spyOn(window, 'removeEventListener')
    .mockImplementation((type, listener, options) => {
      if (type === 'keydown' && typeof listener === 'function') {
        handlers.delete(listener as (event: KeyboardEvent) => void);
      }
      return originalRemoveEventListener(type, listener, options as EventListenerOptions);
    });

  return {
    dispatch(event: KeyboardEvent) {
      for (const handler of handlers) {
        handler(event);
      }
    },
    restore() {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    },
  };
}

describe('NotesOverlay', () => {
  const disposers: Array<() => void> = [];
  const mount = (view: () => unknown, host: HTMLElement) => {
    disposers.push(renderSolid(view, host));
  };

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
    notificationState.error.mockReset();
    notificationState.success.mockReset();
    notificationState.info.mockReset();
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

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();
    const noteBody = host.querySelector('.notes-note__body') as HTMLButtonElement | null;
    expect(noteBody).toBeTruthy();

    noteBody!.click();
    await settle();

    expect((navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('Primary note body');
    expect(state.bringNoteToFront).toHaveBeenCalledWith('note-1');
    expect(state.bringNoteToFront).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('Copied');
  });

  it('copies only the note body when a headline is present', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController({
      ...baseSnapshot(),
      items: [
        baseItem({
          title: 'Launch checklist',
          body: 'Primary note body',
          preview_text: 'Primary note body',
          character_count: 'Primary note body'.length,
        }),
      ],
    });
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();
    const noteBody = host.querySelector('.notes-note__body') as HTMLButtonElement | null;
    expect(noteBody).toBeTruthy();

    noteBody!.click();
    await settle();

    expect((navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('Primary note body');
    expect((navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalledWith(
      'Launch checklist\n\nPrimary note body'
    );
    expect(host.textContent).toContain('Launch checklist');
    expect(host.textContent).toContain('Copied');
  });

  it('opens the editor instead of copying when a note only has a headline', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController({
      ...baseSnapshot(),
      items: [
        baseItem({
          title: 'Color key',
          body: '   ',
          preview_text: '',
          character_count: 0,
        }),
      ],
    });
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();
    const noteBody = host.querySelector('.notes-note__body') as HTMLButtonElement | null;
    expect(noteBody).toBeTruthy();

    noteBody!.click();
    await settle();

    expect((navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain('Copied');
    expect(document.body.querySelector('.notes-flyout--editor')).toBeTruthy();
  });

  it('keeps modal interaction semantics by default', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    const onClose = vi.fn();
    const keydownTracker = trackWindowKeydownListeners();
    disposers.push(state.dispose);

    const externalInput = document.createElement('input');
    document.body.appendChild(externalInput);
    externalInput.focus();

    mount(() => <NotesOverlay open controller={state.controller} onClose={onClose} />, host);
    await settle();

    const overlay = host.querySelector('.notes-overlay') as HTMLElement | null;
    const closeButton = host.querySelector(
      'button[aria-label="Close notes overlay"]'
    ) as HTMLButtonElement | null;

    expect(overlay?.getAttribute('data-notes-interaction-mode')).toBe('modal');
    expect(overlay?.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(closeButton);

    externalInput.focus();
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(escapeEvent, 'target', { configurable: true, value: externalInput });
    keydownTracker.dispatch(escapeEvent);
    await settle();

    expect(onClose).toHaveBeenCalledTimes(1);
    keydownTracker.restore();
  });

  it('supports floating interaction semantics without stealing focus', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    const onClose = vi.fn();
    const keydownTracker = trackWindowKeydownListeners();
    disposers.push(state.dispose);

    const externalInput = document.createElement('input');
    document.body.appendChild(externalInput);
    externalInput.focus();

    mount(
      () => (
        <NotesOverlay
          open
          controller={state.controller}
          onClose={onClose}
          interactionMode="floating"
        />
      ),
      host,
    );
    await settle();

    const overlay = host.querySelector('.notes-overlay') as HTMLElement | null;
    const closeButton = host.querySelector(
      'button[aria-label="Close notes overlay"]'
    ) as HTMLButtonElement | null;

    expect(overlay?.getAttribute('data-notes-interaction-mode')).toBe('floating');
    expect(overlay?.hasAttribute('aria-modal')).toBe(false);
    expect(document.activeElement).toBe(externalInput);

    const outsideEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(outsideEscape, 'target', { configurable: true, value: externalInput });
    keydownTracker.dispatch(outsideEscape);
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);

    closeButton!.focus();
    keydownTracker.restore();
  });

  it('preserves the command palette keybind while floating Notes is focused', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    mount(
      () => (
        <NotesOverlay
          open
          controller={state.controller}
          onClose={() => undefined}
          interactionMode="floating"
        />
      ),
      host,
    );
    await settle();

    const bubbleSpy = vi.fn();
    const bubbleHandler = (event: KeyboardEvent) => bubbleSpy(event.key);
    window.addEventListener('keydown', bubbleHandler);

    const noteBody = host.querySelector('.notes-note__body') as HTMLButtonElement | null;
    expect(noteBody).toBeTruthy();

    noteBody!.focus();
    noteBody!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    noteBody!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '.',
        ctrlKey: true,
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(bubbleSpy.mock.calls.map(([key]) => key)).toEqual(['k']);

    window.removeEventListener('keydown', bubbleHandler);
  });

  it('preserves caller allowlisted global hotkeys while floating Notes is focused', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    mount(
      () => (
        <NotesOverlay
          open
          controller={state.controller}
          onClose={() => undefined}
          interactionMode="floating"
          allowGlobalHotkeys={['mod+.']}
        />
      ),
      host,
    );
    await settle();

    const bubbleSpy = vi.fn();
    const bubbleHandler = (event: KeyboardEvent) => bubbleSpy(event.key);
    window.addEventListener('keydown', bubbleHandler);

    const dragHandle = host.querySelector('button[aria-label="Drag note"]') as HTMLButtonElement | null;
    expect(dragHandle).toBeTruthy();

    dragHandle!.focus();
    dragHandle!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '.',
        ctrlKey: true,
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(bubbleSpy.mock.calls.map(([key]) => key)).toEqual(['.']);

    window.removeEventListener('keydown', bubbleHandler);
  });

  it('opens the trash flyout from the dock toggle', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    const toggle = host.querySelector('.notes-trash__toggle') as HTMLButtonElement | null;
    expect(toggle).toBeTruthy();

    toggle!.click();
    await settle();

    const panel = document.body.querySelector('.notes-trash__panel') as HTMLDivElement | null;
    expect(panel).toBeTruthy();
    expect(host.contains(panel!)).toBe(false);
  });

  it('opens the custom context menu when right-clicking the canvas', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();
    mockCanvasFrameRect(host);

    const canvas = host.querySelector('.floe-infinite-canvas') as HTMLDivElement | null;
    expect(canvas).toBeTruthy();

    canvas!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 240,
        clientY: 160,
      })
    );
    await settle();

    const menu = document.body.querySelector('.notes-menu') as HTMLDivElement | null;
    expect(menu).toBeTruthy();
    expect(host.contains(menu!)).toBe(false);
    expect(menu?.textContent).toContain('Paste here');
    expect(menu?.textContent).toContain('New note');
    expect(menu?.textContent).not.toContain('Delete');
  });

  it('opens the note context menu when right-clicking a note', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();
    mockCanvasFrameRect(host);

    const note = host.querySelector('.notes-note') as HTMLElement | null;
    expect(note).toBeTruthy();

    note!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 260,
        clientY: 180,
      })
    );
    await settle();

    const menu = document.body.querySelector('.notes-menu') as HTMLDivElement | null;
    expect(menu).toBeTruthy();
    expect(host.contains(menu!)).toBe(false);
    expect(menu?.textContent).toContain('Delete');
    expect(state.bringNoteToFront).toHaveBeenCalledWith('note-1');
  });

  it('retargets the open context menu when right-clicking another canvas point through the backdrop', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();
    mockCanvasFrameRect(host);

    const canvas = host.querySelector('.floe-infinite-canvas') as HTMLDivElement | null;
    expect(canvas).toBeTruthy();

    canvas!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 240,
        clientY: 160,
      }),
    );
    await settle();

    const backdrop = document.body.querySelector('.notes-menu-backdrop') as HTMLDivElement | null;
    const menu = document.body.querySelector('.notes-menu') as HTMLDivElement | null;
    expect(backdrop).toBeTruthy();
    expect(menu).toBeTruthy();
    expect(menu?.style.left).toBe('240px');
    expect(menu?.style.top).toBe('160px');

    const restoreElementsFromPoint = mockElementsFromPoint(() => [backdrop!, canvas!]);

    backdrop!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 412,
        clientY: 286,
      }),
    );
    await settle();
    restoreElementsFromPoint();

    const retargetedMenu = document.body.querySelector('.notes-menu') as HTMLDivElement | null;
    expect(retargetedMenu).toBeTruthy();
    expect(retargetedMenu?.style.left).toBe('412px');
    expect(retargetedMenu?.style.top).toBe('286px');
    expect(retargetedMenu?.textContent).toContain('Paste here');
    expect(retargetedMenu?.textContent).not.toContain('Delete');
  });

  it('retargets the open context menu from one note to another through the backdrop', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController({
      ...baseSnapshot(),
      items: [
        baseSnapshot().items[0]!,
        {
          note_id: 'note-2',
          topic_id: 'topic-1',
          body: 'Secondary note body',
          preview_text: 'Secondary note body',
          character_count: 19,
          size_bucket: 3,
          style_version: 'note/v1',
          color_token: 'amber',
          x: 360,
          y: 180,
          z_index: 2,
          created_at_unix_ms: 3,
          updated_at_unix_ms: 3,
        },
      ],
    });
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();
    mockCanvasFrameRect(host);

    const notes = host.querySelectorAll('.notes-note');
    const firstNote = notes[0] as HTMLElement | undefined;
    const secondNote = notes[1] as HTMLElement | undefined;
    expect(firstNote).toBeTruthy();
    expect(secondNote).toBeTruthy();

    firstNote!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 260,
        clientY: 180,
      }),
    );
    await settle();

    const backdrop = document.body.querySelector('.notes-menu-backdrop') as HTMLDivElement | null;
    expect(backdrop).toBeTruthy();

    const restoreElementsFromPoint = mockElementsFromPoint(() => [backdrop!, secondNote!]);

    backdrop!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 480,
        clientY: 240,
      }),
    );
    await settle();
    restoreElementsFromPoint();

    const menu = document.body.querySelector('.notes-menu') as HTMLDivElement | null;
    expect(menu).toBeTruthy();
    expect(menu?.style.left).toBe('480px');
    expect(menu?.style.top).toBe('240px');
    expect(menu?.textContent).toContain('Delete');
    expect(state.bringNoteToFront).toHaveBeenLastCalledWith('note-2');
  });

  it('renders the editor flyout through a body portal so its controls stay interactive', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    const editButton = host.querySelector('button[aria-label="Edit note"]') as HTMLButtonElement | null;
    expect(editButton).toBeTruthy();

    editButton!.click();
    await settle();

    const editor = document.body.querySelector('.notes-flyout--editor') as HTMLDivElement | null;
    expect(editor).toBeTruthy();
    expect(host.contains(editor!)).toBe(false);
  });

  it('treats portaled editor flyouts as inside the floating notes surface for Escape handling', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    const onClose = vi.fn();
    const keydownTracker = trackWindowKeydownListeners();
    disposers.push(state.dispose);

    mount(
      () => (
        <NotesOverlay
          open
          controller={state.controller}
          onClose={onClose}
          interactionMode="floating"
        />
      ),
      host,
    );
    await settle();

    const editButton = host.querySelector('button[aria-label="Edit note"]') as HTMLButtonElement | null;
    expect(editButton).toBeTruthy();

    editButton!.click();
    await settle();

    const editorTextarea = document.body.querySelector('.notes-flyout--editor textarea') as HTMLTextAreaElement | null;
    expect(editorTextarea).toBeTruthy();
    editorTextarea!.focus();

    const insideEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(insideEscape, 'target', { configurable: true, value: editorTextarea });
    keydownTracker.dispatch(insideEscape);
    await settle();

    expect(document.body.querySelector('.notes-flyout--editor')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    keydownTracker.restore();
  });

  it('dismisses floating notes when clicking outside the notes surface', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    const onClose = vi.fn();
    disposers.push(state.dispose);

    const outsideButton = document.createElement('button');
    outsideButton.type = 'button';
    outsideButton.textContent = 'outside';
    document.body.appendChild(outsideButton);

    mount(
      () => (
        <NotesOverlay
          open
          controller={state.controller}
          onClose={onClose}
          interactionMode="floating"
        />
      ),
      host,
    );
    await settle();

    outsideButton.click();
    await settle();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps notes open when clicking notes-owned backdrops in floating mode', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    const onClose = vi.fn();
    disposers.push(state.dispose);

    mount(
      () => (
        <NotesOverlay
          open
          controller={state.controller}
          onClose={onClose}
          interactionMode="floating"
        />
      ),
      host,
    );
    await settle();
    mockCanvasFrameRect(host);

    const canvas = host.querySelector('.floe-infinite-canvas') as HTMLDivElement | null;
    expect(canvas).toBeTruthy();

    canvas!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 240,
        clientY: 160,
      }),
    );
    await settle();

    const backdrop = document.body.querySelector('.notes-menu-backdrop') as HTMLDivElement | null;
    expect(backdrop).toBeTruthy();

    backdrop!.click();
    await settle();

    expect(document.body.querySelector('.notes-menu')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('treats dragging a note as canvas pan instead of copy', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    const noteBody = host.querySelector('.notes-note__body') as HTMLButtonElement | null;
    const canvas = host.querySelector('.floe-infinite-canvas') as HTMLDivElement | null;
    expect(noteBody).toBeTruthy();
    expect(canvas).toBeTruthy();

    noteBody!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 40, clientY: 50, pointerId: 2 }));
    canvas!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 78, clientY: 96, pointerId: 2 }));
    canvas!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, clientX: 78, clientY: 96, pointerId: 2 }));
    await settle();

    expect((navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain('Copied');
  });

  it('keeps the dropped note position projected while the move mutation is still pending', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createDeferredMoveController({
      ...baseSnapshot(),
      items: [
        baseItem({
          note_id: 'note-1',
          color_token: 'sage',
          x: 120,
          y: 90,
          z_index: 1,
        }),
        baseItem({
          note_id: 'note-2',
          body: 'Anchor note',
          preview_text: 'Anchor note',
          character_count: 11,
          color_token: 'coral',
          x: 520,
          y: 320,
          z_index: 2,
          updated_at_unix_ms: 3,
        }),
      ],
    });
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();
    mockCanvasFrameRect(host);

    const note = host.querySelector('[data-floe-notes-note-id="note-1"]') as HTMLElement | null;
    const dragHandle = host.querySelector('button[aria-label="Drag note"]') as HTMLButtonElement | null;
    const overviewNote = host.querySelector('.notes-overview__note.notes-note--moss') as HTMLDivElement | null;
    expect(note).toBeTruthy();
    expect(dragHandle).toBeTruthy();
    expect(overviewNote).toBeTruthy();

    const initialOverviewLeft = overviewNote!.style.left;
    dragNote(dragHandle!, 11, 110, 124);
    await settle();

    const projectedNote = host.querySelector('[data-floe-notes-note-id="note-1"]') as HTMLElement | null;
    const projectedOverviewNote = host.querySelector('.notes-overview__note.notes-note--moss') as HTMLDivElement | null;
    expect(state.bringNoteToFront).toHaveBeenCalledWith('note-1');
    expect(state.bringNoteToFront).toHaveBeenCalledTimes(1);
    expect(state.updateNote).toHaveBeenCalledWith('note-1', { x: 210, y: 190 });
    expect(projectedNote?.style.transform).toBe('translate(210px, 190px)');
    expect(projectedOverviewNote?.style.left).not.toBe(initialOverviewLeft);

    state.resolveMove();
    await settle();

    const settledNote = host.querySelector('[data-floe-notes-note-id="note-1"]') as HTMLElement | null;
    expect(settledNote?.style.transform).toBe('translate(210px, 190px)');
  });

  it('clears the projected move position when the move mutation fails', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createDeferredMoveController(baseSnapshot());
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    const note = host.querySelector('[data-floe-notes-note-id="note-1"]') as HTMLElement | null;
    const dragHandle = host.querySelector('button[aria-label="Drag note"]') as HTMLButtonElement | null;
    expect(note).toBeTruthy();
    expect(dragHandle).toBeTruthy();

    dragNote(dragHandle!, 12, 110, 124);
    await settle();
    const projectedNote = host.querySelector('[data-floe-notes-note-id="note-1"]') as HTMLElement | null;
    expect(projectedNote?.style.transform).toBe('translate(210px, 190px)');

    state.rejectMove(new Error('Move failed'));
    await settle();

    const reconciledNote = host.querySelector('[data-floe-notes-note-id="note-1"]') as HTMLElement | null;
    expect(reconciledNote?.style.transform).toBe('translate(120px, 90px)');
  });

  it('moves deleted notes into trash and restores them through the trash panel', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    const deleteButton = host.querySelector('button[aria-label="Move note to trash"]') as HTMLButtonElement | null;
    expect(deleteButton).toBeTruthy();
    deleteButton!.click();
    await settle();

    expect(state.deleteNote).toHaveBeenCalledWith('note-1');
    expect(state.bringNoteToFront).not.toHaveBeenCalled();
    expect(document.body.querySelector('.notes-trash__panel')).toBeTruthy();
    expect(document.body.textContent).toContain('Research');

    const restoreButton = [...document.body.querySelectorAll('.notes-trash-note__actions button')].find(
      (button) => button.textContent?.includes('Restore')
    ) as HTMLButtonElement | undefined;
    expect(restoreButton).toBeTruthy();
    restoreButton!.click();
    await settle();

    expect(state.restoreNote).toHaveBeenCalledWith('note-1');
    expect(document.body.querySelector('.notes-trash__panel')).toBeTruthy();
  });

  it('suppresses stale bring-forward errors after deleting a note from its context menu', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createDeferredFrontController();
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();
    mockCanvasFrameRect(host);

    const note = host.querySelector('.notes-note') as HTMLElement | null;
    expect(note).toBeTruthy();

    note!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 260,
        clientY: 180,
      }),
    );
    await settle();

    const deleteAction = Array.from(document.body.querySelectorAll('.notes-menu button')).find((button) =>
      button.textContent?.includes('Delete'),
    ) as HTMLButtonElement | undefined;
    expect(deleteAction).toBeTruthy();

    deleteAction!.click();
    await settle();
    state.rejectFront(new Error('note not found'));
    await settle();

    expect(state.deleteNote).toHaveBeenCalledWith('note-1');
    expect(notificationState.error).not.toHaveBeenCalledWith('Bring forward failed', 'note not found');
  });

  it('suppresses stale move errors after the note disappears while the move is pending', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createDeferredMoveController(baseSnapshot());
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    const dragHandle = host.querySelector('button[aria-label="Drag note"]') as HTMLButtonElement | null;
    expect(dragHandle).toBeTruthy();

    dragNote(dragHandle!, 13, 110, 124);
    await settle();
    state.removeLiveNote('note-1');
    await settle();
    state.rejectMove(new Error('note not found'));
    await settle();

    expect(notificationState.error).not.toHaveBeenCalledWith('Move failed', 'note not found');
  });

  it('suppresses stale bring-forward errors when topic deletion removes the note', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createDeferredFrontTopicDeleteController({
      ...baseSnapshot(),
      topics: [
        baseSnapshot().topics[0]!,
        {
          topic_id: 'topic-2',
          name: 'Parking Lot',
          icon_key: 'otter',
          icon_accent: 'sea',
          sort_order: 2,
          created_at_unix_ms: 3,
          updated_at_unix_ms: 3,
          deleted_at_unix_ms: 0,
        },
      ],
    });
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();
    mockCanvasFrameRect(host);

    const note = host.querySelector('.notes-note') as HTMLElement | null;
    expect(note).toBeTruthy();
    note!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 260,
        clientY: 180,
      }),
    );
    await settle();

    const deleteTopicButton = host.querySelector('button[aria-label="Delete topic Research"]') as HTMLButtonElement | null;
    expect(deleteTopicButton).toBeTruthy();
    deleteTopicButton!.click();
    await settle();

    state.rejectFront(new Error('note not found'));
    await settle();

    expect(state.deleteTopic).toHaveBeenCalledWith('topic-1');
    expect(notificationState.error).not.toHaveBeenCalledWith('Bring forward failed', 'note not found');
  });

  it('still reports genuine bring-forward failures while the note remains live', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    const failingBring = vi.fn(async () => {
      throw new Error('Front unavailable');
    });
    state.controller.bringNoteToFront = failingBring;
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    const noteBody = host.querySelector('.notes-note__body') as HTMLButtonElement | null;
    expect(noteBody).toBeTruthy();
    noteBody!.click();
    await settle();

    expect(failingBring).toHaveBeenCalledWith('note-1');
    expect(notificationState.error).toHaveBeenCalledWith('Bring forward failed', 'Front unavailable');
  });

  it('keeps trash note actions rendered for long-content notes', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const longBody = Array.from({ length: 40 }, (_, index) => `Segment ${index + 1}`).join(' ');
    const state = createController({
      ...baseSnapshot(),
      items: [],
      trash_items: [
        {
          ...toTrashItem(baseSnapshot().items[0]!),
          note_id: 'trash-1',
          body: longBody,
          preview_text: longBody,
          character_count: longBody.length,
          size_bucket: 5,
        },
      ],
    });
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    const toggle = host.querySelector('.notes-trash__toggle') as HTMLButtonElement | null;
    expect(toggle).toBeTruthy();
    toggle!.click();
    await settle();

    const actions = document.body.querySelector('.notes-trash-note__actions') as HTMLDivElement | null;
    expect(actions).toBeTruthy();
    expect(actions?.querySelectorAll('button')).toHaveLength(2);
    expect(actions?.textContent).toContain('Restore');
    expect(actions?.textContent).toContain('Delete now');
  });

  it('shows the mobile topic chips and overview entry point on narrow screens', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    expect(host.querySelector('.notes-page__mobile-topic')).toBeTruthy();
    expect(host.querySelector('button[aria-label="Open overview map"]')).toBeTruthy();
  });

  it('closes child layers before closing the root overlay', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    const onClose = vi.fn();
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={onClose} />, host);
    await settle();

    const toggle = host.querySelector('.notes-trash__toggle') as HTMLButtonElement | null;
    expect(toggle).toBeTruthy();
    toggle!.click();
    await settle();
    expect(document.body.querySelector('.notes-trash__panel')).toBeTruthy();

    const closeButton = host.querySelector(
      'button[aria-label="Close notes overlay"]'
    ) as HTMLButtonElement | null;
    expect(closeButton).toBeTruthy();

    closeButton!.click();
    await settle();
    expect(document.body.querySelector('.notes-trash__panel')).toBeFalsy();
    expect(onClose).not.toHaveBeenCalled();

    closeButton!.click();
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('commits viewport movement on minimap release instead of during drag', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const setup = createController();
    disposers.push(setup.dispose);

    mount(() => <NotesOverlay open controller={setup.controller} onClose={() => undefined} />, host);
    await settle();
    mockCanvasFrameRect(host);

    const minimap = host.querySelector('.notes-overview__surface') as HTMLDivElement | null;
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
    const afterReleaseViewport = setup.viewport();

    expect(afterDownViewport).toEqual(initialViewport);
    expect(afterMoveViewport).toEqual(initialViewport);
    expect(afterReleaseViewport).not.toEqual(initialViewport);
  });

  it('permanently deletes trashed notes when requested from the trash flyout', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const state = createController();
    disposers.push(state.dispose);

    mount(() => <NotesOverlay open controller={state.controller} onClose={() => undefined} />, host);
    await settle();

    const deleteButton = host.querySelector('button[aria-label="Move note to trash"]') as HTMLButtonElement | null;
    deleteButton!.click();
    await settle();
    expect(document.body.querySelector('.notes-trash__panel')).toBeTruthy();

    const deleteNowButton = [...document.body.querySelectorAll('.notes-trash-note__actions button')].find(
      (button) => button.textContent?.includes('Delete now')
    ) as HTMLButtonElement | undefined;
    expect(deleteNowButton).toBeTruthy();
    deleteNowButton!.click();
    await settle();

    expect(state.deleteTrashedNotePermanently).toHaveBeenCalledWith('note-1');
  });
});
