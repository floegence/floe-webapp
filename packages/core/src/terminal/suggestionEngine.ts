import { clampTerminalCursor } from './editorModel';
import { normalizeTerminalWorkspaceProfile } from './workspaceProfile';
import type {
  TerminalEditorState,
  TerminalSuggestion,
  TerminalSuggestionKind,
  TerminalSuggestionRequest,
  TerminalWorkspaceProfile,
} from './types';

export interface TerminalToken {
  text: string;
  from: number;
  to: number;
}

export interface ParsedTerminalSuggestionContext {
  value: string;
  cursor: number;
  tokens: TerminalToken[];
  command: string | null;
  activeTokenIndex: number;
  activeTokenPrefix: string;
  activeTokenText: string;
  activeReplaceFrom: number;
  activeReplaceTo: number;
  atTokenBoundary: boolean;
}

export interface TerminalSuggestionProviderInput {
  request: TerminalSuggestionRequest;
  profile: TerminalWorkspaceProfile;
  context: ParsedTerminalSuggestionContext;
}

export type TerminalSuggestionProvider = (
  input: TerminalSuggestionProviderInput,
) => readonly TerminalSuggestion[];

export interface TerminalSuggestionEngineOptions {
  providers?: readonly TerminalSuggestionProvider[];
}

export interface TerminalFullLineSuggestionSpec {
  id: string;
  kind: TerminalSuggestionKind;
  label: string;
  detail?: string;
  score: number;
  insertText?: string;
  replaceTo?: number;
  nextCursorOffset?: number;
}

export interface TerminalTokenSuggestionSpec {
  id: string;
  kind: TerminalSuggestionKind;
  label: string;
  insertText: string;
  detail?: string;
  score: number;
  replaceFrom?: number;
  replaceTo?: number;
  nextCursorOffset?: number;
}

interface TerminalSnippetSpec {
  id: string;
  label: string;
  matchText: string;
  detail: string;
  score: number;
  cursorOffset?: number;
}

interface TerminalStaticTokenSuggestionSpec {
  id: string;
  kind: TerminalSuggestionKind;
  label: string;
  insertText: string;
  matchText: string;
  detail: string;
  score: number;
  nextCursorOffset?: number;
}

type PathSuggestionScope = 'file' | 'dir' | 'file-or-dir';

const DEFAULT_MAX_TERMINAL_SUGGESTIONS = 4;

const ROOT_COMMAND_SUGGESTIONS: ReadonlyArray<{
  label: string;
  kind: TerminalSuggestionKind;
  detail: string;
  score: number;
}> = [
  { label: 'git status', kind: 'command', detail: 'git', score: 124 },
  { label: 'ls -la', kind: 'command', detail: 'shell', score: 118 },
  { label: 'pwd', kind: 'command', detail: 'shell', score: 116 },
  { label: 'git diff', kind: 'command', detail: 'git', score: 114 },
  { label: 'cat README.md', kind: 'command', detail: 'file', score: 112 },
  { label: 'git log --oneline -10', kind: 'command', detail: 'git', score: 110 },
  {
    label: 'mkdir -p src/components',
    kind: 'command',
    detail: 'shell',
    score: 96,
  },
  { label: 'touch .env.local', kind: 'command', detail: 'shell', score: 94 },
  {
    label: 'curl -I https://example.com',
    kind: 'command',
    detail: 'network',
    score: 90,
  },
  { label: 'clear', kind: 'command', detail: 'shell', score: 92 },
  { label: 'date', kind: 'command', detail: 'shell', score: 88 },
  { label: 'help', kind: 'command', detail: 'shell', score: 84 },
] as const;

