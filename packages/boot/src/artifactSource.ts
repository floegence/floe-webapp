import type {
  ConnectArtifact,
  ConnectArtifactRequestConfig,
  EntryConnectArtifactRequestConfig,
} from '@floegence/flowersec-core/browser';
import { requestConnectArtifact, requestEntryConnectArtifact } from '@floegence/flowersec-core/controlplane';

export type ArtifactRequestContext = Readonly<{
  signal?: AbortSignal;
  traceId?: string;
}>;

export type ArtifactSourceKind = 'controlplane' | 'entry_controlplane' | 'fixed' | 'factory';

export type ArtifactSourceMetadata = Readonly<{
  allowAutoReconnect?: boolean;
}>;

export type ArtifactSource = Readonly<{
  kind: ArtifactSourceKind;
  metadata?: ArtifactSourceMetadata;
  getArtifact: (ctx: ArtifactRequestContext) => Promise<ConnectArtifact>;
}>;

type ArtifactRequestCorrelation = Readonly<{
  traceId?: string;
}>;

export type FixedArtifactSourceOptions = Readonly<{
  allowAutoReconnect?: boolean;
}>;

function resolveCorrelation(
  current: ArtifactRequestCorrelation | undefined,
  traceId: string | undefined,
): ArtifactRequestCorrelation | undefined {
  const nextTraceId = String(traceId ?? current?.traceId ?? '').trim();
  if (!nextTraceId) return current;
  return { ...(current ?? {}), traceId: nextTraceId };
}

export function createArtifactSourceFromFactory(
  getArtifact: (ctx: ArtifactRequestContext) => Promise<ConnectArtifact>,
  kind: ArtifactSourceKind = 'factory',
  metadata?: ArtifactSourceMetadata,
): ArtifactSource {
  return {
    kind,
    ...(metadata === undefined ? {} : { metadata }),
    getArtifact,
  };
}

export function createFixedArtifactSource(
  artifact: ConnectArtifact,
  options?: FixedArtifactSourceOptions,
): ArtifactSource {
  return createArtifactSourceFromFactory(
    async () => artifact,
    'fixed',
    options?.allowAutoReconnect ? { allowAutoReconnect: true } : undefined,
  );
}

export function createControlplaneArtifactSource(config: ConnectArtifactRequestConfig): ArtifactSource {
  return createArtifactSourceFromFactory(
    async ({ signal, traceId }) =>
      requestConnectArtifact({
        ...config,
        ...(signal === undefined ? {} : { signal }),
        ...(resolveCorrelation(config.correlation, traceId) === undefined
          ? {}
          : { correlation: resolveCorrelation(config.correlation, traceId) }),
      }),
    'controlplane',
  );
}

export function createEntryControlplaneArtifactSource(config: EntryConnectArtifactRequestConfig): ArtifactSource {
  return createArtifactSourceFromFactory(
    async ({ signal, traceId }) =>
      requestEntryConnectArtifact({
        ...config,
        ...(signal === undefined ? {} : { signal }),
        ...(resolveCorrelation(config.correlation, traceId) === undefined
          ? {}
          : { correlation: resolveCorrelation(config.correlation, traceId) }),
      }),
    'entry_controlplane',
  );
}
