// Protocol package entry point

export { ProtocolProvider, useProtocol, type ConnectionStatus, type ConnectConfig, type AutoReconnectConfig } from './client';
export { useRpc, RpcError, ProtocolNotConnectedError } from './rpc';
export {
  assertConnectArtifact,
  ControlplaneRequestError,
  requestConnectArtifact,
  requestEntryConnectArtifact,
  type ConnectArtifact,
  type RequestConnectArtifactInput,
  type RequestEntryConnectArtifactInput,
} from './controlplane';
export type { ProtocolContract, RpcClientLike, RpcHelpers } from './contract';
