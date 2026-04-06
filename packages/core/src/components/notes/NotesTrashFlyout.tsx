import { For, Show } from 'solid-js';
import { X } from '../../icons';
import { NotesAnimalIcon, NotesTrashCanIcon } from './notesAppearance';
import {
  formatDeletedTimestamp,
  formatRemainingTrashTime,
  getNotePreviewText,
  noteColorClass,
  notePreviewMetrics,
  topicAccentClass,
} from './notesOverlayHelpers';
import type { NotesTrashGroup } from './types';

export interface NotesTrashFlyoutProps {
  open: boolean;
  groups: readonly NotesTrashGroup[];
  now: number;
  canDeleteNow: boolean;
  onClose: () => void;
  onBackdropContextMenu?: (event: MouseEvent) => void;
  onRestore: (noteID: string) => void;
  onDeleteNow: (noteID: string) => void;
  onClearTopicTrash: (topicID: string) => void;
}

export function NotesTrashFlyout(props: NotesTrashFlyoutProps) {
  return (
    <Show when={props.open}>
      <div
        class="notes-trash-backdrop"
        onClick={() => props.onClose()}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          props.onBackdropContextMenu?.(event);
        }}
      />
      <div class="notes-trash__flyout">
        <div
          class="notes-trash__panel"
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <div class="notes-trash__panel-header">
            <div class="notes-trash__panel-title-group">
              <div class="notes-trash__panel-title-row">
                <div class="notes-trash__panel-title">Trash Dock</div>
                <div class="notes-trash__panel-header-actions">
                  <div class="notes-trash__panel-count">{props.groups.reduce((count, group) => count + group.items.length, 0)} items</div>
                  <button
                    type="button"
                    class="notes-trash__panel-close"
                    aria-label="Close trash dock"
                    onClick={() => props.onClose()}
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div class="notes-trash__panel-body">
                Grouped by topic, sorted by latest deletion, and recoverable for 72 hours.
              </div>
            </div>
          </div>

          <Show
            when={props.groups.length > 0}
            fallback={
              <div class="notes-trash__empty">
                <NotesTrashCanIcon class="notes-trash__empty-icon" />
                <div>
                  <strong>Trash is empty</strong>
                  <span>Deleted notes from any topic will appear here.</span>
                </div>
              </div>
            }
          >
            <div class="notes-trash__sections">
              <For each={props.groups}>
                {(group) => {
                  const accentClass = topicAccentClass(group.topic_icon_accent);
                  return (
                    <section class="notes-trash-section">
                      <div class="notes-trash-section__header">
                        <div class="notes-trash-section__title-group">
                          <div class="notes-trash-section__title-line">
                            <div class={`notes-topic-mark notes-topic-mark--trash ${accentClass}`}>
                              <NotesAnimalIcon iconKey={group.topic_icon_key} class="notes-topic-mark__icon" />
                            </div>
                            <div class="notes-trash-section__title">{group.topic_name}</div>
                          </div>
                          <div class="notes-trash-section__meta">
                            {group.items.length} deleted note{group.items.length === 1 ? '' : 's'}
                          </div>
                        </div>
                        <button type="button" class="notes-trash-section__clear" onClick={() => props.onClearTopicTrash(group.topic_id)}>
                          Clear topic trash
                        </button>
                      </div>

                      <div class="notes-trash-section__grid">
                        <For each={group.items}>
                          {(item) => {
                            const metrics = notePreviewMetrics(item);
                            const preview = getNotePreviewText(item.body, metrics.preview_limit);
                            return (
                              <article
                                class={`notes-note notes-trash-note ${noteColorClass(item.color_token)} notes-note--size-${item.size_bucket - 1}`}
                                style={{
                                  '--note-width': `${metrics.width}px`,
                                  '--note-height': `${metrics.height}px`,
                                }}
                              >
                                <div class="notes-note__surface">
                                  <div class="notes-trash-note__meta">
                                    <span>{formatDeletedTimestamp(item.deleted_at_unix_ms)}</span>
                                    <strong>{formatRemainingTrashTime(item.deleted_at_unix_ms, props.now)}</strong>
                                  </div>

                                  <div class="notes-trash-note__body">
                                    <span>{preview}</span>
                                  </div>

                                  <div class="notes-trash-note__actions">
                                    <button type="button" onClick={() => props.onRestore(item.note_id)}>
                                      Restore
                                    </button>
                                    <Show when={props.canDeleteNow}>
                                      <button type="button" class="is-danger" onClick={() => props.onDeleteNow(item.note_id)}>
                                        Delete now
                                      </button>
                                    </Show>
                                  </div>
                                </div>
                              </article>
                            );
                          }}
                        </For>
                      </div>
                    </section>
                  );
                }}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
