import { assertProxyRuntimeScopeV1 } from '@floegence/flowersec-core/proxy';

export const PROXY_RUNTIME_SCOPE_NAME = 'proxy.runtime';

export type ScopeEnvelope = Readonly<{
  scope_version: number;
  payload: unknown;
}>;

export type ScopeResolver = (entry: ScopeEnvelope) => void;

export type ScopeResolverMap = Readonly<Record<string, ScopeResolver>>;

export function validateProxyRuntimeScopeEntry(entry: ScopeEnvelope): void {
  if (entry.scope_version !== 1) {
    throw new Error(`unsupported ${PROXY_RUNTIME_SCOPE_NAME} scope_version: ${entry.scope_version}`);
  }
  assertProxyRuntimeScopeV1(entry.payload as Record<string, unknown>);
}

export const FLOWERSEC_BOOTSTRAP_SCOPE_RESOLVERS = Object.freeze({
  [PROXY_RUNTIME_SCOPE_NAME]: validateProxyRuntimeScopeEntry,
} satisfies ScopeResolverMap);

export function createBootstrapScopeResolvers(extra?: ScopeResolverMap): ScopeResolverMap {
  if (!extra) return FLOWERSEC_BOOTSTRAP_SCOPE_RESOLVERS;
  return Object.freeze({
    ...extra,
    [PROXY_RUNTIME_SCOPE_NAME]: validateProxyRuntimeScopeEntry,
  });
}
