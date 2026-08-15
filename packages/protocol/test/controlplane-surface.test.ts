import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('protocol controlplane surface', () => {
  it('keeps controlplane acquisition exclusively in Boot', async () => {
    const pkg = await import('../src/index');
    expect(pkg).not.toHaveProperty('requestConnectArtifact');
    expect(pkg).not.toHaveProperty('requestEntryConnectArtifact');
    expect(existsSync(resolve(__dirname, '../src/controlplane.ts'))).toBe(false);
  });
});
