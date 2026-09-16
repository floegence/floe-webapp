import type { ArtifactSource } from '@floegence/flowersec-core';
import type {
  ConnectionControllerOptions,
  HTTPDirectArtifactSourceV1,
  HTTPDirectConnectionControllerOptionsV1,
  PrivateLoopbackArtifactSourceV1,
  PrivateLoopbackConnectionControllerOptionsV1,
} from '@floegence/flowersec-core/browser';
import {
  createAcquisitionConnectionLifecycle,
  type AcquisitionConnectionLifecycle,
} from './acquisition-lifecycle';
import type { ConnectedAcquisition } from './acquisition';
import type { ProxyBootstrapOwner } from './proxy-bootstrap';

type SharedFlowersecConnectionConfig = Readonly<{
  lifecycle: AcquisitionConnectionLifecycle;
}>;

export type FlowersecConnectionConfig = SharedFlowersecConnectionConfig &
  (
    | Readonly<{
        source: ArtifactSource;
        controller?: ConnectionControllerOptions;
        privateLoopback?: never;
        httpDirect?: never;
      }>
    | Readonly<{
        source: PrivateLoopbackArtifactSourceV1;
        privateLoopback: PrivateLoopbackConnectionControllerOptionsV1;
        httpDirect?: never;
        controller?: never;
      }>
    | Readonly<{
        source: HTTPDirectArtifactSourceV1;
        httpDirect: HTTPDirectConnectionControllerOptionsV1;
        privateLoopback?: never;
        controller?: never;
      }>
  );

type AcquisitionConnectionOptions = Readonly<{
  source: ArtifactSource;
  controller?: ConnectionControllerOptions;
  onConnected?: (acquisition: ConnectedAcquisition) => void;
}>;

export type TunnelArtifactConnectionOptions = AcquisitionConnectionOptions;
export type DirectArtifactConnectionOptions = AcquisitionConnectionOptions;

export type PrivateLoopbackDirectConnectionOptions = Readonly<{
  source: PrivateLoopbackArtifactSourceV1;
  privateLoopback: PrivateLoopbackConnectionControllerOptionsV1;
  onConnected?: (acquisition: ConnectedAcquisition) => void;
}>;

export type HTTPDirectConnectionOptions = Readonly<{
  source: HTTPDirectArtifactSourceV1;
  httpDirect: HTTPDirectConnectionControllerOptionsV1;
  onConnected?: (acquisition: ConnectedAcquisition) => void;
}>;

export function createHTTPDirectConnectionConfig(
  options: HTTPDirectConnectionOptions
): FlowersecConnectionConfig {
  return Object.freeze({
    source: options.source,
    httpDirect: options.httpDirect,
    lifecycle: createAcquisitionConnectionLifecycle(options.source, {
      ...(options.onConnected === undefined ? {} : { onConnected: options.onConnected }),
    }),
  });
}

export type ProxyRuntimeTunnelConnectionOptions = AcquisitionConnectionOptions &
  Readonly<{
    proxyBootstrap: ProxyBootstrapOwner;
  }>;

export function createArtifactTunnelConnectionConfig(
  options: TunnelArtifactConnectionOptions
): FlowersecConnectionConfig {
  return withLifecycle(options);
}

export function createProxyRuntimeTunnelConnectionConfig(
  options: ProxyRuntimeTunnelConnectionOptions
): FlowersecConnectionConfig {
  return withLifecycle(options, options.proxyBootstrap);
}

export function createArtifactDirectConnectionConfig(
  options: DirectArtifactConnectionOptions
): FlowersecConnectionConfig {
  return withLifecycle(options);
}

export function createPrivateLoopbackDirectConnectionConfig(
  options: PrivateLoopbackDirectConnectionOptions
): FlowersecConnectionConfig {
  return Object.freeze({
    source: options.source,
    privateLoopback: options.privateLoopback,
    lifecycle: createAcquisitionConnectionLifecycle(options.source, {
      ...(options.onConnected === undefined ? {} : { onConnected: options.onConnected }),
    }),
  });
}

function withLifecycle(
  options: AcquisitionConnectionOptions,
  proxyBootstrap?: ProxyBootstrapOwner
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
