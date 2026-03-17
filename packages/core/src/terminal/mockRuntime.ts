import type { TerminalCommandResult, TerminalRuntimeAdapter } from './types';
import { normalizeTerminalWorkspaceProfile } from './workspaceProfile';

const MOCK_FILE_CONTENTS: Readonly<Record<string, string>> = {
  'README.md': '# Floe Webapp\nTerminal-first demo workspace with a mobile keyboard.',
  'package.json':
    '{\n  "name": "floe-webapp",\n  "scripts": {\n    "dev": "node scripts/dev.mjs",\n    "build": "pnpm -r build"\n  }\n}',
  'pnpm-lock.yaml':
    'lockfileVersion: "9.0"\npackages:\n  packages/core:\n    version: 0.35.7\n  packages/protocol:\n    version: 0.35.7',
  'tsconfig.json':
    '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "ESNext"\n  }\n}',
  '.env.local': 'VITE_FLOE_CONTROLPLANE_BASE_URL=https://controlplane.example.com\nVITE_FLOE_ENDPOINT_ID=demo-endpoint',
  'scripts/dev.mjs':
    "import { spawn } from 'node:child_process';\n\nspawn('pnpm', ['--filter', '@floegence/floe-webapp-demo', 'dev'], { stdio: 'inherit' });",
};

