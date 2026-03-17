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

export interface TerminalWorkspaceProfile {
  cwd: string;
  files: readonly string[];
  directories: readonly string[];
  scripts: readonly string[];
}

export interface TerminalRuntimeOptions {
  profile?: Partial<TerminalWorkspaceProfile>;
  resolveNow?: () => string;
}

export type TerminalRuntimeAdapter = (
  input: string,
  options?: TerminalRuntimeOptions,
) => TerminalCommandResult;

export type TerminalSuggestionKind =
  | 'history'
  | 'command'
  | 'subcommand'
  | 'script'
  | 'path'
  | 'snippet';

export interface TerminalSuggestion {
  id: string;
  kind: TerminalSuggestionKind;
  label: string;
  insertText: string;
  replaceFrom: number;
  replaceTo: number;
  nextCursor: number;
  score: number;
  detail?: string;
}

export interface TerminalSuggestionRequest {
  value: string;
  cursor?: number;
  history?: readonly string[];
  profile?: Partial<TerminalWorkspaceProfile>;
  maxItems?: number;
}
