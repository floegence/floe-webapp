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

export type ArtifactSource = Readonly<{
  kind: ArtifactSourceKind;
  getArtifact: (ctx: ArtifactRequestContext) => Promise<ConnectArtifact>;
}>;

type ArtifactRequestCorrelation = Readonly<{
  traceId?: string;
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
): ArtifactSource {
  return {
    kind,
    getArtifact,
  };
}

export function createFixedArtifactSource(artifact: ConnectArtifact): ArtifactSource {
  return createArtifactSourceFromFactory(async () => artifact, 'fixed');
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