const TERMINAL_SNIPPET_SUGGESTIONS: readonly TerminalSnippetSpec[] = [
  {
    id: 'git-commit-message',
    label: 'git commit -m ""',
    matchText: 'git commit',
    detail: 'snippet',
    score: 120,
    cursorOffset: 'git commit -m "'.length,
  },
  {
    id: 'git-checkout-branch',
    label: 'git checkout -b ""',
    matchText: 'git checkout',
    detail: 'snippet',
    score: 118,
    cursorOffset: 'git checkout -b "'.length,
  },
  {
    id: 'find-by-name',
    label: 'find . -name ""',
    matchText: 'find',
    detail: 'find',
    score: 108,
    cursorOffset: 'find . -name "'.length,
  },
  {
    id: 'grep-recursive-src',
    label: 'grep -R "" src/',
    matchText: 'grep',
    detail: 'grep',
    score: 106,
    cursorOffset: 'grep -R "'.length,
  },
  {
    id: 'vim-readme',
    label: 'vim README.md',
    matchText: 'vim',
    detail: 'editor',
    score: 104,
  },
  {
    id: 'vim-package-json',
    label: 'vim package.json',
    matchText: 'vim',
    detail: 'editor',
    score: 102,
  },
  {
    id: 'uname-all',
    label: 'uname -a',
    matchText: 'uname',
    detail: 'system',
    score: 100,
  },
  {
    id: 'echo-path',
    label: 'echo "$PATH"',
    matchText: 'echo',
    detail: 'env',
    score: 100,
  },
  {
    id: 'sed-readme-range',
    label: "sed -n '1,20p' README.md",
    matchText: 'sed',
    detail: 'text',
    score: 98,
    cursorOffset: "sed -n '".length,
  },
  {
    id: 'awk-print-first-column',
    label: "awk '{print $1}' package.json",
    matchText: 'awk',
    detail: 'text',
    score: 96,
    cursorOffset: "awk '".length,
  },
  {
    id: 'head-readme',
    label: 'head -n 20 README.md',
    matchText: 'head',
    detail: 'text',
    score: 94,
  },
  {
    id: 'tail-readme',
    label: 'tail -n 20 README.md',
    matchText: 'tail',
    detail: 'text',
    score: 92,
  },
  {
    id: 'less-readme',
    label: 'less README.md',
    matchText: 'less',
    detail: 'pager',
    score: 90,
  },
  {
    id: 'wc-lines-readme',
    label: 'wc -l README.md',
    matchText: 'wc',
    detail: 'text',
    score: 88,
  },
  {
    id: 'mkdir-components',
    label: 'mkdir -p src/components',
    matchText: 'mkdir',
    detail: 'shell',
    score: 86,
  },
  {
    id: 'touch-env-local',
    label: 'touch .env.local',
    matchText: 'touch',
    detail: 'shell',
    score: 84,
  },
  {
    id: 'chmod-script-executable',
    label: 'chmod +x scripts/dev.mjs',
    matchText: 'chmod',
    detail: 'permissions',
    score: 82,
  },
  {
    id: 'sort-readme',
    label: 'sort README.md',
    matchText: 'sort',
    detail: 'text',
    score: 80,
  },
  {
    id: 'cut-package-fields',
    label: 'cut -d ":" -f 1 package.json',
    matchText: 'cut',
    detail: 'text',
    score: 78,
  },
  {
    id: 'curl-head',
    label: 'curl -I https://example.com',
    matchText: 'curl',
    detail: 'network',
    score: 76,
  },
  {
    id: 'tar-create-archive',
    label: 'tar -czf floe-webapp.tgz packages/',
    matchText: 'tar',
    detail: 'archive',
    score: 74,
  },
  {
    id: 'ssh-example-host',
    label: 'ssh user@example.com',
    matchText: 'ssh',
    detail: 'remote',
    score: 72,
  },
  {
    id: 'scp-readme',
    label: 'scp README.md user@example.com:/tmp/',
    matchText: 'scp',
    detail: 'remote',
    score: 70,
  },
];

const STATIC_COMMAND_TOKEN_SUGGESTIONS: Readonly<
  Partial<Record<string, readonly TerminalStaticTokenSuggestionSpec[]>>
