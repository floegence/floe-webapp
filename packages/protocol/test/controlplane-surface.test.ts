import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type {
  RequestConnectArtifactInput as FlowersecRequestConnectArtifactInput,
  RequestEntryConnectArtifactInput as FlowersecRequestEntryConnectArtifactInput,
} from '@floegence/flowersec-core/controlplane';
import type {
  RequestConnectArtifactInput,
  RequestEntryConnectArtifactInput,
} from '../src/controlplane';

const requestConnectArtifact = vi.fn();
const requestEntryConnectArtifact = vi.fn();
const requestChannelGrant = vi.fn();
const requestEntryChannelGrant = vi.fn();
const assertConnectArtifact = vi.fn();

class MockControlplaneRequestError extends Error {}

vi.mock('@floegence/flowersec-core/controlplane', () => ({
  assertConnectArtifact: vi.fn(),
  ControlplaneRequestError: MockControlplaneRequestError,
  requestConnectArtifact,
  requestEntryConnectArtifact,
}));

vi.mock('@floegence/flowersec-core/browser', () => ({
  assertConnectArtifact,
  requestChannelGrant,
  requestEntryChannelGrant,
}));

describe('protocol controlplane surface', () => {
  it('reexports artifact requests from controlplane and browser-owned artifact and grant contracts', async () => {
    const shared = await import('@floegence/flowersec-core/controlplane');
    const browser = await import('@floegence/flowersec-core/browser');
    const local = await import('../src/controlplane');

    expect(local.assertConnectArtifact).toBe(browser.assertConnectArtifact);
    expect(local.requestConnectArtifact).toBe(shared.requestConnectArtifact);
    expect(local.requestEntryConnectArtifact).toBe(shared.requestEntryConnectArtifact);
    expect(local.ControlplaneRequestError).toBe(shared.ControlplaneRequestError);
    expect(local.requestChannelGrant).toBe(browser.requestChannelGrant);
    expect(local.requestEntryChannelGrant).toBe(browser.requestEntryChannelGrant);

    expectTypeOf<RequestConnectArtifactInput>().toEqualTypeOf<FlowersecRequestConnectArtifactInput>();
    expectTypeOf<RequestEntryConnectArtifactInput>().toEqualTypeOf<FlowersecRequestEntryConnectArtifactInput>();
  });
});
