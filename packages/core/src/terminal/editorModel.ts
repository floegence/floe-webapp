import type { TerminalEditorState } from './types';

export function createTerminalEditorState(value = ''): TerminalEditorState {
  return {
    value,
    cursor: value.length,
    historyIndex: null,
    draft: '',
  };
}

export function insertTerminalText(
  state: TerminalEditorState,
  text: string,
): TerminalEditorState {
  if (!text) return state;

  const cursor = clampTerminalCursor(state.cursor, state.value.length);
  const value =
    state.value.slice(0, cursor) + text + state.value.slice(cursor);

  return {
    value,
    cursor: cursor + text.length,
    historyIndex: null,
    draft: '',
  };
}

export function deleteTerminalTextBackward(
  state: TerminalEditorState,
): TerminalEditorState {
  const cursor = clampTerminalCursor(state.cursor, state.value.length);
  if (cursor === 0) return state;

  return {
    value: state.value.slice(0, cursor - 1) + state.value.slice(cursor),
    cursor: cursor - 1,
    historyIndex: null,
    draft: '',
  };
}

export function moveTerminalCursor(
  state: TerminalEditorState,
  direction: 'left' | 'right',
): TerminalEditorState {
  const cursor = clampTerminalCursor(state.cursor, state.value.length);
  const nextCursor =
    direction === 'left'
      ? Math.max(0, cursor - 1)
      : Math.min(state.value.length, cursor + 1);

  if (nextCursor === cursor) return state;

  return {
    ...state,
    cursor: nextCursor,
  };
}

export function navigateTerminalHistory(
  state: TerminalEditorState,
  history: readonly string[],
  direction: 'up' | 'down',
): TerminalEditorState {
  if (!history.length) return state;

  if (direction === 'up') {
    if (state.historyIndex === null) {
      const value = history[history.length - 1] ?? '';
      return {
        value,
        cursor: value.length,
        historyIndex: history.length - 1,
        draft: state.value,
      };
    }

    const nextIndex = Math.max(0, state.historyIndex - 1);
    if (nextIndex === state.historyIndex) return state;

    const value = history[nextIndex] ?? '';
    return {
      ...state,
      value,
      cursor: value.length,
      historyIndex: nextIndex,
    };
  }

  if (state.historyIndex === null) return state;

  const nextIndex = state.historyIndex + 1;
  if (nextIndex >= history.length) {
    return {
      value: state.draft,
      cursor: state.draft.length,
      historyIndex: null,
      draft: '',
    };
  }

  const value = history[nextIndex] ?? '';
  return {
    ...state,
    value,
    cursor: value.length,
    historyIndex: nextIndex,
  };
}

export function clampTerminalCursor(cursor: number, valueLength: number): number {
  return Math.max(0, Math.min(valueLength, cursor));
}