> = {
  uname: [
    {
      id: 'uname-flag-a',
      kind: 'subcommand',
      label: 'uname -a',
      insertText: '-a',
      matchText: '-a',
      detail: 'system',
      score: 128,
    },
    {
      id: 'uname-flag-sr',
      kind: 'subcommand',
      label: 'uname -sr',
      insertText: '-sr',
      matchText: '-sr',
      detail: 'system',
      score: 124,
    },
    {
      id: 'uname-flag-m',
      kind: 'subcommand',
      label: 'uname -m',
      insertText: '-m',
      matchText: '-m',
      detail: 'system',
      score: 122,
    },
  ],
  echo: [
    {
      id: 'echo-token-path',
      kind: 'snippet',
      label: 'echo "$PATH"',
      insertText: '"$PATH"',
      matchText: '$PATH',
      detail: 'env',
      score: 126,
    },
    {
      id: 'echo-token-shell',
      kind: 'snippet',
      label: 'echo "$SHELL"',
      insertText: '"$SHELL"',
      matchText: '$SHELL',
      detail: 'env',
      score: 124,
    },
    {
      id: 'echo-token-hello',
      kind: 'snippet',
      label: 'echo "hello world"',
      insertText: '"hello world"',
      matchText: 'hello world',
      detail: 'env',
      score: 120,
    },
  ],
  sed: [
    {
      id: 'sed-flag-n',
      kind: 'subcommand',
      label: "sed -n '1,20p' README.md",
      insertText: '-n',
      matchText: '-n',
      detail: 'text',
      score: 126,
    },
    {
      id: 'sed-flag-E',
      kind: 'subcommand',
      label: "sed -E 's/floe/Floe/g' README.md",
      insertText: '-E',
      matchText: '-E',
      detail: 'text',
      score: 122,
    },
    {
      id: 'sed-flag-e',
      kind: 'subcommand',
      label: "sed -e 's/floe/Floe/g' README.md",
      insertText: '-e',
      matchText: '-e',
      detail: 'text',
      score: 118,
    },
  ],
  awk: [
    {
      id: 'awk-program-print-first-column',
      kind: 'snippet',
      label: "awk '{print $1}' package.json",
      insertText: "'{print $1}'",
      matchText: "'{print $1}'",
      detail: 'text',
      score: 126,
    },
    {
      id: 'awk-program-first-lines',
      kind: 'snippet',
      label: "awk 'NR<=20 {print}' README.md",
      insertText: "'NR<=20 {print}'",
      matchText: "'NR<=20 {print}'",
      detail: 'text',
      score: 122,
    },
    {
      id: 'awk-program-match-scripts',
      kind: 'snippet',
      label: "awk '/scripts/ {print NR \":\" $0}' package.json",
      insertText: "'/scripts/ {print NR \":\" $0}'",
      matchText: "'/scripts/ {print NR \":\" $0}'",
      detail: 'text',
      score: 120,
    },
  ],
  grep: [
    {
      id: 'grep-flag-R',
      kind: 'subcommand',
      label: 'grep -R "" src/',
      insertText: '-R',
      matchText: '-R',
      detail: 'grep',
      score: 124,
    },
    {
      id: 'grep-flag-n',
      kind: 'subcommand',
      label: 'grep -n "" README.md',
      insertText: '-n',
      matchText: '-n',
      detail: 'grep',
      score: 122,
    },
    {
      id: 'grep-flag-i',
      kind: 'subcommand',
      label: 'grep -i "" README.md',
      insertText: '-i',
      matchText: '-i',
      detail: 'grep',
      score: 120,
    },
  ],
  find: [
    {
      id: 'find-flag-name',
      kind: 'subcommand',
      label: 'find . -name ""',
      insertText: '-name',
      matchText: '-name',
      detail: 'find',
      score: 124,
    },
    {
      id: 'find-flag-type',
      kind: 'subcommand',
      label: 'find . -type f',
      insertText: '-type',
      matchText: '-type',
      detail: 'find',
      score: 122,
    },
    {
      id: 'find-flag-maxdepth',
      kind: 'subcommand',
      label: 'find . -maxdepth 2',
      insertText: '-maxdepth',
      matchText: '-maxdepth',
      detail: 'find',
      score: 120,
    },
  ],
  head: [
    {
      id: 'head-flag-n',
      kind: 'subcommand',
      label: 'head -n 20 README.md',
      insertText: '-n 20',
      matchText: '-n',
      detail: 'text',
      score: 124,
    },
    {
      id: 'head-flag-c',
      kind: 'subcommand',
      label: 'head -c 128 README.md',
      insertText: '-c 128',
      matchText: '-c',
      detail: 'text',
      score: 120,
    },
  ],
  tail: [
    {
      id: 'tail-flag-n',
      kind: 'subcommand',
      label: 'tail -n 20 README.md',
      insertText: '-n 20',
      matchText: '-n',
      detail: 'text',
      score: 124,
    },
    {
      id: 'tail-flag-c',
      kind: 'subcommand',
      label: 'tail -c 128 README.md',
      insertText: '-c 128',
      matchText: '-c',
      detail: 'text',
      score: 120,
    },
  ],
  wc: [
    {
      id: 'wc-flag-l',
      kind: 'subcommand',
      label: 'wc -l README.md',
      insertText: '-l',
      matchText: '-l',
      detail: 'text',
      score: 124,
    },
    {
      id: 'wc-flag-w',
      kind: 'subcommand',
      label: 'wc -w README.md',
      insertText: '-w',
      matchText: '-w',
      detail: 'text',
      score: 122,
    },
    {
      id: 'wc-flag-c',
      kind: 'subcommand',
      label: 'wc -c README.md',
      insertText: '-c',
      matchText: '-c',
      detail: 'text',
      score: 120,
    },
  ],
  mkdir: [
    {
      id: 'mkdir-flag-p',
      kind: 'snippet',
      label: 'mkdir -p src/components',
      insertText: '-p src/components',
      matchText: '-p',
      detail: 'shell',
      score: 124,
      nextCursorOffset: '-p '.length,
    },
  ],
  chmod: [
    {
      id: 'chmod-plus-x',
      kind: 'snippet',
      label: 'chmod +x scripts/dev.mjs',
      insertText: '+x scripts/dev.mjs',
      matchText: '+x',
      detail: 'permissions',
      score: 126,
      nextCursorOffset: '+x '.length,
    },
    {
      id: 'chmod-755',
      kind: 'snippet',
      label: 'chmod 755 scripts/dev.mjs',
      insertText: '755 scripts/dev.mjs',
      matchText: '755',
      detail: 'permissions',
      score: 122,
      nextCursorOffset: '755 '.length,
    },
    {
      id: 'chmod-644',
      kind: 'snippet',
      label: 'chmod 644 package.json',
      insertText: '644 package.json',
      matchText: '644',
      detail: 'permissions',
      score: 120,
      nextCursorOffset: '644 '.length,
    },
  ],
  sort: [
    {
      id: 'sort-flag-u',
      kind: 'snippet',
      label: 'sort -u package.json',
      insertText: '-u package.json',
      matchText: '-u',
      detail: 'text',
      score: 124,
      nextCursorOffset: '-u '.length,
    },
    {
      id: 'sort-flag-r',
      kind: 'snippet',
      label: 'sort -r README.md',
      insertText: '-r README.md',
      matchText: '-r',
      detail: 'text',
      score: 122,
      nextCursorOffset: '-r '.length,
    },
  ],
  cut: [
    {
      id: 'cut-delimiter-field',
      kind: 'snippet',
      label: 'cut -d ":" -f 1 package.json',
      insertText: '-d ":" -f 1 package.json',
      matchText: '-d',
      detail: 'text',
      score: 124,
      nextCursorOffset: '-d '.length,
    },
    {
      id: 'cut-field-only',
      kind: 'snippet',
      label: 'cut -f 1 README.md',
      insertText: '-f 1 README.md',
      matchText: '-f',
      detail: 'text',
      score: 120,
      nextCursorOffset: '-f '.length,
    },
  ],
  curl: [
    {
      id: 'curl-head',
      kind: 'snippet',
      label: 'curl -I https://example.com',
      insertText: '-I https://example.com',
      matchText: '-I',
      detail: 'network',
      score: 126,
      nextCursorOffset: '-I '.length,
    },
    {
      id: 'curl-follow',
      kind: 'snippet',
      label: 'curl -L https://example.com',
      insertText: '-L https://example.com',
      matchText: '-L',
      detail: 'network',
      score: 122,
      nextCursorOffset: '-L '.length,
    },
    {
      id: 'curl-auth-header',
      kind: 'snippet',
      label: 'curl -H "Authorization: Bearer " https://api.example.com',
      insertText: '-H "Authorization: Bearer " https://api.example.com',
      matchText: '-H',
      detail: 'network',
      score: 120,
      nextCursorOffset: '-H "Authorization: Bearer '.length,
    },
  ],
  tar: [
    {
      id: 'tar-create',
      kind: 'snippet',
      label: 'tar -czf floe-webapp.tgz packages/',
      insertText: '-czf floe-webapp.tgz packages/',
      matchText: '-czf',
      detail: 'archive',
      score: 126,
      nextCursorOffset: '-czf '.length,
    },
    {
      id: 'tar-extract',
      kind: 'snippet',
      label: 'tar -xzf floe-webapp.tgz',
      insertText: '-xzf floe-webapp.tgz',
      matchText: '-xzf',
      detail: 'archive',
      score: 122,
      nextCursorOffset: '-xzf '.length,
    },
    {
      id: 'tar-list',
      kind: 'snippet',
      label: 'tar -tf floe-webapp.tgz',
      insertText: '-tf floe-webapp.tgz',
      matchText: '-tf',
      detail: 'archive',
      score: 120,
      nextCursorOffset: '-tf '.length,
    },
  ],
  ssh: [
    {
      id: 'ssh-user-host',
      kind: 'snippet',
      label: 'ssh user@example.com',
      insertText: 'user@example.com',
      matchText: 'user@example.com',
      detail: 'remote',
      score: 124,
    },
    {
      id: 'ssh-port',
      kind: 'snippet',
      label: 'ssh -p 22 user@example.com',
      insertText: '-p 22 user@example.com',
      matchText: '-p',
      detail: 'remote',
      score: 120,
      nextCursorOffset: '-p '.length,
    },
  ],
  scp: [
    {
      id: 'scp-file-to-host',
      kind: 'snippet',
      label: 'scp README.md user@example.com:/tmp/',
      insertText: 'README.md user@example.com:/tmp/',
      matchText: 'README.md',
      detail: 'remote',
      score: 124,
    },
    {
      id: 'scp-recursive',
      kind: 'snippet',
      label: 'scp -r scripts/ user@example.com:/tmp/scripts/',
      insertText: '-r scripts/ user@example.com:/tmp/scripts/',
      matchText: '-r',
      detail: 'remote',
      score: 120,
      nextCursorOffset: '-r '.length,
    },
  ],
};

