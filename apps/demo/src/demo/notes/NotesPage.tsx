import type { Component } from 'solid-js';
import { Portal } from 'solid-js/web';
import { NotesOverlay } from '@floegence/floe-webapp-core/notes';
import { useNotesDemoController } from './createNotesDemoController';

interface NotesPageProps {
  onRequestClose: () => void;
}

export const NotesPage: Component<NotesPageProps> = (props) => {
  const controller = useNotesDemoController();

  return (
    <Portal>
      <NotesOverlay open controller={controller} onClose={props.onRequestClose} />
    </Portal>
  );
};
