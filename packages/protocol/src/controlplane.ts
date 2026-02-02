import { assertChannelInitGrant, type ChannelInitGrant } from '@floegence/flowersec-core';

export interface ControlplaneConfig {
  baseUrl: string;
  endpointId: string;
}

/**
 * Request a tunnel grant (ChannelInitGrant) from the controlplane.
 *
 * HTTP contract (documented in `docs/protocol.md`):
 * - POST `${baseUrl}/v1/channel/init`, body: { endpoint_id }
 * - Response: `{ grant_client: ChannelInitGrant }`
 */
export async function requestChannelGrant(config: ControlplaneConfig): Promise<ChannelInitGrant> {
  const response = await fetch(`${config.baseUrl}/v1/channel/init`, {
    method: 'POST',
    credentials: 'omit',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint_id: config.endpointId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get channel grant: ${response.status}`);
  }

  const data = (await response.json()) as { grant_client?: unknown };
  if (!data?.grant_client) {
    throw new Error('Invalid controlplane response: missing `grant_client`');
  }
  return assertChannelInitGrant(data.grant_client);
}
