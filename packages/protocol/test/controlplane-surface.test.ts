import { describe, expect, it, vi } from 'vitest';

const requestConnectArtifact = vi.fn();
const requestEntryConnectArtifact = vi.fn();
const requestChannelGrant = vi.fn();
const requestEntryChannelGrant = vi.fn();

class MockControlplaneRequestError extends Error {}

vi.mock('@floegence/flowersec-core/controlplane', () => ({
  assertConnectArtifact: vi.fn(),
  ControlplaneRequestError: MockControlplaneRequestError,
  requestConnectArtifact,
  requestEntryConnectArtifact,
}));

vi.mock('@floegence/flowersec-core/browser', () => ({
  requestChannelGrant,
  requestEntryChannelGrant,
}));

describe('protocol controlplane surface', () => {
  it('reexports artifact helpers from the stable controlplane module and keeps legacy grant helpers from the browser compatibility surface', async () => {
    const shared = await import('@floegence/flowersec-core/controlplane');
    const browser = await import('@floegence/flowersec-core/browser');
    const local = await import('../src/controlplane');

    expect(local.requestConnectArtifact).toBe(shared.requestConnectArtifact);
    expect(local.requestEntryConnectArtifact).toBe(shared.requestEntryConnectArtifact);
    expect(local.ControlplaneRequestError).toBe(shared.ControlplaneRequestError);
    expect(local.requestChannelGrant).toBe(browser.requestChannelGrant);
    expect(local.requestEntryChannelGrant).toBe(browser.requestEntryChannelGrant);
  });
});
