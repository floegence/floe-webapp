import { describe, expect, it } from 'vitest';
import {
  createTerminalEditorState,
  deleteTerminalTextBackward,
  insertTerminalText,
  navigateTerminalHistory,
} from '../src/terminal/editorModel';
import {
  DEFAULT_TERMINAL_SUGGESTION_PROVIDERS,
  applyTerminalSuggestion,
  autocompleteTerminalInput,
  createTerminalFullLineSuggestion,
  getTerminalSuggestions,
  matchesTerminalSuggestionPrefix,
  parseTerminalSuggestionContext,
  type TerminalSuggestionProvider,
} from '../src/terminal/suggestionEngine';
import { DEFAULT_TERMINAL_WORKSPACE_PROFILE } from '../src/terminal/workspaceProfile';

describe('terminal editor model', () => {
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

  it('should navigate command history and restore the current draft', () => {
    const history = ['git status', 'pnpm test'];
    const initial = createTerminalEditorState('pn');
    const previous = navigateTerminalHistory(initial, history, 'up');
    const oldest = navigateTerminalHistory(previous, history, 'up');
    const restored = navigateTerminalHistory(previous, history, 'down');

    expect(previous.value).toBe('pnpm test');
    expect(previous.historyIndex).toBe(1);
    expect(oldest.value).toBe('git status');
    expect(restored.value).toBe('pn');
    expect(restored.historyIndex).toBe(null);
  });
});

describe('terminal suggestion engine', () => {
  it('should parse shell-like tokens and replacement ranges', () => {
    const context = parseTerminalSuggestionContext('git st');

    expect(context.command).toBe('git');
    expect(context.activeTokenIndex).toBe(1);
    expect(context.activeTokenPrefix).toBe('st');
    expect(context.activeReplaceFrom).toBe(4);
    expect(context.activeReplaceTo).toBe(6);
  });

  it('should rank high-value root suggestions for empty input', () => {
    const suggestions = getTerminalSuggestions({
      value: '',
      profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
    });

    expect(suggestions.map((item) => item.label)).toEqual([
      'git status',
      'ls -la',
      'pnpm dev',
      'pwd',
    ]);
  });

  it('should return terminal-aware suggestions for subcommands, scripts, and paths', () => {
    expect(
      getTerminalSuggestions({
        value: 'git st',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['git status']);

    expect(
      getTerminalSuggestions({
        value: 'pn',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['pnpm dev', 'pnpm test', 'pnpm build', 'pnpm lint']);

    expect(
      getTerminalSuggestions({
        value: 'cat pac',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['cat package.json']);
  });

  it('should cover common terminal tool families beyond git and pnpm', () => {
    expect(
      getTerminalSuggestions({
        value: 'vi',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['vim README.md', 'vim package.json']);

    expect(
      getTerminalSuggestions({
        value: 'vim pa',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['vim package.json', 'vim packages/']);

    expect(
      getTerminalSuggestions({
        value: 'uname -',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['uname -a', 'uname -sr', 'uname -m']);

    expect(
      getTerminalSuggestions({
        value: 'echo ',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['echo "$PATH"', 'echo "$SHELL"', 'echo "hello world"']);

    expect(
      getTerminalSuggestions({
        value: 'awk ',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual([
      "awk '{print $1}' package.json",
      "awk 'NR<=20 {print}' README.md",
      "awk '/scripts/ {print NR \":\" $0}' package.json",
    ]);

    expect(
      getTerminalSuggestions({
        value: 'head ',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['head -n 20 README.md', 'head -c 128 README.md']);

    expect(
      getTerminalSuggestions({
        value: 'tail ',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['tail -n 20 README.md', 'tail -c 128 README.md']);

    expect(
      getTerminalSuggestions({
        value: 'less R',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['less README.md']);

    expect(
      getTerminalSuggestions({
        value: 'wc -',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['wc -l README.md', 'wc -w README.md', 'wc -c README.md']);

    expect(
      getTerminalSuggestions({
        value: 'curl ',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual([
      'curl -I https://example.com',
      'curl -L https://example.com',
      'curl -H "Authorization: Bearer " https://api.example.com',
    ]);

    expect(
      getTerminalSuggestions({
        value: 'tar ',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual([
      'tar -czf floe-webapp.tgz packages/',
      'tar -xzf floe-webapp.tgz',
      'tar -tf floe-webapp.tgz',
    ]);

    expect(
      getTerminalSuggestions({
        value: 'chmod +',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual([
      'chmod +x scripts/dev.mjs',
    ]);

    expect(
      getTerminalSuggestions({
        value: 'chmod 7',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual([
      'chmod 755 scripts/dev.mjs',
    ]);

    expect(
      getTerminalSuggestions({
        value: 'ssh ',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['ssh user@example.com', 'ssh -p 22 user@example.com']);

    expect(
      getTerminalSuggestions({
        value: 'scp ',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual([
      'scp README.md user@example.com:/tmp/',
      'scp -r scripts/ user@example.com:/tmp/scripts/',
    ]);
  });

  it('should build path suggestions against the whole command line for text utilities', () => {
    expect(
      getTerminalSuggestions({
        value: "sed -n '1,20p' pa",
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(["sed -n '1,20p' package.json"]);

    expect(
      getTerminalSuggestions({
        value: 'head -n 20 RE',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['head -n 20 README.md']);

    expect(
      getTerminalSuggestions({
        value: 'grep -R "term" sr',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['grep -R "term" src/']);

    expect(
      getTerminalSuggestions({
        value: 'touch .e',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['touch .env.local']);

    expect(
      getTerminalSuggestions({
        value: 'sort p',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['sort package.json', 'sort pnpm-lock.yaml']);

    expect(
      getTerminalSuggestions({
        value: 'chmod sc',
        profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
      }).map((item) => item.label),
    ).toEqual(['chmod scripts/dev.mjs', 'chmod scripts/']);
  });

  it('should allow hosts to prepend custom suggestion providers', () => {
    const customProviders: readonly TerminalSuggestionProvider[] = [
      ({ context }) =>
        [
          { id: 'docker-ps', label: 'docker ps', detail: 'docker', score: 200 },
          { id: 'docker-build', label: 'docker build .', detail: 'docker', score: 196 },
        ]
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

    expect(
      getTerminalSuggestions(
        {
          value: 'dock',
          profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
        },
        {
          providers: customProviders,
        },
      ).map((item) => item.label),
    ).toEqual(['docker ps', 'docker build .']);
  });

  it('should apply token replacements and preserve cursor intent', () => {
    const suggestion = getTerminalSuggestions({
      value: 'git st',
      profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
    })[0];

    expect(suggestion?.label).toBe('git status');

    const applied = applyTerminalSuggestion(
      createTerminalEditorState('git st'),
      suggestion!,
    );

    expect(applied.value).toBe('git status');
    expect(applied.cursor).toBe('git status'.length);
  });

  it('should autocomplete with the highest-ranked terminal suggestion', () => {
    const nextState = autocompleteTerminalInput(createTerminalEditorState('pn'), {
      profile: DEFAULT_TERMINAL_WORKSPACE_PROFILE,
    });

    expect(nextState.value).toBe('pnpm dev');
    expect(nextState.cursor).toBe('pnpm dev'.length);
  });
});
