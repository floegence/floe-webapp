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
}));

describe('protocol controlplane surface', () => {
  it('reexports only the artifact-first controlplane surface', async () => {
    const shared = await import('@floegence/flowersec-core/controlplane');
    const browser = await import('@floegence/flowersec-core/browser');
    const local = await import('../src/controlplane');
    const publicPackage = await import('../src/index');

    expect(local.assertConnectArtifact).toBe(browser.assertConnectArtifact);
    expect(local.requestConnectArtifact).toBe(shared.requestConnectArtifact);
    expect(local.requestEntryConnectArtifact).toBe(shared.requestEntryConnectArtifact);
    expect(local.ControlplaneRequestError).toBe(shared.ControlplaneRequestError);
    expect(local).not.toHaveProperty('requestChannelGrant');
    expect(local).not.toHaveProperty('requestEntryChannelGrant');
    expect(publicPackage).not.toHaveProperty('requestChannelGrant');
    expect(publicPackage).not.toHaveProperty('requestEntryChannelGrant');

    expectTypeOf<RequestConnectArtifactInput>().toEqualTypeOf<FlowersecRequestConnectArtifactInput>();
    expectTypeOf<RequestEntryConnectArtifactInput>().toEqualTypeOf<FlowersecRequestEntryConnectArtifactInput>();

    type LegacyControlplaneExports = Extract<
      keyof typeof local,
      'requestChannelGrant' | 'requestEntryChannelGrant'
    >;
    type LegacyPackageExports = Extract<
      keyof typeof publicPackage,
      'requestChannelGrant' | 'requestEntryChannelGrant'
    >;
    expectTypeOf<LegacyControlplaneExports>().toEqualTypeOf<never>();
    expectTypeOf<LegacyPackageExports>().toEqualTypeOf<never>();
  });
});
