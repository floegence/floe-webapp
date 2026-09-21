import type { FetchServerSentEventsOptions, ServerSentEvent } from './server-sent-events';
import type { ConnectionSnapshot } from '@floegence/flowersec-core';
import { createSessionHealthMonitor } from './session-health';
import {
  type AcquisitionSource,
  AcquisitionError,
  clearAcquisitionSource,
  ConnectedAcquisition,
  synchronizeAcquisitionSourceSnapshot,
} from './acquisition';
import {
  closeProxyBootstrap,
  createProxyBootstrapOwner,
  fetchProxyBootstrap,
  readProxyBootstrapEvents,
  ProxyBootstrapOwner,
  synchronizeProxyBootstrap,
} from './proxy-bootstrap';

export interface AcquisitionConnectionLifecycle {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  events(input: RequestInfo | URL, options?: Omit<FetchServerSentEventsOptions, 'fetch'>): AsyncGenerator<ServerSentEvent>;
  synchronize(snapshot: ConnectionSnapshot): void;
  dispose(): void;
}

export type AcquisitionConnectionLifecycleOptions = Readonly<{
  proxyBootstrap?: ProxyBootstrapOwner;
  onConnected?: (acquisition: ConnectedAcquisition) => void;
}>;

export function createAcquisitionConnectionLifecycle(
  source: AcquisitionSource,
  options: AcquisitionConnectionLifecycleOptions = {}
): AcquisitionConnectionLifecycle {
  let disposed = false;
  let current: ConnectedAcquisition | null = null;
  const health = createSessionHealthMonitor();
  const proxyBootstrap = options.proxyBootstrap ?? createProxyBootstrapOwner();
  return Object.freeze({
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetchProxyBootstrap(proxyBootstrap, input, init),
    events: (input: RequestInfo | URL, eventOptions?: Omit<FetchServerSentEventsOptions, 'fetch'>) => readProxyBootstrapEvents(proxyBootstrap, input, eventOptions),
    synchronize(snapshot: ConnectionSnapshot): void {
      if (disposed) throw new AcquisitionError('acquisition_lifecycle_disposed');
      const acquisition = synchronizeAcquisitionSourceSnapshot(source, snapshot);
      if (snapshot.state === 'connected' && acquisition === null) {
        throw new AcquisitionError('connected_acquisition_missing');
      }
      synchronizeProxyBootstrap(proxyBootstrap, acquisition);
      if (acquisition !== null && acquisition !== current) options.onConnected?.(acquisition);
      current = acquisition;
      health.synchronize(snapshot.state === 'connected' ? snapshot.currentSession ?? null : null);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      current = null;
      health.dispose();
      closeProxyBootstrap(proxyBootstrap);
      clearAcquisitionSource(source);
    },
  });
}
