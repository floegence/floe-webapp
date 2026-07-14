import type {
  DirectBrowserReconnectConfig,
  DirectConnectBrowserOptions,
  TunnelBrowserReconnectConfig,
  TunnelConnectBrowserOptions,
} from '@floegence/flowersec-core/browser';
import type { ClientObserverLike } from '@floegence/flowersec-core/observability';
import type { ArtifactSource, AutoReconnectConfig } from '@floegence/flowersec-core/reconnect';
import { createBootstrapScopeResolvers, type ScopeResolverMap } from './scope';

type SharedArtifactReconnectOptions = Readonly<{
  source: ArtifactSource;
  observer?: ClientObserverLike;
  autoReconnect?: AutoReconnectConfig;
}>;

type TunnelArtifactConnectOptions = Omit<TunnelConnectBrowserOptions, 'observer' | 'signal'>;
type DirectArtifactConnectOptions = Omit<DirectConnectBrowserOptions, 'observer' | 'signal'>;

export type TunnelArtifactReconnectOptions = SharedArtifactReconnectOptions &
  Readonly<{
    connect?: TunnelArtifactConnectOptions;
  }>;

export type DirectArtifactReconnectOptions = SharedArtifactReconnectOptions &
  Readonly<{
    connect?: DirectArtifactConnectOptions;
  }>;

export function createArtifactTunnelReconnectConfig(
  options: TunnelArtifactReconnectOptions
): TunnelBrowserReconnectConfig {
  return {
    source: options.source,
    ...(options.observer === undefined ? {} : { observer: options.observer }),
    ...(options.autoReconnect === undefined ? {} : { autoReconnect: options.autoReconnect }),
    ...(options.connect === undefined ? {} : { connect: options.connect }),
  };
}

export function createProxyRuntimeTunnelReconnectConfig(
  options: TunnelArtifactReconnectOptions
): TunnelBrowserReconnectConfig {
  const connect = options.connect;
  return createArtifactTunnelReconnectConfig({
    ...options,
    connect: {
      ...(connect ?? {}),
      scopeResolvers: createBootstrapScopeResolvers(
        connect?.scopeResolvers as ScopeResolverMap | undefined
      ),
    },
  });
}

export function createArtifactDirectReconnectConfig(
  options: DirectArtifactReconnectOptions
): DirectBrowserReconnectConfig {
  return {
    source: options.source,
    ...(options.observer === undefined ? {} : { observer: options.observer }),
    ...(options.autoReconnect === undefined ? {} : { autoReconnect: options.autoReconnect }),
    ...(options.connect === undefined ? {} : { connect: options.connect }),
  };
}
