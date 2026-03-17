import type { TerminalWorkspaceProfile } from './types';

export const DEFAULT_TERMINAL_WORKSPACE_PROFILE: TerminalWorkspaceProfile = {
  cwd: '/workspace/floe-webapp',
  files: [
    'README.md',
    'package.json',
    'pnpm-lock.yaml',
    'tsconfig.json',
    '.env.local',
    'scripts/dev.mjs',
  ],
  directories: ['apps', 'packages', 'scripts', 'docs', 'src'],
  scripts: ['dev', 'build', 'test', 'lint', 'typecheck', 'verify'],
};

export function normalizeTerminalWorkspaceProfile(
  profile?: Partial<TerminalWorkspaceProfile>,
): TerminalWorkspaceProfile {
  return {
    cwd: profile?.cwd ?? DEFAULT_TERMINAL_WORKSPACE_PROFILE.cwd,
    files: uniqueStrings(profile?.files ?? DEFAULT_TERMINAL_WORKSPACE_PROFILE.files),
    directories: uniqueStrings(
      profile?.directories ?? DEFAULT_TERMINAL_WORKSPACE_PROFILE.directories,
    ),
    scripts: uniqueStrings(profile?.scripts ?? DEFAULT_TERMINAL_WORKSPACE_PROFILE.scripts),
  };
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}
