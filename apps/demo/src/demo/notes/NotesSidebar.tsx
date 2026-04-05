import { For, createSignal, type JSX } from 'solid-js';
import { SidebarContent, SidebarSection } from '@floegence/floe-webapp-core/layout';
import { Input } from '@floegence/floe-webapp-core/ui';
import { Bookmark, Plus, Trash } from '@floegence/floe-webapp-core/icons';
import { useNotesDemo } from './NotesDemoContext';

export function NotesSidebar() {
  const notes = useNotesDemo();
  const [draftTitle, setDraftTitle] = createSignal('');
  const totalLiveNotes = () =>
    notes.topics().reduce((count, topic) => count + notes.getLiveNoteCount(topic.id), 0);

  const submitTopic: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (event) => {
    event.preventDefault();
    const createdId = notes.createTopic(draftTitle());
    setDraftTitle('');
    notes.setActiveTopic(createdId);
  };

  return (
    <SidebarContent class="notes-sidebar-shell">
      <section class="notes-sidebar-hero" data-floe-canvas-interactive="true">
        <div class="notes-sidebar-hero__eyebrow">Infinite Notes</div>
        <h2 class="notes-sidebar-hero__title">
          Quiet topics. Precise fragments. One shared board.
        </h2>
        <p class="notes-sidebar-hero__body">
          Organize by topic in the rail, capture anywhere on the canvas, and recover deleted notes
          from a shared dock for 72 hours.
        </p>
        <div class="notes-sidebar-hero__metrics" aria-label="Notes overview">
          <span>{notes.topics().length} topics</span>
          <span>{totalLiveNotes()} live</span>
          <span>72h recovery</span>
        </div>
      </section>

      <SidebarSection title="Topics">
        <form
          class="notes-topic-composer"
          onSubmit={submitTopic}
          data-floe-canvas-interactive="true"
        >
          <Input
            size="sm"
            value={draftTitle()}
            onInput={(event) => setDraftTitle(event.currentTarget.value)}
            placeholder="Add topic"
          />
          <button type="submit" class="notes-topic-composer__button" aria-label="Add topic">
            <Plus class="w-3.5 h-3.5" />
          </button>
        </form>

        <div class="notes-topic-list" data-floe-canvas-interactive="true">
          <For each={notes.topics()}>
            {(topic) => {
              const liveCount = () => notes.getLiveNoteCount(topic.id);

              return (
                <button
                  type="button"
                  class="notes-topic-row"
                  classList={{ 'is-active': topic.id === notes.activeTopicId() }}
                  onClick={() => notes.setActiveTopic(topic.id)}
                >
                  <div class="notes-topic-row__leading">
                    <Bookmark class="w-3.5 h-3.5" />
                  </div>
                  <div class="notes-topic-row__copy">
                    <div class="notes-topic-row__title">{topic.title}</div>
                    <div class="notes-topic-row__meta">
                      {liveCount()} live note{liveCount() === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div class="notes-topic-row__count">{liveCount()}</div>
                </button>
              );
            }}
          </For>
        </div>
      </SidebarSection>

      <SidebarSection title="Board Rhythm">
        <div class="notes-sidebar-brief" data-floe-canvas-interactive="true">
          <div class="notes-sidebar-brief__label">Navigation</div>
          <div class="notes-sidebar-brief__value">
            Wheel to zoom on desktop. Use the map and drag gestures on mobile.
          </div>
        </div>
        <div class="notes-sidebar-brief" data-floe-canvas-interactive="true">
          <div class="notes-sidebar-brief__label">Capture</div>
          <div class="notes-sidebar-brief__value">
            Right click on desktop, or use the mobile dock to paste and create notes at center.
          </div>
        </div>
        <div class="notes-sidebar-brief" data-floe-canvas-interactive="true">
          <div class="notes-sidebar-brief__label">Trash Dock</div>
          <div class="notes-sidebar-brief__value">
            <Trash class="w-3.5 h-3.5" />
            {notes.trashCount()} items waiting for cleanup
          </div>
        </div>
      </SidebarSection>
    </SidebarContent>
  );
}
