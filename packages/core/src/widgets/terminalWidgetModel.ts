export interface TerminalEditorState {
  value: string;
  cursor: number;
  historyIndex: number | null;
  draft: string;
}

export interface TerminalCommandLine {
  type: 'output' | 'error';
  content: string;
}

export interface TerminalCommandResult {
  clear: boolean;
  lines: TerminalCommandLine[];
}

export const DEFAULT_TERMINAL_COMMANDS = ['help', 'clear', 'date', 'echo'] as const;
export const DEFAULT_TERMINAL_SUGGESTIONS = [
  'help',
  'pwd',
  'ls -la',
  'git status',
  'cat README.md',
  'clear',
  'date',
  'git diff',
  'echo hello',
  'echo $PATH',
] as const;

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

export function autocompleteTerminalCommand(
  value: string,
  history: readonly string[] = [],
  suggestions: readonly string[] = DEFAULT_TERMINAL_SUGGESTIONS,
): string {
  return getTerminalSuggestions(value, history, suggestions)[0] ?? value;
}

export function getTerminalSuggestions(
  value: string,
  history: readonly string[] = [],
  suggestions: readonly string[] = DEFAULT_TERMINAL_SUGGESTIONS,
): string[] {
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();

  const historyMatches = dedupeSuggestions(
    [...history]
      .reverse()
      .map((item) => item.trim())
      .filter((item) => item && matchesTerminalSuggestion(item, normalized)),
  );

  const baseSuggestions = dedupeSuggestions([
    ...resolveContextualSuggestions(trimmed),
    ...suggestions,
    ...DEFAULT_TERMINAL_COMMANDS,
  ]).filter((item) => matchesTerminalSuggestion(item, normalized));

  return dedupeSuggestions([...historyMatches, ...baseSuggestions]).slice(0, 4);
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

export function runTerminalCommand(
  input: string,
  resolveNow: () => string = () => new Date().toString(),
): TerminalCommandResult {
  const value = input.trim();
  if (!value) {
    return {
      clear: false,
      lines: [],
    };
  }

  if (value === 'help') {
    return {
      clear: false,
      lines: [
        {
          type: 'output',
          content:
            'Available commands: help, pwd, ls, clear, date, echo <text>, git status, git diff, git log --oneline, cat README.md',
        },
      ],
    };
  }

  if (value === 'pwd') {
    return {
      clear: false,
      lines: [
        {
          type: 'output',
          content: '/workspace/demo',
        },
      ],
    };
  }

  if (value === 'ls' || value === 'ls -la') {
    return {
      clear: false,
      lines: [
        {
          type: 'output',
          content:
            value === 'ls'
              ? 'README.md  package.json  src  scripts'
              : 'drwxr-xr-x  src\n-rw-r--r--  README.md\n-rw-r--r--  package.json\n-rwxr-xr-x  scripts',
        },
      ],
    };
  }

  if (value === 'clear') {
    return {
      clear: true,
      lines: [],
    };
  }

  if (value === 'date') {
    return {
      clear: false,
      lines: [
        {
          type: 'output',
          content: resolveNow(),
        },
      ],
    };
  }

  if (value.startsWith('echo ')) {
    return {
      clear: false,
      lines: [
        {
          type: 'output',
          content: value.slice(5),
        },
      ],
    };
  }

  if (value === 'git status') {
    return {
      clear: false,
      lines: [
        {
          type: 'output',
          content: 'On branch main\nnothing to commit, working tree clean',
        },
      ],
    };
  }

  if (value === 'git diff') {
    return {
      clear: false,
      lines: [
        {
          type: 'output',
          content: 'diff --git a/src/app.ts b/src/app.ts\nindex 1234567..89abcde 100644',
        },
      ],
    };
  }

  if (value === 'git log --oneline') {
    return {
      clear: false,
      lines: [
        {
          type: 'output',
          content: '89abcde refine mobile keyboard\n1234567 initial terminal widget',
        },
      ],
    };
  }

  if (value === 'cat README.md') {
    return {
      clear: false,
      lines: [
        {
          type: 'output',
          content: '# Floe Webapp\nA terminal-first demo workspace.',
        },
      ],
    };
  }

  return {
    clear: false,
    lines: [
      {
        type: 'error',
        content: `Command not found: ${value}`,
      },
    ],
  };
}

function clampTerminalCursor(cursor: number, valueLength: number): number {
  return Math.max(0, Math.min(valueLength, cursor));
}

function resolveContextualSuggestions(value: string): string[] {
  if (!value) return [...DEFAULT_TERMINAL_SUGGESTIONS];

  const normalized = value.toLowerCase();

  if (normalized.startsWith('echo') || 'echo'.startsWith(normalized)) {
    return ['echo hello', 'echo "done"', 'echo $PATH'];
  }

  if (normalized.startsWith('pwd') || 'pwd'.startsWith(normalized)) {
    return ['pwd'];
  }

  if (normalized.startsWith('ls') || 'ls'.startsWith(normalized)) {
    return ['ls', 'ls -la', 'ls src'];
  }

  if (normalized.startsWith('git') || 'git'.startsWith(normalized)) {
    return ['git status', 'git diff', 'git log --oneline'];
  }

  if (normalized.startsWith('cat') || 'cat'.startsWith(normalized)) {
    return ['cat README.md'];
  }

  if (normalized.startsWith('help') || 'help'.startsWith(normalized)) {
    return ['help'];
  }

  if (normalized.startsWith('clear') || 'clear'.startsWith(normalized)) {
    return ['clear'];
  }

  if (normalized.startsWith('date') || 'date'.startsWith(normalized)) {
    return ['date'];
  }

  return [...DEFAULT_TERMINAL_SUGGESTIONS];
}

function matchesTerminalSuggestion(value: string, normalizedInput: string): boolean {
  if (!normalizedInput) return true;
  return value.toLowerCase().startsWith(normalizedInput);
}

function dedupeSuggestions(values: readonly string[]): string[] {
  return [...new Set(values)];
}
