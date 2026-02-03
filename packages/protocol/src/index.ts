// Protocol package entry point

export { ProtocolProvider, useProtocol, type ConnectionStatus, type ConnectConfig, type AutoReconnectConfig } from './client';
export { useRpc, RpcError, ProtocolNotConnectedError } from './rpc';
export { requestChannelGrant, type ControlplaneConfig } from './controlplane';
export type { ProtocolContract, RpcClientLike, RpcHelpers } from './contract';

