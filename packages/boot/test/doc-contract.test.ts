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
    expect(doc).toContain("kind: 'once'");
    expect(doc).toContain("kind: 'refreshable'");
    expect(doc).toContain('createControlplaneArtifactSource');
    expect(doc).toContain('@floegence/flowersec-core@0.27.0');
    expect(doc).toContain('HTTPS by default');
    expect(doc).toContain('allowLoopbackHTTP: true');
    expect(doc).toContain('createProxyRuntimeTunnelReconnectConfig');
    expect(doc).toContain('@floegence/flowersec-core/proxy');
    expect(doc).toContain('There is no opt-in that permits reusing the same artifact.');
    expect(doc).not.toContain('allowAutoReconnect');
    expect(doc).not.toContain('createFixedArtifactSource');
  });
});
