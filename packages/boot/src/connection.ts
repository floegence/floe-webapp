import type { ArtifactSource } from '@floegence/flowersec-core';
import type { ConnectionControllerOptions } from '@floegence/flowersec-core/browser';
import {
  createAcquisitionConnectionLifecycle,
  type AcquisitionConnectionLifecycle,
} from './acquisition-lifecycle';
import type { ConnectedAcquisition } from './acquisition';
import type { ProxyBootstrapOwner } from './proxy-bootstrap';

export type FlowersecConnectionConfig = Readonly<{
  source: ArtifactSource;
  controller?: ConnectionControllerOptions;
  lifecycle: AcquisitionConnectionLifecycle;
}>;

type AcquisitionConnectionOptions = Readonly<{
  source: ArtifactSource;
  controller?: ConnectionControllerOptions;
  onConnected?: (acquisition: ConnectedAcquisition) => void;
}>;

export type TunnelArtifactConnectionOptions = AcquisitionConnectionOptions;
export type DirectArtifactConnectionOptions = AcquisitionConnectionOptions;

export type ProxyRuntimeTunnelConnectionOptions = AcquisitionConnectionOptions & Readonly<{
  proxyBootstrap: ProxyBootstrapOwner;
}>;

export function createArtifactTunnelConnectionConfig(
  options: TunnelArtifactConnectionOptions,
): FlowersecConnectionConfig {
  return withLifecycle(options);
}

export function createProxyRuntimeTunnelConnectionConfig(
  options: ProxyRuntimeTunnelConnectionOptions,
): FlowersecConnectionConfig {
  return withLifecycle(options, options.proxyBootstrap);
}

export function createArtifactDirectConnectionConfig(
  options: DirectArtifactConnectionOptions,
): FlowersecConnectionConfig {
  return withLifecycle(options);
}

function withLifecycle(
  options: AcquisitionConnectionOptions,
  proxyBootstrap?: ProxyBootstrapOwner,
): FlowersecConnectionConfig {
  return Object.freeze({
    source: options.source,
    ...(options.controller === undefined ? {} : { controller: options.controller }),
    lifecycle: createAcquisitionConnectionLifecycle(options.source, {
      ...(proxyBootstrap === undefined ? {} : { proxyBootstrap }),
      ...(options.onConnected === undefined ? {} : { onConnected: options.onConnected }),
    }),
  });
}
