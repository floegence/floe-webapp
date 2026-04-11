import { For, Show } from 'solid-js';
import { Layers, Minus, Paste, Plus } from '../../icons';
import { InfiniteCanvas, type InfiniteCanvasContextMenuEvent } from '../../ui';
import { NotesAnimalIcon } from './notesAppearance';
import { NotesBoardNote } from './NotesBoardNote';
import { topicAccentClass } from './notesOverlayHelpers';
import type { NotesItem, NotesTopic, NotesViewport } from './types';

export interface NotesBoardProps {
  activeTopic: NotesTopic | undefined;
  activeTopicLabel: string;
  activeItems: readonly NotesItem[];
  activeTopicID: string;
  topics: readonly NotesTopic[];
  topZIndex: number;
  viewport: NotesViewport;
  boardScaleLabel: string;
  isMobile: boolean;
  overviewOpen: boolean;
  optimisticFrontNoteID: string | null;
  copiedNoteID: string | null;
  noteNumberByID: ReadonlyMap<string, string>;
  pendingShortcutNoteID: string | null;
  setCanvasFrameRef: (el: HTMLDivElement | undefined) => void;
  onViewportCommit: (viewport: NotesViewport) => void;
  onCanvasContextMenu: (event: InfiniteCanvasContextMenuEvent) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onOpenOverview: () => void;
  onSelectTopic: (topicID: string) => void;
  onMobileCreateNote: () => void;
  onMobilePaste: () => void;
  onSeedMoveProjection: (noteID: string, position: { x: number; y: number }) => void;
  onCopyNote: (item: NotesItem) => void;
  onOpenNoteContextMenu: (event: MouseEvent, item: NotesItem) => void;
  onOpenEditor: (noteID: string) => void;
  onMoveToTrash: (noteID: string) => void;
  onStartOptimisticFront: (noteID: string) => void;
  onCommitFront: (noteID: string) => void;
  onCommitMove: (noteID: string, position: { x: number; y: number }) => Promise<void> | void;
}

export function NotesBoard(props: NotesBoardProps) {
  return (
    <section class="notes-page notes-overlay__board">
      <div class="notes-overlay__board-head" data-floe-canvas-interactive="true">
        <div class="notes-overlay__board-topic">
          <Show when={props.activeTopic}>
            {(topic) => {
              const accentClass = topicAccentClass(topic().icon_accent);
              return (
                <>
                  <div class={`notes-topic-mark notes-topic-mark--board ${accentClass}`}>
                    <NotesAnimalIcon iconKey={topic().icon_key} class="notes-topic-mark__icon" />
                  </div>
                  <div class="notes-overlay__board-topic-copy">
                    <div class="notes-page__eyebrow">Active Topic</div>
                    <div class="notes-overlay__board-title">{topic().name}</div>
                    <div class="notes-overlay__board-meta">
                      {props.activeItems.length} live note{props.activeItems.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </>
              );
            }}
          </Show>
        </div>

        <div class="notes-overlay__board-actions">
          <button
            type="button"
            class="notes-overlay__hud-button"
            aria-label="Zoom out"
            onClick={() => props.onZoomOut()}
          >
            <Minus class="w-3.5 h-3.5" />
          </button>
          <div class="notes-overlay__hud-scale">{props.boardScaleLabel}</div>
          <button
            type="button"
            class="notes-overlay__hud-button"
            aria-label="Zoom in"
            onClick={() => props.onZoomIn()}
          >
            <Plus class="w-3.5 h-3.5" />
          </button>
          <Show when={props.isMobile}>
            <button
              type="button"
              class="notes-overlay__hud-button"
              aria-label="Open overview map"
              onClick={() => props.onOpenOverview()}
            >
              <Layers class="w-3.5 h-3.5" />
            </button>
          </Show>
        </div>
      </div>

      <Show when={props.isMobile}>
        <div class="notes-page__mobile-toolbar">
          <div class="notes-page__mobile-topics">
            <For each={props.topics}>
              {(topic) => (
                <button
                  type="button"
                  class="notes-page__mobile-topic"
                  classList={{ 'is-active': topic.topic_id === props.activeTopicID }}
                  onClick={() => props.onSelectTopic(topic.topic_id)}
                >
                  {topic.name}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      <div class="notes-page__canvas" data-floe-notes-digit-browse="true" ref={props.setCanvasFrameRef}>
        <InfiniteCanvas
          ariaLabel={`Canvas for ${props.activeTopicLabel}`}
          class="notes-canvas"
          viewport={props.viewport}
          onViewportChange={props.onViewportCommit}
          onCanvasContextMenu={props.onCanvasContextMenu}
        >
          <div class="notes-canvas__field">
            <For each={props.activeItems}>
              {(item) => (
                <NotesBoardNote
                  item={item}
                  copied={props.copiedNoteID === item.note_id}
                  numberLabel={props.noteNumberByID.get(item.note_id) ?? null}
                  optimisticFront={props.optimisticFrontNoteID === item.note_id}
                  shortcutPending={props.pendingShortcutNoteID === item.note_id}
                  topZIndex={props.topZIndex}
                  viewportScale={props.viewport.scale}
                  onSeedMoveProjection={props.onSeedMoveProjection}
                  onCopy={props.onCopyNote}
                  onOpenContextMenu={props.onOpenNoteContextMenu}
                  onOpenEditor={props.onOpenEditor}
                  onMoveToTrash={props.onMoveToTrash}
                  onStartOptimisticFront={props.onStartOptimisticFront}
                  onCommitFront={props.onCommitFront}
                  onCommitMove={props.onCommitMove}
                />
              )}
            </For>
          </div>
        </InfiniteCanvas>
      </div>

      <Show when={props.isMobile && !props.overviewOpen}>
        <div class="notes-mobile-dock" data-floe-canvas-interactive="true">
          <button
            type="button"
            class="notes-mobile-dock__action"
            aria-label="Create note at canvas center"
            onClick={() => props.onMobileCreateNote()}
          >
            <Plus class="w-4 h-4" />
            <span>New</span>
          </button>
          <button
            type="button"
            class="notes-mobile-dock__action"
            aria-label="Paste note at canvas center"
            onClick={() => props.onMobilePaste()}
          >
            <Paste class="w-4 h-4" />
            <span>Paste</span>
          </button>
          <button
            type="button"
            class="notes-mobile-dock__action is-emphasis"
            aria-label="Open overview map"
            onClick={() => props.onOpenOverview()}
          >
            <Layers class="w-4 h-4" />
            <span>Map</span>
          </button>
        </div>
      </Show>
    </section>
  );
}
