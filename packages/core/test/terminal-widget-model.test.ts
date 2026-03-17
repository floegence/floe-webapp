import { describe, expect, it } from 'vitest';
import {
  autocompleteTerminalCommand,
  createTerminalEditorState,
  DEFAULT_TERMINAL_SUGGESTIONS,
  deleteTerminalTextBackward,
  getTerminalSuggestions,
  insertTerminalText,
  navigateTerminalHistory,
  runTerminalCommand,
} from '../src/widgets/terminalWidgetModel';

describe('terminal widget model', () => {
  it('should insert and delete text around the cursor', () => {
    const inserted = insertTerminalText(
      {
        value: 'helo',
        cursor: 3,
        historyIndex: null,
        draft: '',
      },
      'p',
    );

    expect(inserted.value).toBe('helpo');
    expect(inserted.cursor).toBe(4);

    const deleted = deleteTerminalTextBackward(inserted);

    expect(deleted.value).toBe('helo');
    expect(deleted.cursor).toBe(3);
  });

  it('should autocomplete the first terminal command token', () => {
    expect(autocompleteTerminalCommand('he')).toBe('help');
    expect(autocompleteTerminalCommand('echo')).toBe('echo hello');
  });

  it('should surface contextual suggestions from current input and history', () => {
    expect(getTerminalSuggestions('da')).toEqual(['date']);
    expect(getTerminalSuggestions('ec', ['echo from history'])).toEqual([
      'echo from history',
      'echo hello',
      'echo "done"',
      'echo $PATH',
    ]);
    expect(getTerminalSuggestions('')).toEqual(['help', 'pwd', 'ls -la', 'git status']);
    expect(getTerminalSuggestions('gi')).toEqual([
      'git status',
      'git diff',
      'git log --oneline',
    ]);
    expect(getTerminalSuggestions('cat')).toEqual(['cat README.md']);
    expect(DEFAULT_TERMINAL_SUGGESTIONS).toContain('pwd');
    expect(DEFAULT_TERMINAL_SUGGESTIONS).toContain('ls -la');
  });

  it('should navigate command history and restore the current draft', () => {
    const history = ['help', 'date'];
    const initial = createTerminalEditorState('ec');
    const previous = navigateTerminalHistory(initial, history, 'up');
    const oldest = navigateTerminalHistory(previous, history, 'up');
    const restored = navigateTerminalHistory(previous, history, 'down');

    expect(previous.value).toBe('date');
    expect(previous.historyIndex).toBe(1);
    expect(oldest.value).toBe('help');
    expect(restored.value).toBe('ec');
    expect(restored.historyIndex).toBe(null);
  });

  it('should resolve terminal commands without UI state', () => {
    expect(runTerminalCommand('help').lines[0]?.content).toContain('Available commands');
    expect(runTerminalCommand('clear').clear).toBe(true);
    expect(runTerminalCommand('date', () => 'NOW').lines[0]?.content).toBe('NOW');
    expect(runTerminalCommand('echo hi').lines[0]?.content).toBe('hi');
    expect(runTerminalCommand('missing').lines[0]?.type).toBe('error');
  });
});
