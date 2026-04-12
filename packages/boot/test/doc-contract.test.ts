import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRuntimeDoc(): string {
  return readFileSync(resolve(__dirname, '../../../docs/runtime.md'), 'utf-8');
}

describe('boot docs', () => {
  it('documents the shared artifact bootstrap ownership boundary', () => {
    const doc = readRuntimeDoc();

    expect(doc).toContain('@floegence/floe-webapp-boot');
    expect(doc).toContain('ArtifactSource');
    expect(doc).toContain('createEntryControlplaneArtifactSource');
    expect(doc).toContain('createProxyRuntimeTunnelReconnectConfig');
    expect(doc).toContain('@floegence/flowersec-core/proxy');
  });
});
