import { createContext, useContext, onCleanup, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import type {
  ArtifactSource,
  ConnectionController,
  ConnectionControllerOptions,
  ConnectionState,
  Session,
} from '@floegence/flowersec-core';
import type { ProtocolContract } from './contract';

const loadBrowserRuntime = () => import('@floegence/flowersec-core/browser');

interface ProtocolState {
  status: ConnectionState;
  error: Error | null;
  session: Session | null;
}

interface ProtocolContextValue {
  status: () => ConnectionState;
  error: () => Error | null;
  session: () => Session | null;
  rpcTransport: () => Session['rpc'] | null;
  contract: () => ProtocolContract;
  connect: (config: ConnectConfig) => Promise<void>;
  reconnect: (config?: ConnectConfig) => Promise<void>;
  disconnect: () => void;
}

export type ConnectConfig = Readonly<{
  source: ArtifactSource;
  controller?: ConnectionControllerOptions;
}>;

const ProtocolContext = createContext<ProtocolContextValue>();

export function ProtocolProvider(props: { children: JSX.Element; contract: ProtocolContract }) {
  const [state, setState] = createStore<ProtocolState>({
    status: 'idle',
    error: null,
    session: null,
  });

  // eslint-disable-next-line solid/reactivity -- the contract is fixed for the provider lifetime.
  const contract = props.contract;
  let controller: ConnectionController | null = null;
  let unsubscribe: (() => void) | null = null;
  let lastConfig: ConnectConfig | null = null;
  let operation: Promise<void> | null = null;
  let lifecycleGeneration = 0;

  const publish = (snapshot: Parameters<Parameters<ConnectionController['subscribe']>[0]>[0]) => {
    const failure = snapshot.failure;
    setState({
      status: snapshot.state,
      session: snapshot.currentSession ?? null,
      error: failure === undefined ? null : new Error(`${failure.phase}:${failure.code}`),
    });
  };

  const closeController = async () => {
    unsubscribe?.();
    unsubscribe = null;
    const current = controller;
    controller = null;
    if (current) await current.close();
    setState({ status: 'idle', session: null, error: null });
  };

  const start = async (config: ConnectConfig) => {
    const generation = ++lifecycleGeneration;
    await closeController();
    lastConfig = config;
    const { createConnectionController } = await loadBrowserRuntime();
    if (generation !== lifecycleGeneration) return;

    const nextController = createConnectionController(config.source, config.controller);
    controller = nextController;
    unsubscribe = nextController.subscribe(publish);
    nextController.start();
    await nextController.waitForSession();
  };

  const connect = async (config: ConnectConfig) => {
    if (operation) return operation;
    operation = (async () => {
      if (controller && lastConfig?.source === config.source && controller.state === 'connected') return;
      await start(config);
    })().finally(() => {
      operation = null;
    });
    return operation;
  };

  const reconnect = async (config?: ConnectConfig) => {
    const effective = config ?? lastConfig;
    if (!effective) throw new Error('reconnect() requires a config before the first connect() call');
    await connect(effective);
  };

  const disconnect = () => {
    lifecycleGeneration += 1;
    void closeController();
  };

  const value: ProtocolContextValue = {
    status: () => state.status,
    error: () => state.error,
    session: () => state.session,
    rpcTransport: () => state.session?.rpc ?? null,
    contract: () => contract,
    connect,
    reconnect,
    disconnect,
  };

  onCleanup(() => {
    lifecycleGeneration += 1;
    unsubscribe?.();
    void controller?.close();
  });

  return <ProtocolContext.Provider value={value}>{props.children}</ProtocolContext.Provider>;
}

export function useProtocol(): ProtocolContextValue {
  const ctx = useContext(ProtocolContext);
  if (!ctx) throw new Error('useProtocol must be used within a ProtocolProvider');
  return ctx;
}
