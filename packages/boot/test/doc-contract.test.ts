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
    expect(doc).toContain('ArtifactSource');
    expect(doc).toContain('createControlplaneArtifactSource');
    expect(doc).toContain('@floegence/flowersec-core@2.0.0');
    expect(doc).toContain('HTTPS is required by default');
    expect(doc).toContain('allowLoopbackHTTP: true');
    expect(doc).toContain('createProxyRuntimeTunnelConnectionConfig');
    expect(doc).toContain('@floegence/flowersec-core/proxy');
    expect(doc).toContain('No option permits reuse of a consumed artifact lease.');
    expect(doc).not.toContain('allowAutoReconnect');
    expect(doc).not.toContain('createFixedArtifactSource');
  });

  it('documents bounded single-request SSE ownership', () => {
    const doc = readRuntimeDoc();

    expect(doc).toContain('fetchServerSentEvents');
    expect(doc).toContain('text/event-stream');
    expect(doc).toContain('performs exactly one fetch');
    expect(doc).toContain('does not parse application JSON or reconnect');
  });
});
