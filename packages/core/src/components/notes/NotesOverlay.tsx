import { Show } from 'solid-js';
import { Motion } from 'solid-motionone';
import { duration, easing } from '../../utils/animations';
import { useOverlayMask } from '../../hooks/useOverlayMask';
import { X } from '../../icons';
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
}

interface ResolvedNotesOverlayInteraction {
  mode: NotesOverlayInteractionMode;
  ariaModal: true | undefined;
  lockBodyScroll: boolean;
  trapFocus: boolean;
  closeOnEscape: true | 'inside';
  blockWheel: 'outside' | 'none';
  blockTouchMove: 'outside' | 'none';
  autoFocus: false | { selector: string };
}

function resolveNotesOverlayInteraction(
  mode: NotesOverlayInteractionMode | undefined,
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
  const model = useNotesOverlayModel(props);
  let rootRef: HTMLElement | undefined;
  const interaction = () => resolveNotesOverlayInteraction(props.interactionMode);

  useOverlayMask({
    open: () => props.open,
    root: () => rootRef,
    onClose: () => model.handleCloseRequest(),
    lockBodyScroll: interaction().lockBodyScroll,
    trapFocus: interaction().trapFocus,
    closeOnEscape: interaction().closeOnEscape,
    blockHotkeys: true,
    blockWheel: interaction().blockWheel,
    blockTouchMove: interaction().blockTouchMove,
    autoFocus: interaction().autoFocus,
    restoreFocus: true,
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
              setCanvasFrameRef={model.board.setCanvasFrameRef}
              onViewportCommit={model.board.commitViewport}
              onCanvasContextMenu={model.board.openCanvasContextMenu}
              onZoomOut={model.board.zoomOut}
              onZoomIn={model.board.zoomIn}
              onOpenOverview={model.board.openOverview}
              onSelectTopic={model.board.selectTopic}
              onMobileCreateNote={() => void model.board.mobileCreateNote()}
              onMobilePaste={() => void model.board.mobilePaste()}
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
          <div class="notes-overview-backdrop" onClick={model.overview.close} />
          <div class="notes-overview-flyout">
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
        </Show>

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

        <Show when={model.contextMenu.state()}>
          <div class="notes-menu-backdrop" onClick={model.contextMenu.close} />
          <NotesContextMenu
            x={model.contextMenu.position()?.left ?? 0}
            y={model.contextMenu.position()?.top ?? 0}
            items={model.contextMenu.items()}
          />
        </Show>

        <Show when={Boolean(model.editor.note())}>
          <NotesEditorFlyout
            note={model.editor.note()}
            draftBody={model.editor.draftBody()}
            draftColor={model.editor.draftColor()}
            onDraftBodyChange={model.editor.setDraftBody}
            onDraftColorChange={model.editor.setDraftColor}
            onClose={model.editor.close}
            onSave={() => void model.editor.save()}
          />
        </Show>

        <NotesManualPasteFlyout
          open={model.manualPaste.open()}
          text={model.manualPaste.text()}
          onTextChange={model.manualPaste.setText}
          onClose={model.manualPaste.close}
          onConfirm={() => void model.manualPaste.confirm()}
        />
      </Motion.section>
    </Show>
  );
}
