import { createEffect, createMemo, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Motion } from 'solid-motionone';
import { duration, easing } from '../../utils/animations';
import { useOverlayMask } from '../../hooks/useOverlayMask';
import { X } from '../../icons';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';
import { NotesBoard } from './NotesBoard';
import { NotesContextMenu } from './NotesContextMenu';
import { NotesEditorFlyout, NotesManualPasteFlyout } from './NotesEditorFlyout';
import { NotesOverviewPanel } from './NotesOverviewPanel';
import { NotesTopicRail } from './NotesTopicRail';
import { NotesTrashFlyout } from './NotesTrashFlyout';
import { NotesTrashCanIcon } from './notesAppearance';
import type { NotesController } from './types';
import { useNotesOverlayModel } from './useNotesOverlayModel';

export type NotesOverlayInteractionMode = 'modal' | 'floating';

export interface NotesOverlayProps {
  open: boolean;
  onClose: () => void;
  controller: NotesController;
  interactionMode?: NotesOverlayInteractionMode;
  /** Additional shell-owned keybinds that should continue working while floating Notes is focused. */
  allowGlobalHotkeys?: readonly string[];
}

interface ResolvedNotesOverlayInteraction {
  mode: NotesOverlayInteractionMode;
  ariaModal: true | undefined;
  lockBodyScroll: boolean;
  trapFocus: boolean;
  closeOnEscape: boolean | 'inside';
  blockWheel: 'outside' | 'none';
  blockTouchMove: 'outside' | 'none';
  autoFocus: false | { selector: string };
}

const NOTES_BOUNDARY_SELECTOR = '[data-floe-notes-boundary="true"]';
const NOTES_TYPING_TARGET_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]';

function resolveBoundaryElement(target: EventTarget | null): Element | null {
  if (typeof Element !== 'undefined' && target instanceof Element) {
    return target;
  }
  if (typeof Node !== 'undefined' && target instanceof Node) {
    return target.parentElement;
  }
  return null;
}

function isWithinNotesBoundary(target: EventTarget | null): boolean {
  return Boolean(resolveBoundaryElement(target)?.closest(NOTES_BOUNDARY_SELECTOR));
}

function isTypingTarget(target: EventTarget | null): boolean {
  return Boolean(resolveBoundaryElement(target)?.closest(NOTES_TYPING_TARGET_SELECTOR));
}

function isModifierOnlyKey(event: KeyboardEvent): boolean {
  return (
    event.key === 'Shift' || event.key === 'Meta' || event.key === 'Alt' || event.key === 'Control'
  );
}

function resolveDigitKey(event: KeyboardEvent): string | null {
  return /^\d$/.test(event.key) ? event.key : null;
}

function resolveNotesOverlayInteraction(
  mode: NotesOverlayInteractionMode | undefined
): ResolvedNotesOverlayInteraction {
  if (mode === 'floating') {
    return {
      mode,
      ariaModal: undefined,
      lockBodyScroll: false,
      trapFocus: false,
      closeOnEscape: 'inside',
      blockWheel: 'none',
      blockTouchMove: 'none',
      autoFocus: false,
    };
  }

  return {
    mode: 'modal',
    ariaModal: true,
    lockBodyScroll: true,
    trapFocus: true,
    closeOnEscape: true,
    blockWheel: 'outside',
    blockTouchMove: 'outside',
    autoFocus: { selector: '[data-floe-overlay-close="true"]' },
  };
}

