import { createContext, useContext, onCleanup, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { Client } from '@floegence/flowersec-core';
import { createBrowserReconnectConfig, type BrowserReconnectConfig } from '@floegence/flowersec-core/browser';
import { RpcProxy } from '@floegence/flowersec-core/rpc';
import {
  createReconnectManager,
  type AutoReconnectConfig,
  type ConnectionStatus,
} from '@floegence/flowersec-core/reconnect';
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
export type ConnectConfig = BrowserReconnectConfig;

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
    const connectArgs = createBrowserReconnectConfig(config);

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
