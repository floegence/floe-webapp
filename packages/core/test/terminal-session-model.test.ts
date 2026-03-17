import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TERMINAL_SUGGESTION_PROVIDERS,
  createTerminalFullLineSuggestion,
  matchesTerminalSuggestionPrefix,
  type TerminalSuggestionProvider,
} from '../src/terminal/suggestionEngine';
import {
  applyTerminalSessionSuggestion,
  createTerminalSessionState,
  dispatchTerminalSessionKey,
  getTerminalPromptPreview,
  getTerminalSessionSuggestions,
  submitTerminalSession,
} from '../src/terminal/sessionModel';
import { DEFAULT_TERMINAL_WORKSPACE_PROFILE } from '../src/terminal/workspaceProfile';

describe('terminal session model', () => {
  it('should expose prompt preview and suggestions from shared session state', () => {
    const session = createTerminalSessionState('pn');
    const preview = getTerminalPromptPreview(session.editor);
    const suggestions = getTerminalSessionSuggestions(session, {
      profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
    });

    expect(preview.before).toBe('pn');
    expect(preview.cursor).toBe(' ');
    expect(preview.after).toBe('');
    expect(suggestions.map((item) => item.label)).toEqual([
      'pnpm dev',
      'pnpm test',
      'pnpm build',
      'pnpm lint',
    ]);
  });

  it('should emit submit effects that host runtimes can execute', () => {
    const transition = submitTerminalSession(createTerminalSessionState('pwd'));

    expect(transition.effect).toEqual({
      type: 'submit',
      command: 'pwd',
    });
    expect(transition.state.history).toEqual(['pwd']);
    expect(transition.state.editor.value).toBe('');
  });

  it('should let hosts inject custom suggestion providers', () => {
    const customProviders: readonly TerminalSuggestionProvider[] = [
      ({ context }) =>
        [{ id: 'docker-ps', label: 'docker ps', detail: 'docker', score: 200 }]
          .filter((item) => matchesTerminalSuggestionPrefix(context, item))
          .map((item) =>
            createTerminalFullLineSuggestion(context, {
              id: item.id,
              kind: 'command',
              label: item.label,
              detail: item.detail,
              score: item.score,
            }),
          ),
      ...DEFAULT_TERMINAL_SUGGESTION_PROVIDERS,
    ];

    const suggestions = getTerminalSessionSuggestions(createTerminalSessionState('dock'), {
      profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      providers: customProviders,
    });

    expect(suggestions.map((item) => item.label)).toEqual(['docker ps']);
  });

  it('should autocomplete, interrupt, and clear through the shared reducer', () => {
    const autocompleted = dispatchTerminalSessionKey(
      createTerminalSessionState('git st'),
      '\t',
      { profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE },
    );

    expect(autocompleted.state.editor.value).toBe('git status');

    const interrupted = dispatchTerminalSessionKey(
      autocompleted.state,
      '\x03',
      { profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE },
    );

    expect(interrupted.effect).toEqual({
      type: 'interrupt',
      command: 'git status',
    });
    expect(interrupted.state.editor.value).toBe('');

    const cleared = dispatchTerminalSessionKey(
      createTerminalSessionState('echo hello'),
      '\x0c',
      { profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE },
    );

    expect(cleared.effect).toEqual({ type: 'clear-screen' });
    expect(cleared.state.editor.value).toBe('');
  });

  it('should autocomplete through injected providers on tab', () => {
    const customProviders: readonly TerminalSuggestionProvider[] = [
      ({ context }) =>
        [{ id: 'docker-ps', label: 'docker ps', detail: 'docker', score: 200 }]
          .filter((item) => matchesTerminalSuggestionPrefix(context, item))
          .map((item) =>
            createTerminalFullLineSuggestion(context, {
              id: item.id,
              kind: 'command',
              label: item.label,
              detail: item.detail,
              score: item.score,
            }),
          ),
      ...DEFAULT_TERMINAL_SUGGESTION_PROVIDERS,
    ];

    const transition = dispatchTerminalSessionKey(
      createTerminalSessionState('dock'),
      '\t',
      {
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
        providers: customProviders,
      },
    );

    expect(transition.state.editor.value).toBe('docker ps');
  });

  it('should apply structured suggestions back into shared session state', () => {
    const session = createTerminalSessionState('cat pac');
    const suggestion = getTerminalSessionSuggestions(session, {
      profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
    })[0];

    expect(suggestion?.label).toBe('cat package.json');

    const nextSession = applyTerminalSessionSuggestion(session, suggestion!);

    expect(nextSession.editor.value).toBe('cat package.json');
    expect(nextSession.editor.cursor).toBe('cat package.json'.length);
  });
});
