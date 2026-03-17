import { describe, expect, it } from 'vitest';
import { runTerminalMockCommand } from '../src/terminal/mockRuntime';
import { DEFAULT_TERMINAL_WORKSPACE_PROFILE } from '../src/terminal/workspaceProfile';

describe('terminal mock runtime', () => {
  it('should resolve common terminal commands from the shared mock runtime', () => {
    expect(runTerminalMockCommand('pwd').lines[0]?.content).toBe(
      DEFAULT_TERMINAL_WORKSPACE_PROFILE.cwd,
    );
    expect(runTerminalMockCommand('pnpm build').lines[0]?.content).toContain(
      "completed mock run for script 'build'",
    );
    expect(runTerminalMockCommand('cat package.json').lines[0]?.content).toContain(
      '"scripts"',
    );
    expect(runTerminalMockCommand('uname -a').lines[0]?.content).toContain(
      'Darwin',
    );
    expect(runTerminalMockCommand('echo "$PATH"').lines[0]?.content).toContain(
      '/usr/bin',
    );
    expect(runTerminalMockCommand('vim README.md').lines[0]?.content).toContain(
      'README.md',
    );
    expect(
      runTerminalMockCommand("sed -n '1,20p' README.md").lines[0]?.content,
    ).toContain('# Floe Webapp');
    expect(
      runTerminalMockCommand("awk '{print $1}' package.json").lines[0]?.content,
    ).toContain('"name":');
    expect(
      runTerminalMockCommand('head -n 20 README.md').lines[0]?.content,
    ).toContain('# Floe Webapp');
    expect(
      runTerminalMockCommand('tail -n 20 package.json').lines[0]?.content,
    ).toContain('"build"');
    expect(
      runTerminalMockCommand('less README.md').lines[0]?.content,
    ).toContain('(END)');
    expect(
      runTerminalMockCommand('wc -l README.md').lines[0]?.content,
    ).toContain('2 README.md');
    expect(
      runTerminalMockCommand('grep -n "scripts" package.json').lines[0]?.content,
    ).toContain('3:  "scripts": {');
    expect(
      runTerminalMockCommand('mkdir -p src/components').lines[0]?.content,
    ).toContain('created directory src/components');
    expect(
      runTerminalMockCommand('touch .env.local').lines[0]?.content,
    ).toContain('updated timestamp for .env.local');
    expect(
      runTerminalMockCommand('chmod +x scripts/dev.mjs').lines[0]?.content,
    ).toContain('mode +x applied to scripts/dev.mjs');
    expect(
      runTerminalMockCommand('sort README.md').lines[0]?.content,
    ).toContain('# Floe Webapp');
    expect(
      runTerminalMockCommand('cut -d ":" -f 1 package.json').lines[0]?.content,
    ).toContain('"scripts"');
    expect(
      runTerminalMockCommand('curl -I https://example.com').lines[0]?.content,
    ).toContain('HTTP/2 200');
    expect(
      runTerminalMockCommand('tar -czf floe-webapp.tgz packages/').lines[0]?.content,
    ).toContain('created archive floe-webapp.tgz');
    expect(
      runTerminalMockCommand('ssh user@example.com').lines[0]?.content,
    ).toContain('Connected to user@example.com');
    expect(
      runTerminalMockCommand('scp README.md user@example.com:/tmp/').lines[0]?.content,
    ).toContain('README.md');
  });

  it('should keep clear and error behavior deterministic', () => {
    expect(runTerminalMockCommand('clear').clear).toBe(true);
    expect(runTerminalMockCommand('missing').lines[0]?.type).toBe('error');
  });
});
