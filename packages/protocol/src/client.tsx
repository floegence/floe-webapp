import type {
  ArtifactSource,
  ConnectionDiagnostic,
  ConnectionController,
  ConnectionSnapshot,
  ConnectionState,
  Session,
} from '@floegence/flowersec-core';
import type { ConnectionControllerOptions } from '@floegence/flowersec-core/browser';
import { createContext, createComponent, onCleanup, useContext, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { ProtocolContract } from './contract';

const loadBrowserRuntime = () => import('@floegence/flowersec-core/browser');
type FlowersecBrowserRuntime = Awaited<ReturnType<typeof loadBrowserRuntime>>;

interface ProtocolState {
  snapshot: ConnectionSnapshot;
  diagnostic: ConnectionDiagnostic;
  error: Error | null;
}

interface ProtocolContextValue {
  status: () => ConnectionState;
  snapshot: () => ConnectionSnapshot;
  diagnostic: () => ConnectionDiagnostic;
  error: () => Error | null;
  session: () => Session | null;
  rpcTransport: () => Session['rpc'] | null;
  contract: () => ProtocolContract;
  connect: (config: ConnectConfig) => Promise<void>;
  replaceConnection: (config: ConnectConfig) => Promise<void>;
  retryNow: () => boolean;
  disconnect: () => void;
}

export interface ConnectionLifecycle {
  synchronize(snapshot: ConnectionSnapshot): void;
  dispose(): void;
}

export type ConnectConfig = Readonly<{
  source: ArtifactSource;
  controller?: ConnectionControllerOptions;
  lifecycle?: ConnectionLifecycle;
}>;

export class ConnectionReplacementRequiredError extends Error {
  constructor() {
    super('Connection source or options changed; call replaceConnection() explicitly');
    this.name = 'ConnectionReplacementRequiredError';
  }
}

const ProtocolContext = createContext<ProtocolContextValue>();

const IDLE_SNAPSHOT: ConnectionSnapshot = Object.freeze({ state: 'idle', attempt: 0 });
const IDLE_DIAGNOSTIC: ConnectionDiagnostic = Object.freeze({ state: 'idle', attempt: 0 });

export function ProtocolProvider(props: { children: JSX.Element; contract: ProtocolContract }) {
  const [state, setState] = createStore<ProtocolState>({
    snapshot: IDLE_SNAPSHOT,
    diagnostic: IDLE_DIAGNOSTIC,
    error: null,
  });

  // eslint-disable-next-line solid/reactivity -- the contract is fixed for the provider lifetime.
  const contract = props.contract;
  let controller: ConnectionController | null = null;
  let unsubscribe: (() => void) | null = null;
  let currentConfig: ConnectConfig | null = null;
  let operation: Promise<void> | null = null;
  let lifecycleGeneration = 0;

  const ownsConnection = (
    owner: ConnectionController,
    config: ConnectConfig,
    generation: number
  ): boolean =>
    controller === owner && currentConfig === config && lifecycleGeneration === generation;

  const publish = (
    snapshot: ConnectionSnapshot,
    owner: ConnectionController,
    config: ConnectConfig,
    generation: number,
    runtime: FlowersecBrowserRuntime
  ) => {
    if (!ownsConnection(owner, config, generation)) return;
    try {
      config.lifecycle?.synchronize(snapshot);
      if (!ownsConnection(owner, config, generation)) return;
      const diagnostic = runtime.connectionDiagnostic(snapshot);
      setState({
        snapshot,
        diagnostic,
        error: errorFromSnapshot(snapshot, diagnostic, runtime),
      });
    } catch (error) {
      const normalized =
        error instanceof Error ? error : new Error('Floe connection binding failed');
      config.lifecycle?.dispose();
      if (ownsConnection(owner, config, generation)) {
        const failedSnapshot: ConnectionSnapshot = Object.freeze({
          state: 'failed',
          attempt: snapshot.attempt,
          failure: Object.freeze({ phase: 'artifact', code: 'connected_acquisition_failed' }),
          retryDisposition: Object.freeze({ kind: 'terminal' }),
        });
        setState({
          snapshot: failedSnapshot,
          diagnostic: runtime.connectionDiagnostic(failedSnapshot),
          error: normalized,
        });
      }
      void owner.close();
    }
  };

  const closeController = async () => {
    const generation = lifecycleGeneration;
    unsubscribe?.();
    unsubscribe = null;
    const activeController = controller;
    const activeConfig = currentConfig;
    controller = null;
    currentConfig = null;
    activeConfig?.lifecycle?.dispose();
    if (activeController !== null) await activeController.close();
    if (generation === lifecycleGeneration && controller === null && currentConfig === null) {
      setState({ snapshot: IDLE_SNAPSHOT, diagnostic: IDLE_DIAGNOSTIC, error: null });
    }
  };

  const start = async (config: ConnectConfig) => {
    const generation = lifecycleGeneration;
    const runtime = await loadBrowserRuntime();
    if (generation !== lifecycleGeneration) return;
    const nextController = await runtime.createConnectionController(
      config.source,
      config.controller
    );
    if (generation !== lifecycleGeneration) {
      await nextController.close();
      return;
    }
    currentConfig = config;
    controller = nextController;
    unsubscribe = nextController.subscribe((snapshot) =>
      publish(snapshot, nextController, config, generation, runtime)
    );
    nextController.start();
    await nextController.waitForSession();
  };

  const connect = async (config: ConnectConfig) => {
    if (
      controller !== null &&
      currentConfig !== null &&
      !sameConnectionConfig(currentConfig, config)
    ) {
      throw new ConnectionReplacementRequiredError();
    }
    if (operation !== null) return operation;
    operation = (async () => {
      if (controller === null) {
        await start(config);
        return;
      }
      controller.start();
      await controller.waitForSession();
    })().finally(() => {
      operation = null;
    });
    return operation;
  };

  const replaceConnection = async (config: ConnectConfig) => {
    if (operation !== null) await operation.catch(() => undefined);
    operation = (async () => {
      lifecycleGeneration += 1;
      await closeController();
      lifecycleGeneration += 1;
      await start(config);
    })().finally(() => {
      operation = null;
    });
    return operation;
  };

  const retryNow = (): boolean => controller?.retryNow() ?? false;

  const disconnect = () => {
    lifecycleGeneration += 1;
    void closeController();
  };

  const value: ProtocolContextValue = {
    status: () => state.snapshot.state,
    snapshot: () => state.snapshot,
    diagnostic: () => state.diagnostic,
    error: () => state.error,
    session: () => state.snapshot.currentSession ?? null,
    rpcTransport: () => state.snapshot.currentSession?.rpc ?? null,
    contract: () => contract,
    connect,
    replaceConnection,
    retryNow,
    disconnect,
  };

  onCleanup(() => {
    lifecycleGeneration += 1;
    unsubscribe?.();
    const config = currentConfig;
    config?.lifecycle?.dispose();
    void controller?.close();
  });

  return createComponent(ProtocolContext.Provider, {
    value,
    get children() {
      return props.children;
    },
  });
}

export function useProtocol(): ProtocolContextValue {
  const context = useContext(ProtocolContext);
  if (!context) throw new Error('useProtocol must be used within a ProtocolProvider');
  return context;
}

function sameConnectionConfig(left: ConnectConfig, right: ConnectConfig): boolean {
  return (
    left.source === right.source &&
    left.controller === right.controller &&
    left.lifecycle === right.lifecycle
  );
}

function errorFromSnapshot(
  snapshot: ConnectionSnapshot,
  diagnostic: ConnectionDiagnostic,
  runtime: FlowersecBrowserRuntime
): Error | null {
  const failure = snapshot.failure;
  return failure === undefined || (snapshot.state !== 'failed' && snapshot.state !== 'closed')
    ? null
    : new runtime.ConnectionControllerError(
        snapshot.state === 'closed' ? 'closed' : 'failed',
        failure,
        snapshot.retryDisposition,
        diagnostic
      );
}
