// Protocol package entry point

export { ProtocolProvider, useProtocol, type ConnectionStatus, type ConnectConfig, type AutoReconnectConfig } from './client';
export { useRpc, RpcError, ProtocolNotConnectedError } from './rpc';
export {
  assertConnectArtifact,
  ControlplaneRequestError,
  requestChannelGrant,
  requestConnectArtifact,
  requestEntryChannelGrant,
  requestEntryConnectArtifact,
  type ConnectArtifact,
  type ConnectArtifactRequestConfig,
  type ControlplaneConfig,
  type EntryConnectArtifactRequestConfig,
  type EntryControlplaneConfig,
} from './controlplane';
export type { ProtocolContract, RpcClientLike, RpcHelpers } from './contract';
