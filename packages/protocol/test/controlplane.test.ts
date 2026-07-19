import { describe, expect, it, vi } from 'vitest';
import {
  requestConnectArtifact,
  requestEntryConnectArtifact,
} from '../src/controlplane';

function makeTunnelGrant(channelId: string) {
  return {
    tunnel_url: 'wss://example.com/ws',
    channel_id: channelId,
    channel_init_expire_at_unix_s: 1,
    idle_timeout_seconds: 10,
    role: 1,
    token: 'token',
    e2ee_psk_b64u: 'psk',
    allowed_suites: [1],
    default_suite: 1,
  };
}

function makeTunnelArtifact(channelId: string) {
  return {
    v: 1,
    transport: 'tunnel',
    tunnel_grant: makeTunnelGrant(channelId),
    correlation: {
      v: 1,
      trace_id: 'trace-0001',
      tags: [],
    },
  };
}

describe('requestConnectArtifact', () => {
  it('should POST to /v1/connect/artifact and return validated artifact', async () => {
    const artifact = makeTunnelArtifact('channel-art-1');

    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ connect_artifact: artifact }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await requestConnectArtifact({
      baseUrl: 'https://cp.example.com',
      endpointId: 'endpoint-1',
      payload: {
        floe_app: 'com.floegence.redeven.agent',
      },
      correlation: {
        traceId: 'trace-0001',
      },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toBe('https://cp.example.com/v1/connect/artifact');
    const init = spy.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    expect(JSON.parse(String(init.body))).toEqual({
      endpoint_id: 'endpoint-1',
      payload: {
        floe_app: 'com.floegence.redeven.agent',
      },
      correlation: {
        trace_id: 'trace-0001',
      },
    });
    expect(result).toEqual(artifact);

    spy.mockRestore();
  });

  it('should throw on missing connect_artifact envelope', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      requestConnectArtifact({ baseUrl: 'https://cp.example.com', endpointId: 'endpoint-1' }),
    ).rejects.toThrow('Invalid controlplane response: missing `connect_artifact`');

    spy.mockRestore();
  });
});

describe('requestEntryConnectArtifact', () => {
  it('should POST to /v1/connect/artifact/entry and send the entry bearer token', async () => {
    const artifact = makeTunnelArtifact('channel-art-2');

    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ connect_artifact: artifact }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await requestEntryConnectArtifact({
      baseUrl: 'https://cp.example.com',
      endpointId: 'endpoint-1',
      entryTicket: 'ticket-1',
      payload: {
        floe_app: 'com.floegence.redeven.agent',
      },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toBe('https://cp.example.com/v1/connect/artifact/entry');
    const init = spy.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer ticket-1');
    expect(JSON.parse(String(init.body))).toEqual({
      endpoint_id: 'endpoint-1',
      payload: {
        floe_app: 'com.floegence.redeven.agent',
      },
    });
    expect(result).toEqual(artifact);

    spy.mockRestore();
  });
});