const PATH_SUGGESTION_COMMAND_SCOPES: Readonly<
  Partial<Record<string, PathSuggestionScope>>
> = {
  ls: 'dir',
  cat: 'file',
  vim: 'file-or-dir',
  less: 'file',
  head: 'file',
  tail: 'file',
  wc: 'file',
  sed: 'file',
  awk: 'file',
  grep: 'file-or-dir',
  touch: 'file',
  chmod: 'file-or-dir',
  sort: 'file',
  cut: 'file',
};

const PATH_SUGGESTION_MIN_TOKEN_INDEX: Readonly<
  Partial<Record<string, number>>
> = {
  ls: 1,
  cat: 1,
  vim: 1,
  less: 1,
  head: 3,
  tail: 3,
  wc: 2,
  sed: 3,
  awk: 2,
  grep: 2,
  touch: 1,
  chmod: 1,
  sort: 1,
  cut: 2,
};

export const terminalHistorySuggestionProvider: TerminalSuggestionProvider = ({
  context,
  request,
}) => {
  const input = context.value.trim().toLowerCase();

  return [...(request.history ?? [])]
    .reverse()
    .map((item) => item.trim())
    .filter((item) => item && matchesHistory(item, input))
    .map((item, index) =>
      createTerminalFullLineSuggestion(context, {
        id: `history-${item}-${index}`,
        kind: 'history',
        label: item,
        detail: 'history',
        score: 140 - index,
      }),
    );
};

