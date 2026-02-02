import { createContext, useContext, onCleanup, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import type {
  ChannelInitGrant,
  Client,
  ClientObserverLike,
  DirectConnectInfo,
} from '@floegence/flowersec-core';
import { requestChannelGrant, type ControlplaneConfig } from './controlplane';
import type { ProtocolContract } from './contract';
import { redevenV1Contract } from './contracts/redeven_v1';

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
  contract: () => ProtocolContract;
  connect: (config: ConnectConfig) => Promise<void>;
  disconnect: () => void;
}

/**
 * Configuration for connecting to a flowersec server
 */
export interface AutoReconnectConfig {
  /**
   * Enable auto reconnect on failure / unexpected disconnect.
   * Default: false.
   */
  enabled?: boolean;
  /** Maximum total attempts (including the first). Default: 5. */
  maxAttempts?: number;
  /** Base delay for the first retry. Default: 500ms. */
  initialDelayMs?: number;
  /** Max delay cap. Default: 10s. */
  maxDelayMs?: number;
  /** Exponential backoff factor. Default: 1.8. */
  factor?: number;
  /** Random jitter ratio in [-ratio, +ratio]. Default: 0.2. */
  jitterRatio?: number;
}

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

type AutoReconnectSettings = Readonly<{
  enabled: boolean;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  factor: number;
  jitterRatio: number;
}>;

function normalizeAutoReconnect(cfg?: AutoReconnectConfig): AutoReconnectSettings {
  if (!cfg?.enabled) {
    return {
      enabled: false,
      maxAttempts: 1,
      initialDelayMs: 500,
      maxDelayMs: 10_000,
      factor: 1.8,
      jitterRatio: 0.2,
    };
  }

  return {
    enabled: true,
    maxAttempts: Math.max(1, cfg.maxAttempts ?? 5),
    initialDelayMs: Math.max(0, cfg.initialDelayMs ?? 500),
    maxDelayMs: Math.max(0, cfg.maxDelayMs ?? 10_000),
    factor: Math.max(1, cfg.factor ?? 1.8),
    jitterRatio: Math.max(0, cfg.jitterRatio ?? 0.2),
  };
}

function backoffDelayMs(attemptIndex: number, cfg: AutoReconnectSettings): number {
  const base = Math.min(cfg.maxDelayMs, cfg.initialDelayMs * Math.pow(cfg.factor, attemptIndex));
  const jitter =
    cfg.jitterRatio <= 0 ? 0 : base * cfg.jitterRatio * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(base + jitter));
}

export function ProtocolProvider(props: { children: JSX.Element; contract?: ProtocolContract }) {
  const [state, setState] = createStore<ProtocolState>({
    status: 'disconnected',
    error: null,
    client: null,
  });

  // eslint-disable-next-line solid/reactivity -- contract is expected to be static for the provider lifetime.
  const contract = props.contract ?? redevenV1Contract;

  let connectToken = 0;
  let activeConfig: ConnectConfig | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryResolve: (() => void) | null = null;

  const cancelRetrySleep = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    retryResolve?.();
    retryResolve = null;
  };

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      retryResolve = resolve;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        retryResolve = null;
        resolve();
      }, ms);
    });

  const disconnectInternal = () => {
    cancelRetrySleep();
    activeConfig = null;
    connectToken += 1;

    if (state.client) {
      state.client.close();
    }

    setState({
      status: 'disconnected',
      error: null,
      client: null,
    });
  };

  const startReconnect = (token: number, config: ConnectConfig, error: Error) => {
    if (token !== connectToken) return;
    if (activeConfig !== config) return;
    if (state.status !== 'connected') return;

    const ar = normalizeAutoReconnect(config.autoReconnect);
    if (!ar.enabled) {
      setState({ status: 'error', error, client: null });
      return;
    }

    // Restart the connection loop in the background.
    cancelRetrySleep();
    connectToken += 1;
    const nextToken = connectToken;
    setState({ status: 'connecting', error, client: null });
    void connectWithRetry(nextToken, config).catch(() => {
      // State is updated inside connectWithRetry; keep errors observable via protocol.error().
    });
  };

  const createObserver = (token: number, config: ConnectConfig): ClientObserverLike | undefined => {
    const user = config.observer;
    return {
      onConnect: (...args) => user?.onConnect?.(...args),
      onAttach: (...args) => user?.onAttach?.(...args),
      onHandshake: (...args) => user?.onHandshake?.(...args),
      onWsClose: (kind, code) => {
        user?.onWsClose?.(kind, code);
        if (kind === 'peer_or_error') {
          startReconnect(token, config, new Error(`WebSocket closed (${code ?? 'unknown'})`));
        }
      },
      onWsError: (reason) => {
        user?.onWsError?.(reason);
        startReconnect(token, config, new Error(`WebSocket error: ${reason}`));
      },
      onRpcCall: (...args) => user?.onRpcCall?.(...args),
      onRpcNotify: (...args) => user?.onRpcNotify?.(...args),
    };
  };

  const connectOnce = async (token: number, config: ConnectConfig): Promise<Client> => {
    // Dynamic import to avoid bundling issues
    const { connectTunnelBrowser, connectDirectBrowser } = await import('@floegence/flowersec-core/browser');

    const connectOptions = {
      observer: createObserver(token, config),
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
  };

  const connectWithRetry = async (token: number, config: ConnectConfig) => {
    const ar = normalizeAutoReconnect(config.autoReconnect);
    let attempts = 0;

    for (;;) {
      if (token !== connectToken) return;
      if (activeConfig !== config) return;

      attempts += 1;
      try {
        const client = await connectOnce(token, config);
        if (token !== connectToken) {
          client.close();
          return;
        }
        if (activeConfig !== config) {
          client.close();
          return;
        }

        setState({ status: 'connected', client, error: null });
        return;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        if (token !== connectToken) return;
        if (activeConfig !== config) return;

        const canRetry = ar.enabled && attempts < ar.maxAttempts;
        if (!canRetry) {
          setState({ status: 'error', error: e, client: null });
          throw e;
        }

        setState({ status: 'connecting', error: e, client: null });
        const delay = backoffDelayMs(attempts - 1, ar);
        await sleep(delay);
      }
    }
  };

  const connect = async (config: ConnectConfig) => {
    cancelRetrySleep();
    connectToken += 1;
    const token = connectToken;
    activeConfig = config;

    if (state.client) {
      state.client.close();
    }

    setState({ status: 'connecting', error: null, client: null });
    await connectWithRetry(token, config);
  };

  const disconnect = () => {
    disconnectInternal();
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
    disconnectInternal();
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