export const runTerminalMockCommand: TerminalRuntimeAdapter = (
  input,
  options,
): TerminalCommandResult => {
  const profile = normalizeTerminalWorkspaceProfile(options?.profile);
  const resolveNow = options?.resolveNow ?? (() => new Date().toString());
  const value = input.trim();

  if (!value) {
    return {
      clear: false,
      lines: [],
    };
  }

  if (value === 'help') {
    return output(
      [
        'Available commands:',
        'pwd, ls, ls -la, cat <file>, less <file>, head -n <count> <file>, tail -n <count> <file>, wc -l|-w|-c <file>, mkdir -p <dir>, touch <file>, chmod <mode> <target>, clear, date, echo <text>, echo "$PATH", echo "$SHELL"',
        'git status, git diff, git log --oneline -10, git add ., git checkout -b <branch>, git commit -m <message>',
        `pnpm ${profile.scripts.join(', pnpm ')}`,
        'find . -name <pattern>, grep -R <pattern> src/, grep -n <pattern> <file>, grep -i <pattern> <file>, sort <file>, cut <options> <file>, uname -a, vim <file>, sed -n <range> <file>, awk <program> <file>',
        'curl -I|-L <url>, tar -czf|-xzf|-tf <archive>, ssh <host>, scp <src> <dest>',
      ].join('\n'),
    );
  }

  if (value === 'pwd') {
    return output(profile.cwd);
  }

  if (value === 'ls' || value === 'ls -la') {
    const items = [...profile.directories, ...profile.files];
    return output(
      value === 'ls'
        ? items.join('  ')
        : [
            ...profile.directories.map((item) => `drwxr-xr-x  ${item}`),
            ...profile.files.map((item) => `-rw-r--r--  ${item}`),
          ].join('\n'),
    );
  }

  if (value.startsWith('ls ')) {
    const target = value.slice(3).trim().replace(/\/$/, '');
    if (profile.directories.includes(target)) {
      if (target === 'packages') {
        return output('boot  core  init  protocol');
      }
      if (target === 'apps') {
        return output('demo');
      }
      if (target === 'src') {
        return output('app.ts  widgets  terminal  components');
      }
      return output(`${target}/`);
    }
  }

  if (value === 'clear') {
    return {
      clear: true,
      lines: [],
    };
  }

  if (value === 'date') {
    return output(resolveNow());
  }

  if (value === 'echo "$PATH"') {
    return output('/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin');
  }

  if (value === 'echo "$SHELL"') {
    return output('/bin/zsh');
  }

  if (value.startsWith('echo ')) {
    return output(value.slice(5));
  }

  if (value === 'uname -a') {
    return output('Darwin floe-webapp.local 24.4.0 Darwin Kernel Version 24.4.0 arm64');
  }

  if (value === 'uname -sr') {
    return output('Darwin 24.4.0');
  }

  if (value === 'uname -m') {
    return output('arm64');
  }

  if (value === 'git status') {
    return output('On branch main\nnothing to commit, working tree clean');
  }

  if (value === 'git diff') {
    return output('diff --git a/packages/core/src/terminal/suggestionEngine.ts b/packages/core/src/terminal/suggestionEngine.ts\nindex 1234567..89abcde 100644');
  }

  if (value === 'git log --oneline -10' || value === 'git log --oneline') {
    return output('307a37e merge mobile keyboard\nc942cb5 add terminal-first mobile keyboard\n37fa316 release 0.35.7');
  }

  if (value === 'git add .') {
    return output('staged tracked changes');
  }

  const checkoutMatch = value.match(/^git checkout -b\s+(.+)$/);
  if (checkoutMatch) {
    return output(`Switched to a new branch '${checkoutMatch[1]}'`);
  }

  const commitMatch = value.match(/^git commit -m\s+"(.+)"$/);
  if (commitMatch) {
    return output(`[main abc1234] ${commitMatch[1]}\n 3 files changed, 42 insertions(+), 8 deletions(-)`);
  }

  const catMatch = value.match(/^cat\s+(.+)$/);
  if (catMatch) {
    const content = getMockFileContent(profile.files, catMatch[1] ?? '');
    if (content) {
      return output(content);
    }
  }

  const vimMatch = value.match(/^vim\s+(.+)$/);
  if (vimMatch) {
    const target = normalizePathToken(vimMatch[1] ?? '');
    const content = getMockFileContent(profile.files, target);
    if (content) {
      return output(formatVimSession(target, content));
    }
  }

  const pnpmMatch = value.match(/^pnpm\s+([a-z0-9:-]+)$/i);
  if (pnpmMatch && profile.scripts.includes(pnpmMatch[1] ?? '')) {
    return output(`> pnpm ${pnpmMatch[1]}\ncompleted mock run for script '${pnpmMatch[1]}'`);
  }

  const findMatch = value.match(/^find \. -name\s+(.+)$/);
  if (findMatch) {
    return output(['./README.md', './packages/core/src/terminal/suggestionEngine.ts'].join('\n'));
  }

  const grepMatch = value.match(/^grep -R\s+(.+)\s+src\/?$/);
  if (grepMatch) {
    return output('src/terminal/suggestionEngine.ts:getTerminalSuggestions');
  }

  const grepFileMatch = value.match(/^grep\s+(-n|-i)\s+(.+?)\s+(.+)$/);
  if (grepFileMatch) {
    const flag = grepFileMatch[1] ?? '';
    const pattern = normalizeSearchPattern(grepFileMatch[2] ?? '');
    const target = normalizePathToken(grepFileMatch[3] ?? '');
    const content = getMockFileContent(profile.files, target);

    if (content) {
      return output(runMockGrep(content, target, pattern, flag));
    }
  }

  const lessMatch = value.match(/^less\s+(.+)$/);
  if (lessMatch) {
    const target = normalizePathToken(lessMatch[1] ?? '');
    const content = getMockFileContent(profile.files, target);

    if (content) {
      return output(`${content}\n(END)`);
    }
  }

  const mkdirMatch = value.match(/^mkdir\s+-p\s+(.+)$/);
  if (mkdirMatch) {
    return output(`created directory ${normalizePathToken(mkdirMatch[1] ?? '')}`);
  }

  const touchMatch = value.match(/^touch\s+(.+)$/);
  if (touchMatch) {
    return output(`updated timestamp for ${normalizePathToken(touchMatch[1] ?? '')}`);
  }

  const chmodMatch = value.match(/^chmod\s+(.+?)\s+(.+)$/);
  if (chmodMatch) {
    return output(
      `mode ${chmodMatch[1] ?? ''} applied to ${normalizePathToken(chmodMatch[2] ?? '')}`,
    );
  }

  const headMatch = value.match(/^head(?:\s+-n\s+(\d+))?(?:\s+-c\s+(\d+))?\s+(.+)$/);
  if (headMatch) {
    const lineCount = Number(headMatch[1] ?? 10);
    const charCount = headMatch[2] ? Number(headMatch[2]) : null;
    const target = normalizePathToken(headMatch[3] ?? '');
    const content = getMockFileContent(profile.files, target);

    if (content) {
      return output(
        charCount === null
          ? sliceFirstLines(content, lineCount)
          : content.slice(0, Math.max(0, charCount)),
      );
    }
  }

  const tailMatch = value.match(/^tail(?:\s+-n\s+(\d+))?(?:\s+-c\s+(\d+))?\s+(.+)$/);
  if (tailMatch) {
    const lineCount = Number(tailMatch[1] ?? 10);
    const charCount = tailMatch[2] ? Number(tailMatch[2]) : null;
    const target = normalizePathToken(tailMatch[3] ?? '');
    const content = getMockFileContent(profile.files, target);

    if (content) {
      return output(
        charCount === null
          ? sliceLastLines(content, lineCount)
          : content.slice(Math.max(0, content.length - Math.max(0, charCount))),
      );
    }
  }

  const wcMatch = value.match(/^wc\s+(-[lwc])\s+(.+)$/);
  if (wcMatch) {
    const flag = wcMatch[1] ?? '';
    const target = normalizePathToken(wcMatch[2] ?? '');
    const content = getMockFileContent(profile.files, target);

    if (content) {
      return output(runMockWordCount(content, target, flag));
    }
  }

  const sortMatch = value.match(/^sort(?:\s+(-u|-r))?\s+(.+)$/);
  if (sortMatch) {
    const flag = sortMatch[1] ?? '';
    const target = normalizePathToken(sortMatch[2] ?? '');
    const content = getMockFileContent(profile.files, target);

    if (content) {
      return output(runMockSort(content, flag));
    }
  }

  const cutMatch = value.match(/^cut\s+(.+)\s+(.+)$/);
  if (cutMatch) {
    const optionsText = cutMatch[1] ?? '';
    const target = normalizePathToken(cutMatch[2] ?? '');
    const content = getMockFileContent(profile.files, target);

    if (content) {
      return output(runMockCut(content, optionsText));
    }
  }

  const sedPrintMatch = value.match(/^sed -n '(\d+),(\d+)p'\s+(.+)$/);
  if (sedPrintMatch) {
    const start = Number(sedPrintMatch[1] ?? 1);
    const end = Number(sedPrintMatch[2] ?? start);
    const target = normalizePathToken(sedPrintMatch[3] ?? '');
    const content = getMockFileContent(profile.files, target);

    if (content) {
      return output(sliceLineRange(content, start, end));
    }
  }

  if (value === "sed -E 's/floe/Floe/g' README.md") {
    return output('# Floe Webapp\nTerminal-first demo workspace with a mobile keyboard.');
  }

  if (value === "awk '{print $1}' package.json") {
    return output(['{', '"name":', '"scripts":', '"dev":', '"build":', '}', '}'].join('\n'));
  }

  if (value === "awk 'NR<=20 {print}' README.md") {
    return output('# Floe Webapp\nTerminal-first demo workspace with a mobile keyboard.');
  }

  if (value === "awk '/scripts/ {print NR \":\" $0}' package.json") {
    return output('3:  "scripts": {');
  }

  if (value === 'curl -I https://example.com') {
    return output(
      [
        'HTTP/2 200',
        'content-type: text/html; charset=utf-8',
        'cache-control: max-age=300',
      ].join('\n'),
    );
  }

  if (value === 'curl -L https://example.com') {
    return output('<!doctype html>\n<html>\n  <body>Example Domain</body>\n</html>');
  }

  if (value === 'curl -H "Authorization: Bearer " https://api.example.com') {
    return output('{"error":"missing bearer token"}');
  }

  if (value === 'tar -czf floe-webapp.tgz packages/') {
    return output('created archive floe-webapp.tgz from packages/');
  }

  if (value === 'tar -xzf floe-webapp.tgz') {
    return output('extracted archive floe-webapp.tgz');
  }

  if (value === 'tar -tf floe-webapp.tgz') {
    return output(['packages/', 'packages/core/', 'packages/protocol/'].join('\n'));
  }

  if (value === 'ssh user@example.com') {
    return output('Connected to user@example.com\nLast login: Tue Mar 17 22:00:00 2026');
  }

  if (value === 'ssh -p 22 user@example.com') {
    return output('Connected to user@example.com on port 22');
  }

  if (value === 'scp README.md user@example.com:/tmp/') {
    return output('README.md                                    100%   58B   1.2KB/s   00:00');
  }

  if (value === 'scp -r scripts/ user@example.com:/tmp/scripts/') {
    return output('scripts/                                     100% copied recursively');
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
};

function output(content: string): TerminalCommandResult {
  return {
    clear: false,
    lines: [
      {
        type: 'output',
        content,
      },
    ],
  };
}

function getMockFileContent(
  files: readonly string[],
  target: string,
): string | null {
  const normalizedTarget = normalizePathToken(target);

  if (!normalizedTarget || !files.includes(normalizedTarget)) {
    return null;
  }

  return (
    MOCK_FILE_CONTENTS[normalizedTarget]
    ?? `// Mock contents for ${normalizedTarget}\n// Generated by the shared terminal runtime.`
  );
}

function normalizePathToken(value: string): string {
  return value.trim().replace(/\/$/, '');
}

function normalizeSearchPattern(value: string): string {
  const trimmed = value.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"));

  return quoted ? trimmed.slice(1, -1) : trimmed;
}

function sliceFirstLines(content: string, count: number): string {
  return content.split('\n').slice(0, Math.max(0, count)).join('\n');
}

function sliceLastLines(content: string, count: number): string {
  return content.split('\n').slice(-Math.max(0, count)).join('\n');
}

function sliceLineRange(content: string, start: number, end: number): string {
  return content
    .split('\n')
    .slice(Math.max(0, start - 1), Math.max(start - 1, end))
    .join('\n');
}

function formatVimSession(target: string, content: string): string {
  return `"${target}" ${content.split('\n').length}L, ${content.length}B\n~\nMock vim session opened for ${target}`;
}

function runMockWordCount(
  content: string,
  target: string,
  flag: string,
): string {
  if (flag === '-l') {
    return `${content.split('\n').length} ${target}`;
  }

  if (flag === '-w') {
    return `${content.trim().split(/\s+/).filter(Boolean).length} ${target}`;
  }

  return `${content.length} ${target}`;
}

function runMockGrep(
  content: string,
  target: string,
  pattern: string,
  flag: string,
): string {
  if (!pattern) {
    return `${target}: pattern is empty`;
  }

  const query = flag === '-i' ? pattern.toLowerCase() : pattern;
  const matches = content
    .split('\n')
    .map((line, index) => ({ line, index }))
    .filter(({ line }) =>
      (flag === '-i' ? line.toLowerCase() : line).includes(query),
    )
    .map(({ line, index }) => (flag === '-n' ? `${index + 1}:${line}` : line));

  return matches.join('\n') || `${target}: no matches`;
}

function runMockSort(content: string, flag: string): string {
  const lines = content.split('\n');
  const sorted = [...lines].sort((a, b) => a.localeCompare(b));

  if (flag === '-u') {
    return [...new Set(sorted)].join('\n');
  }

  if (flag === '-r') {
    return sorted.reverse().join('\n');
  }

  return sorted.join('\n');
}

function runMockCut(content: string, optionsText: string): string {
  const delimiterMatch = optionsText.match(/-d\s+"([^"]+)"/);
  const fieldMatch = optionsText.match(/-f\s+(\d+)/);
  const delimiter = delimiterMatch?.[1] ?? '\t';
  const fieldIndex = Math.max(1, Number(fieldMatch?.[1] ?? 1)) - 1;

  return content
    .split('\n')
    .map((line) => line.split(delimiter)[fieldIndex] ?? '')
    .join('\n');
}
