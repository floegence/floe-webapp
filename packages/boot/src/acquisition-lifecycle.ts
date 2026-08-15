import type { ArtifactSource, ConnectionSnapshot } from '@floegence/flowersec-core';
import {
  AcquisitionError,
  clearAcquisitionSource,
  ConnectedAcquisition,
  synchronizeAcquisitionSourceSnapshot,
} from './acquisition';
import {
  closeProxyBootstrap,
  ProxyBootstrapOwner,
  synchronizeProxyBootstrap,
} from './proxy-bootstrap';

export interface AcquisitionConnectionLifecycle {
  synchronize(snapshot: ConnectionSnapshot): void;
  dispose(): void;
}

export type AcquisitionConnectionLifecycleOptions = Readonly<{
  proxyBootstrap?: ProxyBootstrapOwner;
  onConnected?: (acquisition: ConnectedAcquisition) => void;
}>;

export function createAcquisitionConnectionLifecycle(
  source: ArtifactSource,
  options: AcquisitionConnectionLifecycleOptions = {},
): AcquisitionConnectionLifecycle {
  let disposed = false;
  let current: ConnectedAcquisition | null = null;
  return Object.freeze({
    synchronize(snapshot: ConnectionSnapshot): void {
      if (disposed) throw new AcquisitionError('acquisition_lifecycle_disposed');
      const acquisition = synchronizeAcquisitionSourceSnapshot(source, snapshot);
      if (snapshot.state === 'connected' && acquisition === null) {
        throw new AcquisitionError('connected_acquisition_missing');
      }
      if (options.proxyBootstrap !== undefined) synchronizeProxyBootstrap(options.proxyBootstrap, acquisition);
      if (acquisition !== null && acquisition !== current) options.onConnected?.(acquisition);
      current = acquisition;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      current = null;
      if (options.proxyBootstrap !== undefined) closeProxyBootstrap(options.proxyBootstrap);
      clearAcquisitionSource(source);
    },
  });
}
