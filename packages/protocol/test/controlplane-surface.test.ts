import { describe, expect, it } from 'vitest';

describe('protocol controlplane surface', () => {
  it('does not expose removed Flowersec subpath compatibility exports', async () => {
    const local = await import('../src/controlplane');
    const pkg = await import('../src/index');
    expect(local).not.toHaveProperty('assertConnectArtifact');
    expect(pkg).not.toHaveProperty('requestChannelGrant');
    expect(pkg).not.toHaveProperty('requestEntryChannelGrant');
  });
});
