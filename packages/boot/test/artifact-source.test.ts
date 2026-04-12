import { describe, expect, it, vi } from 'vitest';

const requestConnectArtifact = vi.fn();
const requestEntryConnectArtifact = vi.fn();

vi.mock('@floegence/flowersec-core/controlplane', () => ({
  requestConnectArtifact,
  requestEntryConnectArtifact,
}));

describe('boot artifact sources', () => {
  it('builds a controlplane artifact source that forwards signal and reconnect trace ids', async () => {
    const artifact = { v: 1, transport: 'tunnel' } as const;
    requestConnectArtifact.mockResolvedValue(artifact);

    const mod = await import('../src/index');
    const signal = new AbortController().signal;
    const source = mod.createControlplaneArtifactSource({
      baseUrl: 'https://cp.example.com',
      endpointId: 'env_demo',
      payload: { floe_app: 'com.floegence.redeven.agent' },
      correlation: { traceId: 'trace-initial' },
    });

    const out = await source.getArtifact({ signal, traceId: 'trace-reconnect' });

    expect(out).toBe(artifact);
    expect(source.kind).toBe('controlplane');
    expect(requestConnectArtifact).toHaveBeenCalledWith({
      baseUrl: 'https://cp.example.com',
      endpointId: 'env_demo',
      payload: { floe_app: 'com.floegence.redeven.agent' },
      correlation: { traceId: 'trace-reconnect' },
      signal,
    });
  });

  it('builds an entry controlplane artifact source that preserves configured correlation when no reconnect trace id exists', async () => {
    const artifact = { v: 1, transport: 'tunnel' } as const;
    requestEntryConnectArtifact.mockResolvedValue(artifact);

    const mod = await import('../src/index');
    const source = mod.createEntryControlplaneArtifactSource({
      baseUrl: 'https://cp.example.com',
      endpointId: 'env_demo',
      entryTicket: 'ticket-1',
      credentials: 'omit',
      correlation: { traceId: 'trace-initial' },
      payload: { floe_app: 'com.floegence.redeven.agent' },
    });

    const out = await source.getArtifact({});

    expect(out).toBe(artifact);
    expect(source.kind).toBe('entry_controlplane');
    expect(requestEntryConnectArtifact).toHaveBeenCalledWith({
      baseUrl: 'https://cp.example.com',
      endpointId: 'env_demo',
      entryTicket: 'ticket-1',
      credentials: 'omit',
      correlation: { traceId: 'trace-initial' },
      payload: { floe_app: 'com.floegence.redeven.agent' },
    });
  });

  it('creates fixed and factory artifact sources for product-owned flows', async () => {
    const artifact = { v: 1, transport: 'direct' } as const;
    const factory = vi.fn(async ({ traceId }: { traceId?: string }) => ({ ...artifact, traceId }));

    const mod = await import('../src/index');
    const fixed = mod.createFixedArtifactSource(artifact as never);
    const factorySource = mod.createArtifactSourceFromFactory(factory);

    await expect(fixed.getArtifact({ traceId: 'ignored' })).resolves.toBe(artifact);
    await expect(factorySource.getArtifact({ traceId: 'trace-1' })).resolves.toMatchObject({
      v: 1,
      transport: 'direct',
      traceId: 'trace-1',
    });
    expect(factorySource.kind).toBe('factory');
    expect(factory).toHaveBeenCalledWith({ traceId: 'trace-1' });
  });
});