export const terminalRootSuggestionProvider: TerminalSuggestionProvider = ({
  context,
  profile,
}) => {
  if (context.tokens.length > 1 || context.activeTokenIndex > 0) {
    return [];
  }

  const suggestions: Array<{
    suggestion: TerminalSuggestion;
    label: string;
    matchText?: string;
  }> = [
    ...profile.scripts.map((script, index) => ({
      suggestion: createTerminalFullLineSuggestion(context, {
        id: `root-script-${script}`,
        kind: 'script',
        label: `pnpm ${script}`,
        detail: 'script',
        score: getRootScriptScore(script, index),
      }),
      label: `pnpm ${script}`,
      matchText: `pnpm ${script}`,
    })),
    ...ROOT_COMMAND_SUGGESTIONS.map((item) => ({
      suggestion: createTerminalFullLineSuggestion(context, {
        id: `root-${item.label}`,
        kind: item.kind,
        label: item.label,
        detail: item.detail,
        score: item.score,
      }),
      label: item.label,
      matchText: item.label,
    })),
  ];

  return suggestions
    .filter((item) => matchesTerminalSuggestionPrefix(context, item))
    .map((item) => item.suggestion);
};

export const terminalCommandTokenSuggestionProvider: TerminalSuggestionProvider = ({
  context,
  profile,
}) => {
  if (!context.command || context.activeTokenIndex === 0) {
    return [];
  }

  if (context.command === 'git') {
    return createMatchedTokenSuggestions(context, [
      {
        id: 'git-status',
        kind: 'subcommand',
        label: 'git status',
        insertText: 'status',
        matchText: 'status',
        detail: 'git',
        score: 132,
      },
      {
        id: 'git-diff',
        kind: 'subcommand',
        label: 'git diff',
        insertText: 'diff',
        matchText: 'diff',
        detail: 'git',
        score: 128,
      },
      {
        id: 'git-log',
        kind: 'subcommand',
        label: 'git log --oneline -10',
        insertText: 'log --oneline -10',
        matchText: 'log',
        detail: 'git',
        score: 126,
      },
      {
        id: 'git-add',
        kind: 'subcommand',
        label: 'git add .',
        insertText: 'add .',
        matchText: 'add',
        detail: 'git',
        score: 124,
      },
      {
        id: 'git-checkout',
        kind: 'snippet',
        label: 'git checkout -b ""',
        insertText: 'checkout -b ""',
        matchText: 'checkout',
        detail: 'snippet',
        score: 122,
        nextCursorOffset: 'checkout -b "'.length,
      },
      {
        id: 'git-commit',
        kind: 'snippet',
        label: 'git commit -m ""',
        insertText: 'commit -m ""',
        matchText: 'commit',
        detail: 'snippet',
        score: 120,
        nextCursorOffset: 'commit -m "'.length,
      },
    ]);
  }

  if (context.command === 'pnpm') {
    return createMatchedTokenSuggestions(
      context,
      profile.scripts.map((script, index) => ({
        id: `pnpm-${script}`,
        kind: 'script' as const,
        label: `pnpm ${script}`,
        insertText: script,
        matchText: script,
        detail: 'script',
        score: 130 - index,
      })),
    );
  }

  if (context.command === 'ls') {
    return createMatchedTokenSuggestions(context, [
      {
        id: 'ls-la',
        kind: 'command',
        label: 'ls -la',
        insertText: '-la',
        matchText: '-la',
        detail: 'flag',
        score: 124,
      },
    ]);
  }

  return createMatchedTokenSuggestions(
    context,
    STATIC_COMMAND_TOKEN_SUGGESTIONS[context.command] ?? [],
  );
};

