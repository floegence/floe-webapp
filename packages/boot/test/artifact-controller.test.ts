import { describe, expect, it, vi } from 'vitest';
import { createConnectionController } from '@floegence/flowersec-core/browser';
import { createControlplaneArtifactSource } from '../src/artifact-source';

describe('controlplane failures with the released Flowersec controller', () => {
  it.each([
    ['gateway HTML', () => new Response('<h1>Bad Gateway</h1>', { status: 502 })],
    [
      'business unavailability',
      () =>
        new Response(JSON.stringify({ error: { code: 'entry_ticket_unavailable' } }), {
          status: 503,
        }),
    ],
    [
      'network interruption',
      () => {
        throw new TypeError('Failed to fetch');
      },
    ],
    ['rate limiting', () => new Response('{}', { status: 429, headers: { 'retry-after': '1' } })],
  ])('reacquires after %s without converting it to artifact_invalid', async (_label, response) => {
    const fetch = vi.fn(async () => response());
    const source = createControlplaneArtifactSource({
      baseUrl: 'https://cp.example.com',
      endpointId: 'demo',
      fetch,
      commitSpend: vi.fn(),
      validateSpendBinding: vi.fn(),
    });
    const controller = await createConnectionController(source);
    try {
      controller.start();
      await vi.waitFor(() => expect(controller.state).toBe('waiting'));
      expect(fetch).toHaveBeenCalledOnce();
      fetch.mockImplementation(async () => new Response('{}', { status: 401 }));
      controller.retryNow();
      await vi.waitFor(() => expect(controller.state).toBe('failed'), { timeout: 3_000 });
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      await controller.close();
    }
  });

  it.each([401, 403, 200])(
    'keeps authentication and malformed success responses terminal (%s)',
    async (status) => {
      const fetch = vi.fn(async () => new Response('invalid', { status }));
      const controller = await createConnectionController(
        createControlplaneArtifactSource({
          baseUrl: 'https://cp.example.com',
          endpointId: 'demo',
          fetch,
          commitSpend: vi.fn(),
          validateSpendBinding: vi.fn(),
        })
      );
      try {
        controller.start();
        await vi.waitFor(() => expect(controller.state).toBe('failed'));
        controller.retryNow();
        expect(fetch).toHaveBeenCalledOnce();
      } finally {
        await controller.close();
      }
    }
  );
});
