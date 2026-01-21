import { createContext, useContext, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import type {
  ChannelInitGrant,
  Client,
  ClientObserverLike,
  DirectConnectInfo,
} from '@floegence/flowersec-core';
import { requestChannelGrant, type ControlplaneConfig } from './controlplane';

/**
 * Connection status
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

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
  connect: (config: ConnectConfig) => Promise<void>;
  disconnect: () => void;
}

/**
 * Configuration for connecting to a flowersec server
 */
export interface ConnectConfig {
  mode?: 'tunnel' | 'direct'; // default: tunnel
  observer?: ClientObserverLike;
  keepaliveIntervalMs?: number;
  connectTimeoutMs?: number;
  handshakeTimeoutMs?: number;

  // Tunnel mode
  controlplane?: ControlplaneConfig;
  grant?: ChannelInitGrant;

  // Direct mode
  directInfo?: DirectConnectInfo;
}

const ProtocolContext = createContext<ProtocolContextValue>();

export function ProtocolProvider(props: { children: JSX.Element }) {
  const [state, setState] = createStore<ProtocolState>({
    status: 'disconnected',
    error: null,
    client: null,
  });

  const connect = async (config: ConnectConfig) => {
    setState({ status: 'connecting', error: null });

    try {
      // Dynamic import to avoid bundling issues
      const { connectTunnelBrowser, connectDirectBrowser } = await import(
        '@floegence/flowersec-core/browser'
      );

      const connectOptions = {
        observer: config.observer,
        keepaliveIntervalMs: config.keepaliveIntervalMs ?? 15000,
        connectTimeoutMs: config.connectTimeoutMs ?? 10000,
        handshakeTimeoutMs: config.handshakeTimeoutMs ?? 10000,
      };

      let client: Client;

      const mode = config.mode ?? 'tunnel';

      if (mode === 'tunnel') {
        const grant =
          config.grant ??
          (config.controlplane ? await requestChannelGrant(config.controlplane) : null);
        if (!grant) {
          throw new Error('Tunnel mode requires `grant` or `controlplane` config');
        }
        client = await connectTunnelBrowser(grant, connectOptions);
      } else {
        if (!config.directInfo) {
          throw new Error('Direct mode requires `directInfo`');
        }
        client = await connectDirectBrowser(config.directInfo, connectOptions);
      }

      setState({ status: 'connected', client, error: null });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setState({
        status: 'error',
        error: e,
        client: null,
      });
      throw err;
    }
  };

  const disconnect = () => {
    if (state.client) {
      state.client.close();
    }
    setState({
      status: 'disconnected',
      error: null,
      client: null,
    });
  };

  const value: ProtocolContextValue = {
    status: () => state.status,
    error: () => state.error,
    client: () => state.client,
    connect,
    disconnect,
  };

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
