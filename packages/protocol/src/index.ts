// Protocol package entry point

export { ProtocolProvider, useProtocol, type ConnectionStatus, type ConnectConfig } from './client';
export { useRpc } from './rpc';
export { requestChannelGrant, type ControlplaneConfig } from './controlplane';
export * from './types';
