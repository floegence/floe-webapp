import { For, Show } from 'solid-js';
import { X } from '../../icons';
import { Button, Textarea } from '../../ui';
import { NOTE_COLOR_LABELS } from './notesAppearance';
import { noteColorClass } from './notesOverlayHelpers';
import { NOTE_COLOR_TOKENS, type NoteColorToken, type NotesItem } from './types';

export interface NotesEditorFlyoutProps {
  note: NotesItem | undefined;
  draftBody: string;
  draftColor: NoteColorToken;
  onDraftBodyChange: (value: string) => void;
  onDraftColorChange: (value: NoteColorToken) => void;
  onClose: () => void;
  onSave: () => void;
}

export function NotesEditorFlyout(props: NotesEditorFlyoutProps) {
  return (
    <div class="notes-flyout notes-flyout--editor" onPointerDown={(event) => event.stopPropagation()}>
      <div class="notes-flyout__header">
        <div>
          <div class="notes-editor__label">Edit note</div>
          <div class="notes-flyout__title">
            {props.note?.body.trim() ? 'Refine note' : 'Compose note'}
          </div>
        </div>
        <button
          type="button"
          class="notes-flyout__close"
          aria-label="Close editor"
          onClick={() => props.onClose()}
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="notes-editor">
        <div class="notes-editor__palette">
          <div class="notes-editor__label">Color</div>
          <div class="notes-editor__swatches">
            <For each={NOTE_COLOR_TOKENS}>
              {(token) => (
                <button
                  type="button"
                  class={`notes-editor__swatch ${noteColorClass(token)}`}
                  classList={{ 'is-active': props.draftColor === token }}
                  onClick={() => props.onDraftColorChange(token)}
                >
                  <span>{NOTE_COLOR_LABELS[token]}</span>
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="notes-editor__field">
          <div class="notes-editor__label">Text</div>
          <Textarea
            data-floe-autofocus
            rows={10}
            value={props.draftBody}
            onInput={(event) => props.onDraftBodyChange(event.currentTarget.value)}
            placeholder="Type or paste anything worth keeping..."
          />
        </div>
      </div>

      <div class="notes-flyout__footer">
        <Button variant="ghost" onClick={props.onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={props.onSave}>
          Save
        </Button>
      </div>
    </div>
  );
}

export interface NotesManualPasteFlyoutProps {
  open: boolean;
  text: string;
  onTextChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function NotesManualPasteFlyout(props: NotesManualPasteFlyoutProps) {
  return (
    <Show when={props.open}>
      <div class="notes-flyout notes-flyout--paste" onPointerDown={(event) => event.stopPropagation()}>
        <div class="notes-flyout__header">
          <div>
            <div class="notes-editor__label">Manual paste</div>
            <div class="notes-flyout__title">Clipboard access was unavailable</div>
          </div>
          <button
            type="button"
            class="notes-flyout__close"
            aria-label="Close paste panel"
            onClick={() => props.onClose()}
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="notes-flyout__body">
          <Textarea
            data-floe-autofocus
            rows={12}
            value={props.text}
            onInput={(event) => props.onTextChange(event.currentTarget.value)}
            placeholder="Paste clipboard text here..."
          />
        </div>

        <div class="notes-flyout__footer">
          <Button variant="ghost" onClick={props.onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!props.text.trim()} onClick={props.onConfirm}>
            Create note
          </Button>
        </div>
      </div>
    </Show>
  );
}