export const terminalPathSuggestionProvider: TerminalSuggestionProvider = ({
  context,
  profile,
}) => {
  if (!context.command) {
    return [];
  }

  const minimumTokenIndex = PATH_SUGGESTION_MIN_TOKEN_INDEX[context.command] ?? 1;

  if (context.activeTokenIndex < minimumTokenIndex && !context.activeTokenPrefix) {
    return [];
  }

  const pathItems = getPathItems(context.command, profile);

  if (!pathItems.length) {
    return [];
  }

  return pathItems
    .map(({ item, detail }, index) => ({
      suggestion: createTerminalTokenSuggestion(context, {
        id: `path-${context.command}-${item}`,
        kind: 'path',
        label: buildTerminalPathSuggestionLabel(context, item),
        insertText: item,
        detail,
        score: 118 - index,
      }),
      matchText: item,
      label: buildTerminalPathSuggestionLabel(context, item),
    }))
    .filter((item) => matchesTerminalSuggestionPrefix(context, item))
    .map((item) => item.suggestion);
};

export const terminalSnippetSuggestionProvider: TerminalSuggestionProvider = ({
  context,
}) => {
  if (!normalizeText(context.value)) {
    return [];
  }

  if (context.activeTokenIndex > 0) {
    return [];
  }

  if (context.tokens.length > 1 && context.activeTokenIndex === 0) {
    return [];
  }

  return TERMINAL_SNIPPET_SUGGESTIONS
    .map((item) => ({
      suggestion: createTerminalFullLineSuggestion(context, {
        id: `snippet-${item.id}`,
        kind: 'snippet',
        label: item.label,
        detail: item.detail,
        score: item.score,
        nextCursorOffset: item.cursorOffset,
      }),
      matchText: item.matchText,
      label: item.label,
    }))
    .filter((item) => matchesTerminalSuggestionPrefix(context, item))
    .map((item) => item.suggestion);
};

