// Protocol package entry point

export {
  ConnectionReplacementRequiredError,
  ProtocolProvider,
  useProtocol,
  type ConnectConfig,
  type ConnectionLifecycle,
} from './client';
export { useRpc, RpcError, ProtocolNotConnectedError } from './rpc';
export type {
  ProtocolContract,
  RpcClientLike,
  RpcDecoder,
  RpcHelpers,
} from './contract';
