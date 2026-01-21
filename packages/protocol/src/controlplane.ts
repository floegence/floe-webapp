import { assertChannelInitGrant, type ChannelInitGrant } from '@floegence/flowersec-core';

export interface ControlplaneConfig {
  baseUrl: string;
  endpointId: string;
}

/**
 * 向控制面请求隧道连接凭证（grant）。
 *
 * 说明：
 * - `.design.md` 约定的接口为 POST `${baseUrl}/v1/channel/init`，body: { endpoint_id }
 * - 返回体结构按设计约定：`{ grant_client: ChannelInitGrant }`
 */
export async function requestChannelGrant(config: ControlplaneConfig): Promise<ChannelInitGrant> {
  const response = await fetch(`${config.baseUrl}/v1/channel/init`, {
    method: 'POST',
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