export const DEFAULT_TERMINAL_SUGGESTION_PROVIDERS: readonly TerminalSuggestionProvider[] = [
  terminalHistorySuggestionProvider,
  terminalRootSuggestionProvider,
  terminalCommandTokenSuggestionProvider,
  terminalPathSuggestionProvider,
  terminalSnippetSuggestionProvider,
];

export function getTerminalSuggestions(
  request: TerminalSuggestionRequest,
  options?: TerminalSuggestionEngineOptions,
): TerminalSuggestion[] {
  const profile = normalizeTerminalWorkspaceProfile(request.profile);
  const context = parseTerminalSuggestionContext(
    request.value,
    request.cursor,
  );
  const maxItems = request.maxItems ?? DEFAULT_MAX_TERMINAL_SUGGESTIONS;
  const providers = options?.providers ?? DEFAULT_TERMINAL_SUGGESTION_PROVIDERS;

  return dedupeSuggestions(
    providers.flatMap((provider) => provider({ request, profile, context })),
  )
    .sort(compareSuggestions)
    .slice(0, maxItems);
}

export function autocompleteTerminalInput(
  state: TerminalEditorState,
  requestOptions?: Omit<TerminalSuggestionRequest, 'value' | 'cursor'>,
  options?: TerminalSuggestionEngineOptions,
): TerminalEditorState {
  const suggestion = getTerminalSuggestions(
    {
      value: state.value,
      cursor: state.cursor,
      history: requestOptions?.history,
      profile: requestOptions?.profile,
      maxItems: 1,
    },
    options,
  )[0];

  return suggestion ? applyTerminalSuggestion(state, suggestion) : state;
}

export function applyTerminalSuggestion(
  state: TerminalEditorState,
  suggestion: TerminalSuggestion,
): TerminalEditorState {
  const value =
    state.value.slice(0, suggestion.replaceFrom)
    + suggestion.insertText
    + state.value.slice(suggestion.replaceTo);

  return {
    value,
    cursor: suggestion.nextCursor,
    historyIndex: null,
    draft: '',
  };
}

export function createTerminalFullLineSuggestion(
  context: ParsedTerminalSuggestionContext,
  input: TerminalFullLineSuggestionSpec,
): TerminalSuggestion {
  const insertText = input.insertText ?? input.label;

  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    insertText,
    replaceFrom: 0,
    replaceTo: input.replaceTo ?? context.value.length,
    nextCursor: input.nextCursorOffset ?? insertText.length,
    score: input.score,
    detail: input.detail,
  };
}

export function createTerminalTokenSuggestion(
  context: ParsedTerminalSuggestionContext,
  input: TerminalTokenSuggestionSpec,
): TerminalSuggestion {
  const replaceFrom = input.replaceFrom ?? context.activeReplaceFrom;
  const replaceTo = input.replaceTo ?? context.activeReplaceTo;

  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    insertText: input.insertText,
    replaceFrom,
    replaceTo,
    nextCursor: replaceFrom + (input.nextCursorOffset ?? input.insertText.length),
    score: input.score,
    detail: input.detail,
  };
}

export function matchesTerminalSuggestionPrefix(
  context: ParsedTerminalSuggestionContext,
  input: {
    label: string;
    matchText?: string;
  },
): boolean {
  const prefix = normalizeText(
    context.activeTokenIndex === 0 && context.tokens.length <= 1
      ? context.value.trim()
      : context.activeTokenPrefix,
  );

  if (!prefix) return true;

  const matchText = normalizeText(input.matchText ?? input.label);
  const label = normalizeText(input.label);

  return matchText.startsWith(prefix) || label.startsWith(prefix);
}

