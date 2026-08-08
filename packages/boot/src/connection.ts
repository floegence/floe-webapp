import type { ArtifactSource, ConnectionControllerOptions } from '@floegence/flowersec-core';

export type FlowersecConnectionConfig = Readonly<{
  source: ArtifactSource;
  controller?: ConnectionControllerOptions;
}>;

export type TunnelArtifactConnectionOptions = FlowersecConnectionConfig;
export type DirectArtifactConnectionOptions = FlowersecConnectionConfig;

export function createArtifactTunnelConnectionConfig(
  options: TunnelArtifactConnectionOptions,
): FlowersecConnectionConfig {
  return options;
}

export function createProxyRuntimeTunnelConnectionConfig(
  options: TunnelArtifactConnectionOptions,
): FlowersecConnectionConfig {
  return options;
}

export function createArtifactDirectConnectionConfig(
  options: DirectArtifactConnectionOptions,
): FlowersecConnectionConfig {
  return options;
}
