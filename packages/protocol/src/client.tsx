import { createContext, useContext, onCleanup, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import type {
  ChannelInitGrant,
  Client,
  ClientObserverLike,
  DirectConnectInfo,
} from '@floegence/flowersec-core';
import {
  createReconnectManager,
  type AutoReconnectConfig,
  type ConnectionStatus,
} from '@floegence/flowersec-core/reconnect';
import { requestChannelGrant, type ControlplaneConfig } from './controlplane';
import type { ProtocolContract } from './contract';
import { redevenV1Contract } from './contracts/redeven_v1';

/**
 * Protocol context state
 */
interface ProtocolState {
  status: ConnectionStatus;
  error: Error | null;
  client: Client | null;
}

interface ProtocolContextValue {
  status: () => ConnectionStatus;
  error: () => Error | null;
  client: () => Client | null;
  contract: () => ProtocolContract;
  connect: (config: ConnectConfig) => Promise<void>;
  disconnect: () => void;
}

export type { AutoReconnectConfig, ConnectionStatus };

export interface ConnectConfig {
  mode?: 'tunnel' | 'direct'; // default: tunnel
  observer?: ClientObserverLike;
  keepaliveIntervalMs?: number;
  connectTimeoutMs?: number;
  handshakeTimeoutMs?: number;
  autoReconnect?: AutoReconnectConfig;

  // Tunnel mode
  controlplane?: ControlplaneConfig;
  /**
   * Provide a fresh grant for each connection attempt.
   *
   * This is the recommended way to support "reconnect requires new ticket/grant"
   * flows (e.g. entry_ticket -> channel_init -> grant_client).
   */
  getGrant?: () => Promise<ChannelInitGrant>;
  grant?: ChannelInitGrant;

  // Direct mode
  directInfo?: DirectConnectInfo;
}

const ProtocolContext = createContext<ProtocolContextValue>();

export function ProtocolProvider(props: { children: JSX.Element; contract?: ProtocolContract }) {
  const mgr = createReconnectManager();
  const [state, setState] = createStore<ProtocolState>({
    status: mgr.state().status,
    error: mgr.state().error,
    client: mgr.state().client,
  });

  // eslint-disable-next-line solid/reactivity -- contract is expected to be static for the provider lifetime.
  const contract = props.contract ?? redevenV1Contract;

  const unsubscribe = mgr.subscribe((s) => {
    setState({ status: s.status, error: s.error, client: s.client });
  });

  const connect = async (config: ConnectConfig) => {
    await mgr.connect({
      autoReconnect: config.autoReconnect,
      observer: config.observer,
      connectOnce: async ({ signal, observer }) => {
        // Dynamic import to avoid bundling issues
        const { connectTunnelBrowser, connectDirectBrowser } = await import('@floegence/flowersec-core/browser');

        const connectOptions = {
          observer,
          signal,
          keepaliveIntervalMs: config.keepaliveIntervalMs ?? 15000,
          connectTimeoutMs: config.connectTimeoutMs ?? 10000,
          handshakeTimeoutMs: config.handshakeTimeoutMs ?? 10000,
        };

        const mode = config.mode ?? 'tunnel';

        if (mode === 'tunnel') {
          const grant =
            (config.getGrant ? await config.getGrant() : null) ??
            config.grant ??
            (config.controlplane ? await requestChannelGrant(config.controlplane) : null);
          if (!grant) {
            throw new Error('Tunnel mode requires `getGrant`, `grant`, or `controlplane` config');
          }
          return connectTunnelBrowser(grant, connectOptions);
        }

        if (!config.directInfo) {
          throw new Error('Direct mode requires `directInfo`');
        }

        return connectDirectBrowser(config.directInfo, connectOptions);
      },
    });
  };

  const disconnect = () => {
    mgr.disconnect();
  };

  const value: ProtocolContextValue = {
    status: () => state.status,
    error: () => state.error,
    client: () => state.client,
    contract: () => contract,
    connect,
    disconnect,
  };

  onCleanup(() => {
    unsubscribe();
    mgr.disconnect();
  });

  return (
    <ProtocolContext.Provider value={value}>
      {props.children}
    </ProtocolContext.Provider>
  );
}

export function useProtocol(): ProtocolContextValue {
  const ctx = useContext(ProtocolContext);
  if (!ctx) {
    throw new Error('useProtocol must be used within a ProtocolProvider');
  }
  return ctx;
}