export function parseTerminalSuggestionContext(
  value: string,
  cursor = value.length,
): ParsedTerminalSuggestionContext {
  const clampedCursor = clampTerminalCursor(cursor, value.length);
  const tokens = tokenizeTerminalInput(value);
  const activeToken = tokens.find(
    (token) => token.from <= clampedCursor && clampedCursor <= token.to,
  );
  const atTokenBoundary =
    clampedCursor === 0 || /\s/.test(value[clampedCursor - 1] ?? '');
  const activeTokenIndex =
    activeToken
      ? tokens.indexOf(activeToken)
      : tokens.filter((token) => token.to <= clampedCursor).length;
  const activeReplaceFrom = activeToken?.from ?? clampedCursor;
  const activeReplaceTo = activeToken?.to ?? clampedCursor;
  const activeTokenText = activeToken?.text ?? '';
  const activeTokenPrefix = activeToken
    ? value.slice(activeToken.from, clampedCursor)
    : '';

  return {
    value,
    cursor: clampedCursor,
    tokens,
    command: tokens[0]?.text ?? null,
    activeTokenIndex,
    activeTokenPrefix,
    activeTokenText,
    activeReplaceFrom,
    activeReplaceTo,
    atTokenBoundary,
  };
}

function createMatchedTokenSuggestions(
  context: ParsedTerminalSuggestionContext,
  values: readonly TerminalStaticTokenSuggestionSpec[],
): TerminalSuggestion[] {
  return values
    .filter((item) => matchesTerminalSuggestionPrefix(context, item))
    .map((item) =>
      createTerminalTokenSuggestion(context, {
        id: item.id,
        kind: item.kind,
        label: item.label,
        insertText: item.insertText,
        detail: item.detail,
        score: item.score,
        nextCursorOffset: item.nextCursorOffset,
      }),
    );
}

function matchesHistory(value: string, input: string): boolean {
  if (!input) return true;
  return value.toLowerCase().startsWith(input);
}

function compareSuggestions(a: TerminalSuggestion, b: TerminalSuggestion): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.label.localeCompare(b.label);
}

function dedupeSuggestions(values: readonly TerminalSuggestion[]): TerminalSuggestion[] {
  const seen = new Set<string>();
  const deduped: TerminalSuggestion[] = [];

  for (const item of values) {
    const key = `${item.kind}:${item.label}:${item.insertText}:${item.replaceFrom}:${item.replaceTo}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function getPathItems(
  command: string,
  profile: TerminalWorkspaceProfile,
): Array<{ item: string; detail: 'file' | 'dir' }> {
  const scope = PATH_SUGGESTION_COMMAND_SCOPES[command];

  if (!scope) return [];

  if (scope === 'file') {
    return profile.files.map((item) => ({ item, detail: 'file' as const }));
  }

  if (scope === 'dir') {
    return profile.directories.map((item) => ({ item: `${item}/`, detail: 'dir' as const }));
  }

  return [
    ...profile.files.map((item) => ({ item, detail: 'file' as const })),
    ...profile.directories.map((item) => ({ item: `${item}/`, detail: 'dir' as const })),
  ];
}

function buildTerminalPathSuggestionLabel(
  context: ParsedTerminalSuggestionContext,
  item: string,
): string {
  return (
    context.value.slice(0, context.activeReplaceFrom)
    + item
    + context.value.slice(context.activeReplaceTo)
  ).trimEnd();
}

function tokenizeTerminalInput(value: string): TerminalToken[] {
  const tokens: TerminalToken[] = [];
  let start = -1;
  let quote: 'single' | 'double' | null = null;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index] ?? '';

    if (start === -1) {
      if (/\s/.test(char)) continue;
      start = index;
    }

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && quote !== 'single') {
      escaped = true;
      continue;
    }

    if (quote === null) {
      if (char === "'") {
        quote = 'single';
        continue;
      }

      if (char === '"') {
        quote = 'double';
        continue;
      }

      if (/\s/.test(char)) {
        tokens.push({
          text: value.slice(start, index),
          from: start,
          to: index,
        });
        start = -1;
      }
      continue;
    }

    if (quote === 'single' && char === "'") {
      quote = null;
      continue;
    }

    if (quote === 'double' && char === '"') {
      quote = null;
    }
  }

  if (start !== -1) {
    tokens.push({
      text: value.slice(start),
      from: start,
      to: value.length,
    });
  }

  return tokens;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function getRootScriptScore(script: string, index: number): number {
  const scoreMap: Record<string, number> = {
    dev: 117,
    test: 115,
    build: 114,
    lint: 111,
    typecheck: 109,
    verify: 107,
  };

  return scoreMap[script] ?? 105 - index;
}
