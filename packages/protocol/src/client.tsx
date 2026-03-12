import { createContext, useContext, onCleanup, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import type {
  ChannelInitGrant,
  Client,
  ClientObserverLike,
  DirectConnectInfo,
} from '@floegence/flowersec-core';
import { RpcProxy } from '@floegence/flowersec-core/rpc';
import {
  createReconnectManager,
  type AutoReconnectConfig,
  type ConnectionStatus,
} from '@floegence/flowersec-core/reconnect';
import { requestChannelGrant, type ControlplaneConfig } from './controlplane';
import type { ProtocolContract, RpcClientLike } from './contract';

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
  rpcTransport: () => RpcClientLike;
  contract: () => ProtocolContract;
  connect: (config: ConnectConfig) => Promise<void>;
  /** Force a hard reconnect (disconnect old client and build a new one). */
  reconnect: (config?: ConnectConfig) => Promise<void>;
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

export function ProtocolProvider(props: { children: JSX.Element; contract: ProtocolContract }) {
  const mgr = createReconnectManager();
  const initialState = mgr.state();
  const [state, setState] = createStore<ProtocolState>({
    status: initialState.status,
    error: initialState.error,
    client: initialState.client,
  });

  // eslint-disable-next-line solid/reactivity -- contract is expected to be static for the provider lifetime.
  const contract = props.contract;
  const rpcProxy = new RpcProxy();
  const rpcTransport: RpcClientLike = {
    rpc: {
      call: (typeId, payload) => rpcProxy.call(typeId, payload),
      notify: (typeId, payload) => rpcProxy.notify(typeId, payload),
      onNotify: (typeId, handler) => rpcProxy.onNotify(typeId, handler),
    },
  };

  if (initialState.client) {
    rpcProxy.attach(initialState.client.rpc);
  }

  const unsubscribe = mgr.subscribe((s) => {
    if (s.client) {
      rpcProxy.attach(s.client.rpc);
    } else {
      rpcProxy.detach();
    }
    setState({ status: s.status, error: s.error, client: s.client });
  });

  // Last desired config (used by reconnect()).
  let lastConfig: ConnectConfig | null = null;
  let connectInFlight: Promise<void> | null = null;

  const connectWithConfig = async (config: ConnectConfig, mode: 'hard' | 'if_needed') => {
    const connectArgs = {
      autoReconnect: config.autoReconnect,
      observer: config.observer,
      connectOnce: async ({ signal, observer }: Readonly<{ signal: AbortSignal; observer: ClientObserverLike }>) => {
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
    } satisfies Parameters<typeof mgr.connect>[0];

    if (mode === 'hard') {
      await mgr.connect(connectArgs);
      return;
    }
    await mgr.connectIfNeeded(connectArgs);
  };

  const reconnect = async (config?: ConnectConfig) => {
    const effective = config ?? lastConfig;
    if (!effective) {
      throw new Error('reconnect() requires a config before the first connect() call');
    }

    // Deduplicate calls from multiple lifecycle events (focus/visibility/online).
    if (connectInFlight) return connectInFlight;

    lastConfig = effective;
    connectInFlight = connectWithConfig(effective, 'hard').finally(() => {
      connectInFlight = null;
    });
    return connectInFlight;
  };

  // connect() is intentionally idempotent: it should not tear down a healthy connection.
  // Consumers that need a hard restart must call reconnect().
  const connect = async (config: ConnectConfig) => {
    lastConfig = config;

    const st = mgr.state();
    if (st.status === 'connected' && st.client) return;

    // If the reconnect manager is already connecting (e.g. autoReconnect),
    // avoid interfering with a hard reconnect when we don't have an in-flight handle.
    if (st.status === 'connecting' && !connectInFlight) return;

    if (connectInFlight) {
      await connectInFlight;
      return;
    }

    connectInFlight = connectWithConfig(config, 'if_needed').finally(() => {
      connectInFlight = null;
    });
    await connectInFlight;
  };

  const disconnect = () => {
    rpcProxy.detach();
    mgr.disconnect();
  };

  const value: ProtocolContextValue = {
    status: () => state.status,
    error: () => state.error,
    client: () => state.client,
    rpcTransport: () => rpcTransport,
    contract: () => contract,
    connect,
    reconnect,
    disconnect,
  };

  onCleanup(() => {
    unsubscribe();
    rpcProxy.detach();
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
