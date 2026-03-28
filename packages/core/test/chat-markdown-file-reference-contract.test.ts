import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../..');

function read(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('chat markdown file reference contract', () => {
  it('defines a shared file-reference chip style on semantic chat tokens', () => {
    const styles = read('packages/core/src/components/chat/styles/chat.css');

    expect(styles).toContain('.chat-md-link.chat-md-file-ref {');
    expect(styles).toContain('.chat-md-link.chat-md-file-ref:hover {');
    expect(styles).toContain('.chat-md-link.chat-md-file-ref:focus-visible {');
    expect(styles).toContain('.chat-md-file-ref-prefix,');
    expect(styles).toContain('.chat-md-file-ref-name {');
    expect(styles).toContain('.chat-md-file-ref-line {');
    expect(styles).toContain('background-color: color-mix(in srgb, var(--muted) 68%, transparent);');
    expect(styles).toContain('border-color: color-mix(in srgb, var(--primary) 34%, var(--border));');
    expect(styles).toContain('color: var(--muted-foreground);');
    expect(styles).toContain('cursor: pointer;');
    expect(styles).not.toContain('.chat-md-link.chat-md-file-ref {\n  background: transparent;');
    expect(styles).not.toContain('#57a5ff');
  });
});
