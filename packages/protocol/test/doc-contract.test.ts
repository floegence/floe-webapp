import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readProtocolDoc(): string {
  return readFileSync(resolve(__dirname, '../../../docs/protocol.md'), 'utf-8');
}

describe('protocol docs', () => {
  it('documents the canonical connect artifact flow and public helpers', () => {
    const doc = readProtocolDoc();

    expect(doc).toContain('artifactControlplane');
    expect(doc).toContain('@floegence/flowersec-core/controlplane');
    expect(doc).toContain('requestConnectArtifact');
    expect(doc).toContain('requestEntryConnectArtifact');
    expect(doc).toContain('connect_artifact');
    expect(doc).toContain('/v1/connect/artifact');
    expect(doc).toContain('/v1/connect/artifact/entry');
  });
});
