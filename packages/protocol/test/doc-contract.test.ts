import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readProtocolDoc(): string {
  return readFileSync(resolve(__dirname, '../../../docs/protocol.md'), 'utf-8');
}

describe('protocol docs', () => {
  it('documents the canonical connect artifact flow and public helpers', () => {
    const doc = readProtocolDoc();

    expect(doc).toContain('ArtifactSource');
    expect(doc).toContain('const source = createControlplaneArtifactSource');
    expect(doc).toContain('@floegence/floe-webapp-boot');
    expect(doc).toContain('@floegence/flowersec-core@2.5.1');
    expect(doc).toContain('sole retry/backoff owner');
    expect(doc).toContain('ConnectionController');
    expect(doc).toContain('replaceConnection()');
    expect(doc).toContain('decodeResponse');
    expect(doc).not.toContain('@floegence/flowersec-core/controlplane');
    expect(doc).not.toContain('requestChannelGrant');
    expect(doc).not.toContain('requestEntryChannelGrant');
    expect(doc).toContain('HTTPS by default');
    expect(doc).toContain('allowLoopbackHTTP: true');
    expect(doc).toContain('connect_artifact');
    expect(doc).toContain('/v1/connect/artifact');
    expect(doc).toContain('/v1/connect/artifact/entry');
    expect(doc).toContain('probeLiveness');
    expect(doc).toContain('notifyBestEffort');
    expect(doc).toContain('ProtocolNotConnectedError');
    expect(doc).toContain('RpcError');
    expect(doc).not.toContain('unrestricted plaintext');
  });
});
