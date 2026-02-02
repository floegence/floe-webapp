import { describe, expect, it, vi } from 'vitest';
import { requestChannelGrant } from '../src/controlplane';

describe('requestChannelGrant', () => {
  it('should POST to /v1/channel/init and return validated grant', async () => {
    const grant = {
      tunnel_url: 'wss://example.com/ws',
      channel_id: 'channel-1',
      channel_init_expire_at_unix_s: 1,
      idle_timeout_seconds: 10,
      role: 1,
      token: 'token',
      e2ee_psk_b64u: 'psk',
      allowed_suites: [1],
      default_suite: 1,
    };

    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ grant_client: grant }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await requestChannelGrant({ baseUrl: 'https://cp.example.com', endpointId: 'endpoint-1' });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toBe('https://cp.example.com/v1/channel/init');
    const init = spy.mock.calls[0]?.[1];
    expect(init && typeof init === 'object' ? (init as RequestInit).method : undefined).toBe('POST');
    expect(init && typeof init === 'object' ? (init as RequestInit).credentials : undefined).toBe('omit');
    expect(init && typeof init === 'object' ? (init as RequestInit).cache : undefined).toBe('no-store');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ endpoint_id: 'endpoint-1' });
    expect(result).toEqual(grant);

    spy.mockRestore();
  });

  it('should throw on non-2xx response', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('nope', { status: 500 })
    );

    await expect(
      requestChannelGrant({ baseUrl: 'https://cp.example.com', endpointId: 'endpoint-1' })
    ).rejects.toThrow('Failed to get channel grant: 500');

    spy.mockRestore();
  });

  it('should throw on missing grant_client', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(
      requestChannelGrant({ baseUrl: 'https://cp.example.com', endpointId: 'endpoint-1' })
    ).rejects.toThrow('Invalid controlplane response: missing `grant_client`');

    spy.mockRestore();
  });
});