export function NotesOverlay(props: NotesOverlayProps) {
  const floe = useResolvedFloeConfig();
  const model = useNotesOverlayModel(props);
  let rootRef: HTMLElement | undefined;
  const interaction = () => resolveNotesOverlayInteraction(props.interactionMode);
  const requestOverlayClose = () => props.onClose();
  const allowedFloatingHotkeys = createMemo<readonly string[]>(() => {
    if (interaction().mode !== 'floating') {
      return [];
    }

    const allowedHotkeys = new Set<string>();
    if (floe.config.commands.palette.enabled) {
      const paletteKeybind = floe.config.commands.palette.keybind.trim();
      if (paletteKeybind) {
        allowedHotkeys.add(paletteKeybind);
      }
    }

    for (const keybind of props.allowGlobalHotkeys ?? []) {
      const normalizedKeybind = keybind.trim();
      if (!normalizedKeybind) continue;
      allowedHotkeys.add(normalizedKeybind);
    }

    return Array.from(allowedHotkeys);
  });

  createEffect(() => {
    if (!props.open) return;
    if (interaction().mode !== 'floating') return;
    if (typeof document === 'undefined') return;

    const handleOutsideClickCapture = (event: MouseEvent) => {
      if (isWithinNotesBoundary(event.target)) return;
      queueMicrotask(requestOverlayClose);
    };

    document.addEventListener('click', handleOutsideClickCapture, true);
    onCleanup(() => document.removeEventListener('click', handleOutsideClickCapture, true));
  });

  useOverlayMask({
    open: () => props.open,
    root: () => rootRef,
    onClose: () => model.handleCloseRequest(),
    onEscapeOutside: interaction().mode === 'floating' ? requestOverlayClose : undefined,
    containsTarget: isWithinNotesBoundary,
    lockBodyScroll: interaction().lockBodyScroll,
    trapFocus: interaction().trapFocus,
    closeOnEscape: interaction().closeOnEscape,
    blockHotkeys: true,
    allowHotkeys: allowedFloatingHotkeys,
    blockWheel: interaction().blockWheel,
    blockTouchMove: interaction().blockTouchMove,
    autoFocus: interaction().autoFocus,
    restoreFocus: true,
  });

  createEffect(() => {
    if (props.open) return;
    model.shortcuts.clearPendingDigitState();
  });

  createEffect(() => {
    if (!props.open) return;
    if (typeof document === 'undefined') return;

    const handleKeyDownCapture = (event: KeyboardEvent) => {
      const digit = resolveDigitKey(event);
      if (!digit) {
        if (!isModifierOnlyKey(event)) {
          model.shortcuts.clearPendingDigitState();
        }
        return;
      }

      const activeElement = document.activeElement;
      const shouldHandle =
        !event.defaultPrevented &&
        !event.repeat &&
        !event.isComposing &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !model.shortcuts.blocked() &&
        !isTypingTarget(event.target) &&
        !isTypingTarget(activeElement);

      if (!shouldHandle) {
        model.shortcuts.clearPendingDigitState();
        return;
      }

      event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      } else {
        event.stopPropagation();
      }
      model.shortcuts.handleDigitShortcut(digit);
    };

    document.addEventListener('keydown', handleKeyDownCapture, true);

    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDownCapture, true);
    });
  });

  return (
    <Show when={props.open}>
      <Motion.section
        ref={rootRef}
        class="notes-overlay"
        role="dialog"
        aria-modal={interaction().ariaModal}
        aria-label="Notes overlay"
        data-notes-interaction-mode={interaction().mode}
        tabIndex={-1}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: duration.fast }}
      >
        <Motion.div
          class="notes-overlay__frame"
          data-floe-notes-boundary="true"
          initial={{ opacity: 0, y: 18, scale: 0.986 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: duration.normal, easing: easing.easeOut }}
        >
          <header class="notes-overlay__header" data-floe-canvas-interactive="true">
            <div class="notes-overlay__header-brand">
              <div class="notes-overlay__header-title">Notes</div>
              <div class="notes-overlay__header-separator" />
              <div class="notes-overlay__header-stat">{model.header.topicCount()} topics</div>
              <div class="notes-overlay__header-stat">
                {model.header.totalLiveNotes()} live note
                {model.header.totalLiveNotes() === 1 ? '' : 's'}
              </div>
              <div class="notes-overlay__header-stat">{model.header.trashCount()} trash</div>
            </div>

            <div class="notes-overlay__header-actions">
              <button
                type="button"
                class="notes-overlay__close"
                aria-label="Close notes overlay"
                data-floe-overlay-close="true"
                onClick={() => model.handleCloseRequest()}
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </header>

          <div class="notes-overlay__body">
            <NotesTopicRail
              topics={model.rail.topics()}
              activeTopicID={model.rail.activeTopicID()}
              draftTopicTitle={model.rail.draftTopicTitle()}
              renamingTopicID={model.rail.renamingTopicID()}
              renamingTopicTitle={model.rail.renamingTopicTitle()}
              getLiveNoteCount={model.rail.getLiveNoteCount}
              onDraftTopicTitleChange={model.rail.setDraftTopicTitle}
              onSubmitTopic={() => void model.rail.submitTopic()}
              onSelectTopic={model.rail.selectTopic}
              onStartRename={model.rail.startTopicRename}
              onRenamingTopicTitleChange={model.rail.setRenamingTopicTitle}
              onSaveRename={() => void model.rail.saveTopicRename()}
              onCancelRename={model.rail.cancelTopicRename}
              onDeleteTopic={(topic) => void model.rail.deleteTopic(topic)}
            />

            <NotesBoard
              activeTopic={model.board.activeTopic()}
              activeTopicLabel={model.board.activeTopicLabel()}
              activeItems={model.board.activeItems()}
              activeTopicID={model.board.activeTopicID()}
              topics={model.board.topics()}
              topZIndex={model.board.topZIndex()}
              viewport={model.board.viewport()}
              boardScaleLabel={model.board.boardScaleLabel()}
              isMobile={model.board.isMobile()}
              overviewOpen={model.board.overviewOpen()}
              optimisticFrontNoteID={model.board.optimisticFrontNoteID()}
              copiedNoteID={model.board.copiedNoteID()}
              noteNumberByID={model.board.noteNumberByID()}
              pendingShortcutNoteID={model.board.pendingShortcutNoteID()}
              setCanvasFrameRef={model.board.setCanvasFrameRef}
              onViewportCommit={model.board.commitViewport}
              onCanvasContextMenu={model.board.openCanvasContextMenu}
              onZoomOut={model.board.zoomOut}
              onZoomIn={model.board.zoomIn}
              onOpenOverview={model.board.openOverview}
              onSelectTopic={model.board.selectTopic}
              onMobileCreateNote={() => void model.board.mobileCreateNote()}
              onMobilePaste={() => void model.board.mobilePaste()}
              onSeedMoveProjection={model.board.seedMoveProjection}
              onCopyNote={(item) => void model.board.copyNote(item)}
              onOpenNoteContextMenu={model.board.openNoteContextMenu}
              onOpenEditor={model.board.openEditor}
              onMoveToTrash={(noteID) => void model.board.moveToTrash(noteID)}
              onStartOptimisticFront={model.board.startOptimisticFront}
              onCommitFront={model.board.commitFront}
              onCommitMove={model.board.commitMove}
            />

            <Show when={!model.board.isMobile()}>
              <NotesOverviewPanel
                mode="desktop"
                items={model.overview.items()}
                boardScaleLabel={model.board.boardScaleLabel()}
                viewportStyle={model.overview.viewportStyle()}
                navigationState={model.overview.navigationState()}
                onPointerDown={model.overview.beginNavigation}
                onZoomOut={model.board.zoomOut}
                onZoomIn={model.board.zoomIn}
              />
            </Show>

            <div
              class="notes-trash"
              classList={{ 'is-open': model.trash.open() }}
              data-floe-canvas-interactive="true"
            >
              <Show when={!model.trash.open()}>
                <button
                  type="button"
                  class="notes-trash__toggle"
                  aria-label={`Open trash dock${
                    model.trash.count() > 0 ? `, ${model.trash.count()} items` : ''
                  }`}
                  onClick={model.trash.openDock}
                >
                  <div class="notes-trash__toggle-mark">
                    <NotesTrashCanIcon class="notes-trash__toggle-icon" />
                  </div>
                </button>
              </Show>
            </div>
          </div>
        </Motion.div>

        <Show when={model.board.isMobile() && model.board.overviewOpen()}>
          <Portal>
            <div
              class="notes-overview-backdrop"
              data-floe-notes-boundary="true"
              onClick={model.overview.close}
            />
            <div class="notes-overview-flyout" data-floe-notes-boundary="true">
              <NotesOverviewPanel
                mode="mobile"
                items={model.overview.items()}
                boardScaleLabel={model.board.boardScaleLabel()}
                viewportStyle={model.overview.viewportStyle()}
                navigationState={model.overview.navigationState()}
                onPointerDown={model.overview.beginNavigation}
                onZoomOut={model.board.zoomOut}
                onZoomIn={model.board.zoomIn}
                onClose={model.overview.close}
              />
            </div>
          </Portal>
        </Show>

        <Portal>
          <NotesTrashFlyout
            open={model.trash.open()}
            groups={model.trash.groups()}
            now={model.trash.now()}
            canDeleteNow={model.trash.canDeleteNow}
            onClose={model.trash.close}
            onBackdropContextMenu={model.trash.backdropContextMenu}
            onRestore={(noteID) => void model.trash.restore(noteID)}
            onDeleteNow={(noteID) => void model.trash.deleteNow(noteID)}
            onClearTopicTrash={(topicID) => void model.trash.clearTopic(topicID)}
          />
        </Portal>

        <Show when={model.contextMenu.state()}>
          <Portal>
            <div
              class="notes-menu-backdrop"
              data-floe-notes-boundary="true"
              onClick={model.contextMenu.close}
              onContextMenu={model.contextMenu.retarget}
            />
            <NotesContextMenu
              x={model.contextMenu.position()?.left ?? 0}
              y={model.contextMenu.position()?.top ?? 0}
              items={model.contextMenu.items()}
            />
          </Portal>
        </Show>

        <Show when={Boolean(model.editor.note())}>
          <Portal>
            <NotesEditorFlyout
              note={model.editor.note()}
              draftTitle={model.editor.draftTitle()}
              draftBody={model.editor.draftBody()}
              draftColor={model.editor.draftColor()}
              onDraftTitleChange={model.editor.setDraftTitle}
              onDraftBodyChange={model.editor.setDraftBody}
              onDraftColorChange={model.editor.setDraftColor}
              onClose={model.editor.close}
              onSave={() => void model.editor.save()}
            />
          </Portal>
        </Show>

        <Portal>
          <NotesManualPasteFlyout
            open={model.manualPaste.open()}
            text={model.manualPaste.text()}
            onTextChange={model.manualPaste.setText}
            onClose={model.manualPaste.close}
            onConfirm={() => void model.manualPaste.confirm()}
          />
        </Portal>
      </Motion.section>
    </Show>
  );
}
