import { createEffect, createMemo, createSignal, onCleanup, untrack, type JSX } from 'solid-js';
import { useNotification } from '../../context';
import { Paste, Plus, Trash } from '../../icons';
import {
  estimateNotesContextMenuHeight,
  NOTES_CONTEXT_MENU_WIDTH_PX,
  type NotesContextMenuItem,
} from './NotesContextMenu';
import {
  clamp,
  createContextMenuPosition,
  createOverviewItem,
  findTrashTopicNoteCount,
  getNormalizedOverviewPoint,
  hasLiveNotesForTopic,
  NOTES_CANVAS_ZOOM_STEP,
  NOTES_MOBILE_BREAKPOINT_PX,
  normalizeNoteText,
  resolveCenteredViewport,
  resolveFrameSize,
  resolveOverviewBounds,
  samePoint,
  type NotesCanvasPlacement,
  type NotesContextMenuState,
  type NotesOverviewBounds,
  type NotesOverviewNavigationState,
  type NotesOverviewViewportMetrics,
} from './notesOverlayHelpers';
import {
  numberNotesInTopic,
  resolveNotesDigitSequence,
  type NotesNumberedItem,
} from './notesNumbering';
import {
  computeBoardBounds,
  groupTrashItems,
  normalizeNotesSnapshot,
  type NotesController,
  type NotesItem,
  type NotesTopic,
  type NotesViewport,
  visibleWorldRect,
} from './types';

export interface UseNotesOverlayModelOptions {
  open: boolean;
  onClose: () => void;
  controller: NotesController;
}

