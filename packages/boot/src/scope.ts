import {
  assertProxyRuntimeScope,
  PROXY_RUNTIME_SCOPE,
  type ProxyRuntimeScope,
} from '@floegence/flowersec-core/proxy';

export const PROXY_RUNTIME_SCOPE_NAME = 'proxy.runtime';

export type ScopeEnvelope = Readonly<{
  scope: string;
  scope_version: number;
  critical: boolean;
  payload: unknown;
}>;

export type ValidatedCriticalScopeProjection = Readonly<{
  scope: 'proxy.runtime';
  scope_version: 2;
  critical: true;
  payload: ProxyRuntimeScope;
}>;

export type ScopeResolver = (entry: ScopeEnvelope) => ValidatedCriticalScopeProjection;

export type ScopeResolverMap = Readonly<Record<string, ScopeResolver>>;

export function validateProxyRuntimeScopeEntry(entry: ScopeEnvelope): ValidatedCriticalScopeProjection {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry) ||
      Object.keys(entry).length !== 4 ||
      !Object.keys(entry).every((key) => ['scope', 'scope_version', 'critical', 'payload'].includes(key))) {
    throw new TypeError(`invalid ${PROXY_RUNTIME_SCOPE_NAME} projection envelope`);
  }
  if (entry.scope !== PROXY_RUNTIME_SCOPE.name || entry.scope_version !== PROXY_RUNTIME_SCOPE.version || entry.critical !== true) {
    throw new TypeError(`unsupported ${PROXY_RUNTIME_SCOPE_NAME} critical scope projection`);
  }
  return Object.freeze({
    scope: PROXY_RUNTIME_SCOPE.name,
    scope_version: PROXY_RUNTIME_SCOPE.version,
    critical: true,
    payload: assertProxyRuntimeScope(entry.payload),
  });
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
