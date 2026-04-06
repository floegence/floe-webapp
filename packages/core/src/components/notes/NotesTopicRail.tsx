import { For, Show } from 'solid-js';
import { Check, Pencil, Plus, Trash, X } from '../../icons';
import { Input } from '../../ui';
import { NotesAnimalIcon } from './notesAppearance';
import { topicAccentClass } from './notesOverlayHelpers';
import type { NotesTopic } from './types';

export interface NotesTopicRailProps {
  topics: readonly NotesTopic[];
  activeTopicID: string;
  draftTopicTitle: string;
  renamingTopicID: string | null;
  renamingTopicTitle: string;
  getLiveNoteCount: (topicID: string) => number;
  onDraftTopicTitleChange: (value: string) => void;
  onSubmitTopic: () => void;
  onSelectTopic: (topicID: string) => void;
  onStartRename: (topic: NotesTopic) => void;
  onRenamingTopicTitleChange: (value: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDeleteTopic: (topic: NotesTopic) => void;
}

export function NotesTopicRail(props: NotesTopicRailProps) {
  return (
    <aside class="notes-overlay__rail" data-floe-canvas-interactive="true">
      <section class="notes-overlay__rail-header">
        <div class="notes-overlay__rail-heading">Topics</div>
        <div class="notes-overlay__rail-total">{props.topics.length}</div>
      </section>

      <form
        class="notes-topic-composer notes-overlay__topic-composer"
        data-floe-canvas-interactive="true"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmitTopic();
        }}
      >
        <Input
          size="sm"
          value={props.draftTopicTitle}
          onInput={(event) => props.onDraftTopicTitleChange(event.currentTarget.value)}
          placeholder="Add topic"
        />
        <button type="submit" class="notes-topic-composer__button" aria-label="Add topic">
          <Plus class="w-3.5 h-3.5" />
        </button>
      </form>

      <div class="notes-topic-list" data-floe-canvas-interactive="true">
        <For each={props.topics}>
          {(topic) => {
            const liveCount = () => props.getLiveNoteCount(topic.topic_id);
            const accentClass = topicAccentClass(topic.icon_accent);
            return (
              <div
                role="button"
                tabIndex={0}
                class={`notes-topic-row ${accentClass}`}
                classList={{ 'is-active': topic.topic_id === props.activeTopicID }}
                onClick={() => props.onSelectTopic(topic.topic_id)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  props.onSelectTopic(topic.topic_id);
                }}
              >
                <div class={`notes-topic-mark ${accentClass}`}>
                  <NotesAnimalIcon iconKey={topic.icon_key} class="notes-topic-mark__icon" />
                </div>
                <div class="notes-topic-row__copy">
                  <Show
                    when={props.renamingTopicID === topic.topic_id}
                    fallback={
                      <div class="notes-topic-row__title-line">
                        <div class="notes-topic-row__title">{topic.name}</div>
                      </div>
                    }
                  >
                    <form
                      class="notes-topic-row__editor"
                      onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        props.onSaveRename();
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Input
                        size="sm"
                        value={props.renamingTopicTitle}
                        onInput={(event) => props.onRenamingTopicTitleChange(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Escape') return;
                          event.preventDefault();
                          event.stopPropagation();
                          props.onCancelRename();
                        }}
                        placeholder="Topic name"
                      />
                      <button type="submit" class="notes-topic-row__edit-button" aria-label="Save topic name">
                        <Check class="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        class="notes-topic-row__edit-button"
                        aria-label="Cancel topic edit"
                        onClick={(event) => {
                          event.stopPropagation();
                          props.onCancelRename();
                        }}
                      >
                        <X class="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </Show>
                  <div class="notes-topic-row__meta">
                    {liveCount()} live note{liveCount() === 1 ? '' : 's'}
                  </div>
                </div>
                <div class="notes-topic-row__tail">
                  <div class="notes-topic-row__count">{liveCount()}</div>
                  <button
                    type="button"
                    class="notes-topic-row__edit"
                    aria-label={`Edit topic ${topic.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onStartRename(topic);
                    }}
                  >
                    <Pencil class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="notes-topic-row__edit notes-topic-row__delete"
                    aria-label={`Delete topic ${topic.name}`}
                    disabled={props.topics.length <= 1}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onDeleteTopic(topic);
                    }}
                  >
                    <Trash class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </aside>
  );
}