const NOTE_DIGIT_SEQUENCE_TIMEOUT_MS = 650;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useNotesOverlayModel(options: UseNotesOverlayModelOptions) {
  const notifications = useNotification();
  let nextNoteOperationToken = 1;
  let previousLiveNoteIDs = new Set<string>();
  const pendingFrontTokens = new Map<string, number>();
  const pendingMoveTokens = new Map<string, number>();

  const [canvasFrameRef, setCanvasFrameRef] = createSignal<HTMLDivElement | undefined>();
  const [canvasFrameSize, setCanvasFrameSize] = createSignal({ width: 0, height: 0 });

  const [contextMenu, setContextMenu] = createSignal<NotesContextMenuState | null>(null);
  const [draftTopicTitle, setDraftTopicTitle] = createSignal('');
  const [renamingTopicID, setRenamingTopicID] = createSignal<string | null>(null);
  const [renamingTopicTitle, setRenamingTopicTitle] = createSignal('');
  const [editorNoteID, setEditorNoteID] = createSignal<string | null>(null);
  const [draftTitle, setDraftTitle] = createSignal('');
  const [draftBody, setDraftBody] = createSignal('');
  const [draftColor, setDraftColor] = createSignal<
    'graphite' | 'sage' | 'amber' | 'azure' | 'coral' | 'rose'
  >('amber');
  const [trashOpen, setTrashOpen] = createSignal(false);
  const [overviewOpen, setOverviewOpen] = createSignal(false);
  const [manualPasteTarget, setManualPasteTarget] = createSignal<NotesCanvasPlacement | null>(null);
  const [manualPasteText, setManualPasteText] = createSignal('');
  const [copiedNoteID, setCopiedNoteID] = createSignal<string | null>(null);
  const [pendingDigitSequence, setPendingDigitSequence] = createSignal('');
  const [clock, setClock] = createSignal(Date.now());
  const [isMobile, setIsMobile] = createSignal(false);
  const [optimisticFrontNoteID, setOptimisticFrontNoteID] = createSignal<string | null>(null);
  const [overviewNavigationState, setOverviewNavigationState] =
    createSignal<NotesOverviewNavigationState | null>(null);
  const [viewportPreview, setViewportPreview] = createSignal<NotesViewport | null>(null);
  const [transientMoveProjections, setTransientMoveProjections] = createSignal<
    ReadonlyMap<string, { x: number; y: number }>
  >(new Map());

  let copiedResetTimer: number | undefined;
  let pendingDigitTimer: number | undefined;
  let overviewAbortController: AbortController | undefined;
  let editorSeededForNoteID: string | null = null;

  const snapshot = createMemo(() => normalizeNotesSnapshot(options.controller.snapshot()));
  const topics = createMemo(() =>
    snapshot().topics.filter((topic) => topic.deleted_at_unix_ms <= 0)
  );
  const headerTopicCount = createMemo(() => topics().length);

  const resolvedActiveTopicID = createMemo(() => {
    const current = options.controller.activeTopicID();
    if (topics().some((topic) => topic.topic_id === current)) return current;
    return topics()[0]?.topic_id ?? '';
  });

  const activeTopic = createMemo(() =>
    topics().find((topic) => topic.topic_id === resolvedActiveTopicID())
  );
  const projectedItems = createMemo(() => {
    const projections = transientMoveProjections();
    return snapshot().items.map((item) => {
      const projected = projections.get(item.note_id);
      if (!projected) return item;
      if (samePoint({ x: item.x, y: item.y }, projected)) return item;
      return {
        ...item,
        x: projected.x,
        y: projected.y,
      };
    });
  });
  const activeItems = createMemo(() =>
    projectedItems().filter((item) => item.topic_id === resolvedActiveTopicID())
  );
  const numberedActiveItems = createMemo(() =>
    numberNotesInTopic(snapshot().items, resolvedActiveTopicID())
  );
  const noteNumberByID = createMemo(
    () => new Map(numberedActiveItems().map((entry) => [entry.item.note_id, entry.label]))
  );
  const trashGroups = createMemo(() => groupTrashItems(snapshot().trash_items));
  const trashCount = createMemo(() => snapshot().trash_items.length);
  const totalLiveNotes = createMemo(() => snapshot().items.length);
  const topActiveLayer = createMemo(() =>
    activeItems().reduce((maxLayer, item) => Math.max(maxLayer, item.z_index), 1)
  );
  const effectiveViewport = createMemo(() => viewportPreview() ?? options.controller.viewport());
  const activeTopicLabel = createMemo(() => activeTopic()?.name ?? 'No topic');
  const boardScaleLabel = createMemo(() => `${Math.round(effectiveViewport().scale * 100)}%`);
  const visibleRect = createMemo(() => {
    const frame = resolveFrameSize(canvasFrameSize());
    return visibleWorldRect(effectiveViewport(), frame.width, frame.height);
  });
  const overviewBounds = createMemo<NotesOverviewBounds>(() =>
    resolveOverviewBounds(computeBoardBounds(activeItems()), visibleRect())
  );
  const overviewItems = createMemo(() =>
    activeItems().map((item) => createOverviewItem(item, overviewBounds()))
  );

  const overviewViewportMetrics = createMemo<NotesOverviewViewportMetrics>(() => {
    const bounds = overviewBounds();
    const frame = resolveFrameSize(canvasFrameSize());
    const viewport = effectiveViewport();
    const worldLeft = -viewport.x / viewport.scale;
    const worldTop = -viewport.y / viewport.scale;
    const worldWidth = frame.width / viewport.scale;
    const worldHeight = frame.height / viewport.scale;
    const left = clamp(worldLeft, bounds.minX, bounds.maxX);
    const top = clamp(worldTop, bounds.minY, bounds.maxY);
    const right = clamp(worldLeft + worldWidth, bounds.minX, bounds.maxX);
    const bottom = clamp(worldTop + worldHeight, bounds.minY, bounds.maxY);
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

  const editingNote = createMemo(() => {
    const noteID = editorNoteID();
    return noteID ? snapshot().items.find((item) => item.note_id === noteID) : undefined;
  });
  const digitShortcutsBlocked = createMemo(
    () =>
      Boolean(
        editorNoteID() ||
          manualPasteTarget() ||
          renamingTopicID() ||
          contextMenu() ||
          trashOpen()
      )
  );
  const pendingShortcutNoteID = createMemo(() => {
    const sequence = pendingDigitSequence();
    if (!sequence) return null;

    const resolution = resolveNotesDigitSequence(sequence, numberedActiveItems());
    if (resolution.kind !== 'pending') return null;
    return resolution.exactMatch?.item.note_id ?? null;
  });
  const hasLiveNote = (noteID: string) =>
    untrack(() => snapshot().items.some((item) => item.note_id === noteID));
  const issueNoteOperationToken = () => {
    const token = nextNoteOperationToken;
    nextNoteOperationToken += 1;
    return token;
  };
  const issuePendingFrontToken = (noteID: string) => {
    const token = issueNoteOperationToken();
    pendingFrontTokens.set(noteID, token);
    return token;
  };
  const issuePendingMoveToken = (noteID: string) => {
    const token = issueNoteOperationToken();
    pendingMoveTokens.set(noteID, token);
    return token;
  };
  const isCurrentFrontToken = (noteID: string, token: number) =>
    pendingFrontTokens.get(noteID) === token;
  const isCurrentMoveToken = (noteID: string, token: number) =>
    pendingMoveTokens.get(noteID) === token;
  const clearPendingFrontToken = (noteID: string) => {
    pendingFrontTokens.delete(noteID);
  };
  const clearPendingMoveToken = (noteID: string) => {
    pendingMoveTokens.delete(noteID);
  };
  const invalidateNoteOperationGuards = (noteID: string) => {
    clearPendingFrontToken(noteID);
    clearPendingMoveToken(noteID);
    clearTransientMoveProjection(noteID);
    setOptimisticFrontNoteID((current) => (current === noteID ? null : current));
  };
  const invalidateTopicOperationGuards = (topicID: string) => {
    for (const item of snapshot().items) {
      if (item.topic_id !== topicID) continue;
      invalidateNoteOperationGuards(item.note_id);
    }
  };
  const reconcileRemovedLiveNote = (noteID: string) => {
    invalidateNoteOperationGuards(noteID);
    clearCopiedState();
    setCopiedNoteID((current) => (current === noteID ? null : current));
    setContextMenu((current) => (current?.noteID === noteID ? null : current));
    setEditorNoteID((current) => (current === noteID ? null : current));
  };
  const resetNoteOperationGuards = () => {
    pendingFrontTokens.clear();
    pendingMoveTokens.clear();
  };

  const clearCopiedState = () => {
    if (copiedResetTimer === undefined) return;
    window.clearTimeout(copiedResetTimer);
    copiedResetTimer = undefined;
  };

  const clearPendingDigitState = () => {
    if (pendingDigitTimer !== undefined) {
      window.clearTimeout(pendingDigitTimer);
      pendingDigitTimer = undefined;
    }
    setPendingDigitSequence('');
  };

  const seedTransientMoveProjection = (noteID: string, position: { x: number; y: number }) => {
    setTransientMoveProjections((current) => {
      const existing = current.get(noteID);
      if (existing && samePoint(existing, position)) return current;

      const next = new Map(current);
      next.set(noteID, position);
      return next;
    });
  };

  const clearTransientMoveProjection = (noteID: string) => {
    setTransientMoveProjections((current) => {
      if (!current.has(noteID)) return current;

      const next = new Map(current);
      next.delete(noteID);
      return next;
    });
  };

  const closeManualPaste = () => {
    setManualPasteTarget(null);
    setManualPasteText('');
  };

  const closeEditor = () => {
    setEditorNoteID(null);
  };

  const closeOverview = () => {
    setOverviewOpen(false);
  };

  const openOverview = () => {
    setOverviewOpen(true);
  };

  const closeTrash = () => {
    setTrashOpen(false);
  };

  const openTrash = () => {
    setTrashOpen(true);
  };

  const cancelTopicRename = () => {
    setRenamingTopicID(null);
    setRenamingTopicTitle('');
  };

  const resetTransientLayers = () => {
    setContextMenu(null);
    closeTrash();
    closeOverview();
    closeEditor();
    closeManualPaste();
    setTransientMoveProjections(new Map());
    resetNoteOperationGuards();
  };

  const handleCloseRequest = () => {
    if (contextMenu()) {
      setContextMenu(null);
      return;
    }
    if (editorNoteID()) {
      closeEditor();
      return;
    }
    if (manualPasteTarget()) {
      closeManualPaste();
      return;
    }
    if (overviewOpen()) {
      closeOverview();
      return;
    }
    if (trashOpen()) {
      closeTrash();
      return;
    }
    options.onClose();
  };

  const selectTopic = (topicID: string) => {
    options.controller.setActiveTopicID(topicID);
  };

  const getLiveNoteCount = (topicID: string) => hasLiveNotesForTopic(snapshot().items, topicID);

  const getPlacementFromClientPoint = (
    clientX: number,
    clientY: number,
    topicID = activeTopic()?.topic_id
  ): NotesCanvasPlacement | null => {
    if (!topicID) return null;

    const topic = topics().find((entry) => entry.topic_id === topicID);
    if (!topic) return null;

    const frame = canvasFrameRef();
    if (!frame) return null;

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

    const viewport = effectiveViewport();

    return {
      topicID: topic.topic_id,
      worldX: (clientX - rect.left - viewport.x) / viewport.scale,
      worldY: (clientY - rect.top - viewport.y) / viewport.scale,
    };
  };

  const getElementsFromClientPoint = (clientX: number, clientY: number): Element[] => {
    if (typeof document === 'undefined') return [];
    if (typeof document.elementsFromPoint === 'function') {
      return document.elementsFromPoint(clientX, clientY);
    }

    const target = document.elementFromPoint(clientX, clientY);
    return target ? [target] : [];
  };

  const findNoteTargetAtClientPoint = (clientX: number, clientY: number): NotesItem | undefined => {
    const noteID = getElementsFromClientPoint(clientX, clientY)
      .filter((element): element is HTMLElement => element instanceof HTMLElement)
      .map((element) => element.closest<HTMLElement>('[data-floe-notes-note-id]'))
      .find(Boolean)
      ?.dataset.floeNotesNoteId?.trim();

    if (!noteID) return undefined;
    return snapshot().items.find((item) => item.note_id === noteID);
  };

  const resolveContextMenuStateAtClientPoint = (
    clientX: number,
    clientY: number,
    options?: { topicID?: string; noteID?: string | null }
  ): NotesContextMenuState | null => {
    const placement = getPlacementFromClientPoint(clientX, clientY, options?.topicID);
    if (!placement) return null;

    return {
      clientX,
      clientY,
      worldX: placement.worldX,
      worldY: placement.worldY,
      topicID: placement.topicID,
      noteID: options?.noteID ?? null,
    };
  };

  const getViewportCenterPlacement = (): NotesCanvasPlacement | null => {
    const topic = activeTopic();
    if (!topic) return null;
    const frame = resolveFrameSize(canvasFrameSize());
    const viewport = effectiveViewport();
    return {
      topicID: topic.topic_id,
      worldX: (frame.width / 2 - viewport.x) / viewport.scale,
      worldY: (frame.height / 2 - viewport.y) / viewport.scale,
    };
  };

  const openContextMenuAtClientPoint = (
    clientX: number,
    clientY: number,
    options?: { topicID?: string; noteID?: string | null }
  ) => {
    const next = resolveContextMenuStateAtClientPoint(clientX, clientY, options);
    if (!next) return false;

    setContextMenu(next);
    return true;
  };

  const retargetContextMenuAtClientPoint = (clientX: number, clientY: number) => {
    const note = findNoteTargetAtClientPoint(clientX, clientY);
    if (note) {
      commitFront(note.note_id);
      const next = resolveContextMenuStateAtClientPoint(clientX, clientY, {
        topicID: note.topic_id,
        noteID: note.note_id,
      });
      setContextMenu(next);
      return;
    }

    setContextMenu(resolveContextMenuStateAtClientPoint(clientX, clientY));
  };

  const commitViewport = (viewport: NotesViewport) => {
    setViewportPreview(viewport);
    options.controller.setViewport(viewport);
    setViewportPreview(null);
  };

  const resolveViewportAtCenter = (worldX: number, worldY: number, scale?: number) =>
    resolveCenteredViewport({
      viewport: effectiveViewport(),
      frame: canvasFrameSize(),
      bounds: overviewBounds(),
      worldX,
      worldY,
      scale,
    });

  const adjustViewportScale = (direction: 'in' | 'out') => {
    const viewport = effectiveViewport();
    const frame = resolveFrameSize(canvasFrameSize());
    const centerWorldX = (frame.width / 2 - viewport.x) / viewport.scale;
    const centerWorldY = (frame.height / 2 - viewport.y) / viewport.scale;
    const nextScale =
      direction === 'in'
        ? viewport.scale * NOTES_CANVAS_ZOOM_STEP
        : viewport.scale / NOTES_CANVAS_ZOOM_STEP;

    commitViewport(resolveViewportAtCenter(centerWorldX, centerWorldY, nextScale));
  };

  const syncOverviewToClientPoint = (
    clientX: number,
    clientY: number,
    navigationState: NotesOverviewNavigationState
  ) => {
    const rect = navigationState.surfaceRect;
    if (rect.width <= 0 || rect.height <= 0) return;

    const pointer = getNormalizedOverviewPoint(clientX, clientY, rect);
    const centerX = clamp(pointer.x - navigationState.centerOffsetX, 0, 1);
    const centerY = clamp(pointer.y - navigationState.centerOffsetY, 0, 1);
    const bounds = navigationState.bounds;

    setViewportPreview(
      resolveViewportAtCenter(
        bounds.minX + centerX * bounds.width,
        bounds.minY + centerY * bounds.height
      )
    );
  };

  const clearOverviewNavigation = (commit: boolean) => {
    overviewAbortController?.abort();
    overviewAbortController = undefined;

    if (commit) {
      const preview = viewportPreview();
      if (preview) {
        options.controller.setViewport(preview);
      }
    }

    setViewportPreview(null);
    setOverviewNavigationState(null);
  };

  const beginOverviewNavigation: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.button !== 0 && event.pointerType !== 'touch' && event.pointerType !== 'pen') {
      return;
    }

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

    const navigationState: NotesOverviewNavigationState = {
      pointerId: event.pointerId,
      bounds: overviewBounds(),
      surfaceRect,
      centerOffsetX: insideViewport ? pointer.x - viewport.centerX / 100 : 0,
      centerOffsetY: insideViewport ? pointer.y - viewport.centerY / 100 : 0,
    };

    clearOverviewNavigation(false);
    event.preventDefault();
    event.stopPropagation();
    setOverviewNavigationState(navigationState);
    syncOverviewToClientPoint(event.clientX, event.clientY, navigationState);
    surface.setPointerCapture?.(event.pointerId);

    const controller = new AbortController();
    overviewAbortController = controller;

    const handleMove = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== event.pointerId) return;
      syncOverviewToClientPoint(nextEvent.clientX, nextEvent.clientY, navigationState);
    };

    const finish = (nextEvent: PointerEvent) => {
      if (nextEvent.pointerId !== event.pointerId) return;
      if (surface.hasPointerCapture?.(event.pointerId)) {
        surface.releasePointerCapture(event.pointerId);
      }
      clearOverviewNavigation(true);
    };

    surface.addEventListener('pointermove', handleMove, { signal: controller.signal });
    surface.addEventListener('pointerup', finish, {
      once: true,
      signal: controller.signal,
    });
    surface.addEventListener('pointercancel', finish, {
      once: true,
      signal: controller.signal,
    });
  };

  const createNewNoteAt = async (placement: NotesCanvasPlacement) => {
    try {
      const created = await options.controller.createNote({
        topic_id: placement.topicID,
        x: placement.worldX,
        y: placement.worldY,
        body: '',
      });
      setEditorNoteID(created.note_id);
    } catch (error) {
      notifications.error('Create failed', errorMessage(error));
    }
  };

  const createPastedNoteAt = async (placement: NotesCanvasPlacement, text: string) => {
    try {
      await options.controller.createNote({
        topic_id: placement.topicID,
        x: placement.worldX,
        y: placement.worldY,
        body: text,
      });
      notifications.success('Pasted', 'Created a new note from clipboard text.');
    } catch (error) {
      notifications.error('Paste failed', errorMessage(error));
    }
  };

  const openManualPaste = (placement: NotesCanvasPlacement) => {
    setManualPasteText('');
    setManualPasteTarget(placement);
  };

  const pasteNoteAt = async (placement: NotesCanvasPlacement) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        notifications.info('Clipboard empty', 'Paste text into the dialog to create a note.');
        openManualPaste(placement);
        return;
      }
      await createPastedNoteAt(placement, text);
    } catch {
      notifications.info('Clipboard blocked', 'Manual paste is available as a fallback.');
      openManualPaste(placement);
    }
  };

  const markCopied = (noteID: string) => {
    clearCopiedState();
    setCopiedNoteID(noteID);
    copiedResetTimer = window.setTimeout(() => {
      copiedResetTimer = undefined;
      setCopiedNoteID((current) => (current === noteID ? null : current));
    }, 1100);
  };

  const copyNumberedNote = async (entry: NotesNumberedItem) => {
    clearPendingDigitState();

    const clipboardText = normalizeNoteText(entry.item.body);
    if (!clipboardText) {
      notifications.info('Nothing to copy', `Note #${entry.label} has no body text.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(clipboardText);
      markCopied(entry.item.note_id);
      notifications.success('Copied', `Note #${entry.label} copied to clipboard.`);
    } catch {
      notifications.error('Copy failed', 'Clipboard write was not available.');
    }
  };

  const schedulePendingDigitSequence = (sequence: string) => {
    if (pendingDigitTimer !== undefined) {
      window.clearTimeout(pendingDigitTimer);
    }

    setPendingDigitSequence(sequence);
    pendingDigitTimer = window.setTimeout(() => {
      pendingDigitTimer = undefined;
      if (untrack(pendingDigitSequence) !== sequence) return;

      setPendingDigitSequence('');
      const resolution = resolveNotesDigitSequence(sequence, untrack(numberedActiveItems));
      if (resolution.kind === 'ready') {
        void copyNumberedNote(resolution.match);
        return;
      }
      if (resolution.kind === 'pending' && resolution.exactMatch) {
        void copyNumberedNote(resolution.exactMatch);
      }
    }, NOTE_DIGIT_SEQUENCE_TIMEOUT_MS);
  };

  const handleDigitShortcutResolution = (sequence: string): boolean => {
    const resolution = resolveNotesDigitSequence(sequence, numberedActiveItems());
    if (resolution.kind === 'invalid') {
      return false;
    }
    if (resolution.kind === 'ready') {
      clearPendingDigitState();
      void copyNumberedNote(resolution.match);
      return true;
    }

    schedulePendingDigitSequence(sequence);
    return true;
  };

  const handleDigitShortcut = (digit: string) => {
    const currentSequence = pendingDigitSequence();
    const nextSequence = `${currentSequence}${digit}`;

    if (handleDigitShortcutResolution(currentSequence ? nextSequence : digit)) {
      return;
    }

    if (!currentSequence || digit === '0') {
      clearPendingDigitState();
      return;
    }

    if (!handleDigitShortcutResolution(digit)) {
      clearPendingDigitState();
    }
  };

  const startOptimisticFront = (noteID: string) => {
    setOptimisticFrontNoteID(noteID);
  };

  const commitFront = (noteID: string) => {
    const token = issuePendingFrontToken(noteID);
    setOptimisticFrontNoteID(noteID);
    void Promise.resolve(options.controller.bringNoteToFront(noteID))
      .then(() => {
        if (!isCurrentFrontToken(noteID, token)) return;
        clearPendingFrontToken(noteID);
      })
      .catch((error) => {
        if (!isCurrentFrontToken(noteID, token)) return;
        clearPendingFrontToken(noteID);
        if (!hasLiveNote(noteID)) {
          setOptimisticFrontNoteID((current) => (current === noteID ? null : current));
          return;
        }
        notifications.error('Bring forward failed', errorMessage(error));
        setOptimisticFrontNoteID((current) => (current === noteID ? null : current));
      });
  };

  const openEditor = (noteID: string) => {
    clearPendingDigitState();
    setContextMenu(null);
    setEditorNoteID(noteID);
  };

  const handleCopyNote = async (item: NotesItem) => {
    clearPendingDigitState();
    const clipboardText = normalizeNoteText(item.body);
    if (!clipboardText) {
      setContextMenu(null);
      setEditorNoteID(item.note_id);
      return;
    }

    try {
      await navigator.clipboard.writeText(clipboardText);
      markCopied(item.note_id);
    } catch {
      notifications.error('Copy failed', 'Clipboard write was not available.');
    }
  };

  const handleMoveToTrash = async (noteID: string) => {
    try {
      invalidateNoteOperationGuards(noteID);
      await options.controller.deleteNote(noteID);
      clearCopiedState();
      setCopiedNoteID((current) => (current === noteID ? null : current));
      openTrash();
    } catch (error) {
      notifications.error('Delete failed', errorMessage(error));
    }
  };

  const handleRestoreNote = async (noteID: string) => {
    try {
      clearTransientMoveProjection(noteID);
      await options.controller.restoreNote(noteID);
    } catch (error) {
      notifications.error('Restore failed', errorMessage(error));
    }
  };

  const handleDeleteNow = async (noteID: string) => {
    if (!options.controller.deleteTrashedNotePermanently) return;
    try {
      clearTransientMoveProjection(noteID);
      await options.controller.deleteTrashedNotePermanently(noteID);
    } catch (error) {
      notifications.error('Delete failed', errorMessage(error));
    }
  };

  const handleClearTopicTrash = async (topicID: string) => {
    try {
      await options.controller.clearTrashTopic(topicID);
    } catch (error) {
      notifications.error('Trash failed', errorMessage(error));
    }
  };

  const saveEditor = async () => {
    const noteID = editorNoteID();
    if (!noteID) return;

    try {
      await options.controller.updateNote(noteID, {
        headline: draftTitle(),
        title: draftTitle(),
        body: draftBody(),
        color_token: draftColor(),
      });
      notifications.success('Saved', 'Note updated.');
      closeEditor();
    } catch (error) {
      notifications.error('Save failed', errorMessage(error));
    }
  };

  const confirmManualPaste = async () => {
    const target = manualPasteTarget();
    if (!target || !manualPasteText().trim()) return;
    await createPastedNoteAt(target, manualPasteText());
    closeManualPaste();
  };

  const submitTopic = async () => {
    const title = draftTopicTitle().trim();
    if (!title) return;

    try {
      const topic = await options.controller.createTopic({ name: title });
      setDraftTopicTitle('');
      selectTopic(topic.topic_id);
    } catch (error) {
      notifications.error('Topic failed', errorMessage(error));
    }
  };

  const startTopicRename = (topic: NotesTopic) => {
    setRenamingTopicID(topic.topic_id);
    setRenamingTopicTitle(topic.name);
  };

  const saveTopicRename = async () => {
    const topicID = renamingTopicID();
    if (!topicID) return;
    const nextTitle = renamingTopicTitle().trim();
    cancelTopicRename();
    if (!nextTitle) return;

    try {
      await options.controller.updateTopic(topicID, { name: nextTitle });
    } catch (error) {
      notifications.error('Rename failed', errorMessage(error));
    }
  };

  const handleDeleteTopic = async (topic: NotesTopic) => {
    const noteCount =
      getLiveNoteCount(topic.topic_id) +
      findTrashTopicNoteCount(snapshot().trash_items, topic.topic_id);

    if (renamingTopicID() === topic.topic_id) {
      cancelTopicRename();
    }

    try {
      invalidateTopicOperationGuards(topic.topic_id);
      const deleted = await options.controller.deleteTopic(topic.topic_id);
      if (deleted === false) {
        notifications.info('Keep one topic', 'At least one topic needs to remain available.');
        return;
      }

      if (noteCount > 0) {
        openTrash();
        notifications.success('Topic deleted', 'Live notes moved into trash for this topic.');
        return;
      }

      notifications.success('Topic deleted', 'The empty topic was removed.');
    } catch (error) {
      notifications.error('Delete failed', errorMessage(error));
    }
  };

  const handleCommitMove = async (noteID: string, position: { x: number; y: number }) => {
    const token = issuePendingMoveToken(noteID);
    seedTransientMoveProjection(noteID, position);
    try {
      await options.controller.updateNote(noteID, {
        x: position.x,
        y: position.y,
      });
    } catch (error) {
      if (!isCurrentMoveToken(noteID, token)) return;
      clearPendingMoveToken(noteID);
      clearTransientMoveProjection(noteID);
      if (!hasLiveNote(noteID)) return;
      notifications.error('Move failed', errorMessage(error));
      return;
    }

    if (isCurrentMoveToken(noteID, token)) {
      clearPendingMoveToken(noteID);
    }
  };

  const contextMenuItems = createMemo<NotesContextMenuItem[]>(() => {
    const menu = contextMenu();
    if (!menu) return [];

    const items: NotesContextMenuItem[] = [
      {
        id: 'paste',
        kind: 'action',
        label: 'Paste here',
        icon: Paste,
        onSelect: () => {
          const current = contextMenu();
          if (!current) return;
          setContextMenu(null);
          void pasteNoteAt(current);
        },
      },
      {
        id: 'new',
        kind: 'action',
        label: 'New note',
        icon: Plus,
        onSelect: () => {
          const current = contextMenu();
          if (!current) return;
          setContextMenu(null);
          void createNewNoteAt(current);
        },
      },
    ];

    if (menu.noteID) {
      items.push({ id: 'separator-delete', kind: 'separator' });
      items.push({
        id: 'delete',
        kind: 'action',
        label: 'Delete',
        icon: Trash,
        destructive: true,
        onSelect: () => {
          const current = contextMenu();
          if (!current?.noteID) return;
          setContextMenu(null);
          void handleMoveToTrash(current.noteID);
        },
      });
    }

    return items;
  });

  const contextMenuPosition = createMemo(() => {
    const menu = contextMenu();
    if (!menu) return undefined;

    const actionCount = contextMenuItems().filter((item) => item.kind === 'action').length;
    const separatorCount = contextMenuItems().filter((item) => item.kind === 'separator').length;
    return createContextMenuPosition({
      clientX: menu.clientX,
      clientY: menu.clientY,
      menuWidth: NOTES_CONTEXT_MENU_WIDTH_PX,
      menuHeight: estimateNotesContextMenuHeight(actionCount, separatorCount),
    });
  });

  const openCanvasContextMenu = (event: {
    clientX: number;
    clientY: number;
    worldX: number;
    worldY: number;
  }) => {
    const topic = activeTopic();
    if (!topic) return;
    setContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      worldX: event.worldX,
      worldY: event.worldY,
      topicID: topic.topic_id,
    });
  };

  const openNoteContextMenu = (event: MouseEvent, item: NotesItem) => {
    commitFront(item.note_id);
    openContextMenuAtClientPoint(event.clientX, event.clientY, {
      topicID: item.topic_id,
      noteID: item.note_id,
    });
  };

  const openTrashBackdropContextMenu = (event: MouseEvent) => {
    closeTrash();
    openContextMenuAtClientPoint(event.clientX, event.clientY);
  };

  const retargetOpenContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    retargetContextMenuAtClientPoint(event.clientX, event.clientY);
  };

  createEffect(() => {
    const nextLiveNoteIDs = new Set(snapshot().items.map((item) => item.note_id));
    for (const noteID of previousLiveNoteIDs) {
      if (nextLiveNoteIDs.has(noteID)) continue;
      reconcileRemovedLiveNote(noteID);
    }
    previousLiveNoteIDs = nextLiveNoteIDs;
  });

  createEffect(() => {
    const menu = contextMenu();
    if (!menu?.noteID) return;
    if (hasLiveNote(menu.noteID)) return;
    setContextMenu(null);
  });

  createEffect(() => {
    if (!options.open) {
      previousLiveNoteIDs = new Set();
    }
  });

  const handleMobileCreateNote = async () => {
    const placement = getViewportCenterPlacement();
    if (!placement) return;
    closeOverview();
    await createNewNoteAt(placement);
  };

  const handleMobilePaste = async () => {
    const placement = getViewportCenterPlacement();
    if (!placement) return;
    closeOverview();
    await pasteNoteAt(placement);
  };

  createEffect(() => {
    if (!options.open) {
      resetTransientLayers();
      cancelTopicRename();
      setViewportPreview(null);
      setOptimisticFrontNoteID(null);
      setCopiedNoteID(null);
    }
  });

  createEffect(() => {
    const resolved = resolvedActiveTopicID();
    if (!resolved) return;
    if (options.controller.activeTopicID() === resolved) return;
    selectTopic(resolved);
  });

  createEffect(() => {
    const note = editingNote();
    if (!note) {
      editorSeededForNoteID = null;
      return;
    }
    if (editorSeededForNoteID === note.note_id) return;

    editorSeededForNoteID = note.note_id;
    setDraftTitle(note.title);
    setDraftBody(note.body);
    setDraftColor(note.color_token);
  });

  createEffect(() => {
    const frontNoteID = optimisticFrontNoteID();
    if (!frontNoteID) return;

    const note = snapshot().items.find((item) => item.note_id === frontNoteID);
    if (!note) {
      setOptimisticFrontNoteID(null);
      return;
    }

    const highest = snapshot().items.reduce(
      (maxLayer, item) => Math.max(maxLayer, item.z_index),
      0
    );
    if (note.z_index >= highest) {
      setOptimisticFrontNoteID(null);
    }
  });

  createEffect(() => {
    if (options.open) return;
    clearCopiedState();
    clearPendingDigitState();
    setCopiedNoteID(null);
  });

  createEffect(() => {
    if (!pendingDigitSequence()) return;
    if (digitShortcutsBlocked()) {
      clearPendingDigitState();
    }
  });

  createEffect(() => {
    const sequence = pendingDigitSequence();
    if (!sequence) return;

    if (resolveNotesDigitSequence(sequence, numberedActiveItems()).kind === 'invalid') {
      clearPendingDigitState();
    }
  });

  createEffect(() => {
    const liveItems = snapshot().items;
    const projections = transientMoveProjections();
    if (projections.size === 0) return;

    let next: Map<string, { x: number; y: number }> | null = null;

    for (const [noteID, projected] of projections) {
      const item = liveItems.find((entry) => entry.note_id === noteID);
      if (!item || samePoint({ x: item.x, y: item.y }, projected)) {
        next ??= new Map(projections);
        next.delete(noteID);
      }
    }

    if (next) {
      setTransientMoveProjections(next);
    }
  });

  createEffect(() => {
    if (!options.open) return;

    const syncLayoutMode = () => {
      setIsMobile(window.innerWidth < NOTES_MOBILE_BREAKPOINT_PX);
    };

    syncLayoutMode();
    window.addEventListener('resize', syncLayoutMode);
    onCleanup(() => window.removeEventListener('resize', syncLayoutMode));
  });

  createEffect(() => {
    const frame = canvasFrameRef();
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
    if (!options.open) return;
    const timer = window.setInterval(() => setClock(Date.now()), 60 * 1000);
    onCleanup(() => window.clearInterval(timer));
  });

  createEffect(() => {
    if (resolvedActiveTopicID()) {
      setContextMenu(null);
    }
  });

  onCleanup(() => {
    clearCopiedState();
    clearPendingDigitState();
    clearOverviewNavigation(false);
  });

  return {
    header: {
      topicCount: headerTopicCount,
      totalLiveNotes,
      trashCount,
    },
    rail: {
      topics,
      activeTopicID: resolvedActiveTopicID,
      draftTopicTitle,
      renamingTopicID,
      renamingTopicTitle,
      getLiveNoteCount,
      setDraftTopicTitle,
      submitTopic,
      selectTopic,
      startTopicRename,
      setRenamingTopicTitle,
      saveTopicRename,
      cancelTopicRename,
      deleteTopic: handleDeleteTopic,
    },
    board: {
      activeTopic,
      activeTopicLabel,
      activeItems,
      activeTopicID: resolvedActiveTopicID,
      topics,
      topZIndex: topActiveLayer,
      viewport: effectiveViewport,
      boardScaleLabel,
      isMobile,
      overviewOpen,
      optimisticFrontNoteID,
      copiedNoteID,
      noteNumberByID,
      pendingShortcutNoteID,
      setCanvasFrameRef,
      commitViewport,
      openCanvasContextMenu,
      zoomOut: () => adjustViewportScale('out'),
      zoomIn: () => adjustViewportScale('in'),
      openOverview,
      selectTopic,
      mobileCreateNote: handleMobileCreateNote,
      mobilePaste: handleMobilePaste,
      seedMoveProjection: seedTransientMoveProjection,
      copyNote: handleCopyNote,
      openNoteContextMenu,
      openEditor,
      moveToTrash: handleMoveToTrash,
      startOptimisticFront,
      commitFront,
      commitMove: handleCommitMove,
    },
    overview: {
      items: overviewItems,
      viewportStyle: overviewViewportStyle,
      navigationState: overviewNavigationState,
      beginNavigation: beginOverviewNavigation,
      close: closeOverview,
      open: openOverview,
    },
    trash: {
      open: trashOpen,
      groups: trashGroups,
      count: trashCount,
      now: clock,
      canDeleteNow: Boolean(options.controller.deleteTrashedNotePermanently),
      close: closeTrash,
      openDock: openTrash,
      backdropContextMenu: openTrashBackdropContextMenu,
      restore: handleRestoreNote,
      deleteNow: handleDeleteNow,
      clearTopic: handleClearTopicTrash,
    },
    contextMenu: {
      state: contextMenu,
      items: contextMenuItems,
      position: contextMenuPosition,
      close: () => setContextMenu(null),
      retarget: retargetOpenContextMenu,
    },
    editor: {
      note: editingNote,
      draftTitle,
      draftBody,
      draftColor,
      setDraftTitle,
      setDraftBody,
      setDraftColor,
      close: closeEditor,
      save: saveEditor,
    },
    manualPaste: {
      open: () => Boolean(manualPasteTarget()),
      text: manualPasteText,
      setText: setManualPasteText,
      close: closeManualPaste,
      confirm: confirmManualPaste,
    },
    shortcuts: {
      blocked: digitShortcutsBlocked,
      handleDigitShortcut,
      clearPendingDigitState,
    },
    handleCloseRequest,
  };
}
