import {
  createTerminalEditorState,
  deleteTerminalTextBackward,
  insertTerminalText,
  moveTerminalCursor,
  navigateTerminalHistory,
} from './editorModel';
import {
  applyTerminalSuggestion,
  autocompleteTerminalInput,
  getTerminalSuggestions,
  type TerminalSuggestionEngineOptions,
} from './suggestionEngine';
import type {
  TerminalEditorState,
  TerminalSuggestion,
  TerminalWorkspaceProfile,
} from './types';

export interface TerminalSessionState {
  editor: TerminalEditorState;
  history: string[];
}

export interface TerminalPromptPreview {
  before: string;
  cursor: string;
  after: string;
}

export type TerminalSessionEffect =
  | { type: 'none' }
  | {
      type: 'submit';
      command: string;
    }
  | {
      type: 'interrupt';
      command: string | null;
    }
  | {
      type: 'clear-screen';
    };

export interface TerminalSessionTransition {
  state: TerminalSessionState;
  effect: TerminalSessionEffect;
}

export interface TerminalSessionSuggestionOptions
  extends TerminalSuggestionEngineOptions {
  profile?: Partial<TerminalWorkspaceProfile>;
  maxItems?: number;
}

export function createTerminalSessionState(value = ''): TerminalSessionState {
  return {
    editor: createTerminalEditorState(value),
    history: [],
  };
}

export function setTerminalSessionInputValue(
  state: TerminalSessionState,
  value: string,
): TerminalSessionState {
  return {
    ...state,
    editor: createTerminalEditorState(value),
  };
}

export function getTerminalPromptPreview(
  editor: TerminalEditorState,
): TerminalPromptPreview {
  const value = editor.value;
  const cursor = Math.max(0, Math.min(editor.cursor, value.length));

  return {
    before: value.slice(0, cursor),
    cursor: cursor < value.length ? value[cursor] ?? ' ' : ' ',
    after: cursor < value.length ? value.slice(cursor + 1) : '',
  };
}

export function getTerminalSessionSuggestions(
  state: TerminalSessionState,
  options?: TerminalSessionSuggestionOptions,
): TerminalSuggestion[] {
  return getTerminalSuggestions(
    {
      value: state.editor.value,
      cursor: state.editor.cursor,
      history: state.history,
      profile: options?.profile,
      maxItems: options?.maxItems,
    },
    {
      providers: options?.providers,
    },
  );
}

export function applyTerminalSessionSuggestion(
  state: TerminalSessionState,
  suggestion: TerminalSuggestion,
): TerminalSessionState {
  return {
    ...state,
    editor: applyTerminalSuggestion(state.editor, suggestion),
  };
}

export function submitTerminalSession(
  state: TerminalSessionState,
): TerminalSessionTransition {
  const rawValue = state.editor.value;
  const command = rawValue.trim();

  if (!command) {
    return {
      state,
      effect: { type: 'none' },
    };
  }

  return {
    state: {
      editor: createTerminalEditorState(),
      history: [...state.history, rawValue],
    },
    effect: {
      type: 'submit',
      command: rawValue,
    },
  };
}

export function dispatchTerminalSessionKey(
  state: TerminalSessionState,
  key: string,
  options?: Omit<TerminalSessionSuggestionOptions, 'maxItems'>,
): TerminalSessionTransition {
  if (!key) {
    return {
      state,
      effect: { type: 'none' },
    };
  }

  if (key === '\r') {
    return submitTerminalSession(state);
  }

  if (key === '\x7f') {
    return updateTerminalSessionEditor(state, deleteTerminalTextBackward(state.editor));
  }

  if (key === '\t') {
    return updateTerminalSessionEditor(
      state,
      autocompleteTerminalInput(
        state.editor,
        {
          history: state.history,
          profile: options?.profile,
        },
        {
          providers: options?.providers,
        },
      ),
    );
  }

  if (key === '\x1b[A') {
    return updateTerminalSessionEditor(
      state,
      navigateTerminalHistory(state.editor, state.history, 'up'),
    );
  }

  if (key === '\x1b[B') {
    return updateTerminalSessionEditor(
      state,
      navigateTerminalHistory(state.editor, state.history, 'down'),
    );
  }

  if (key === '\x1b[D') {
    return updateTerminalSessionEditor(state, moveTerminalCursor(state.editor, 'left'));
  }

  if (key === '\x1b[C') {
    return updateTerminalSessionEditor(state, moveTerminalCursor(state.editor, 'right'));
  }

  if (key === '\x03') {
    const command = state.editor.value || null;

    return {
      state: {
        ...state,
        editor: createTerminalEditorState(),
      },
      effect: {
        type: 'interrupt',
        command,
      },
    };
  }

  if (key === '\x0c') {
    return {
      state: {
        ...state,
        editor: createTerminalEditorState(),
      },
      effect: {
        type: 'clear-screen',
      },
    };
  }

  if (key.startsWith('\x1b')) {
    return {
      state,
      effect: { type: 'none' },
    };
  }

  return updateTerminalSessionEditor(state, insertTerminalText(state.editor, key));
}

function updateTerminalSessionEditor(
  state: TerminalSessionState,
  editor: TerminalEditorState,
): TerminalSessionTransition {
  if (editor === state.editor) {
    return {
      state,
      effect: { type: 'none' },
    };
  }

  return {
    state: {
      ...state,
      editor,
    },
    effect: { type: 'none' },
  };
}
