import { beforeEach, describe, expect, it, vi } from 'vitest';

const assertProxyRuntimeScope = vi.fn();
const PROXY_RUNTIME_SCOPE = { name: 'proxy.runtime', version: 2 };

vi.mock('@floegence/flowersec-core/proxy', () => ({ assertProxyRuntimeScope, PROXY_RUNTIME_SCOPE }));

describe('boot scope helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates proxy.runtime scope entries with the current Flowersec contract', async () => {
    const mod = await import('../src/index');
    const entry = {
      scope: 'proxy.runtime',
      scope_version: 2,
      critical: true,
      payload: { mode: 'controller_bridge', controllerBridge: { allowedOrigins: ['https://app.example.com'] } },
    } as const;
    expect(mod.validateProxyRuntimeScopeEntry(entry)).toMatchObject({ scope: 'proxy.runtime', scope_version: 2, critical: true });
    expect(assertProxyRuntimeScope).toHaveBeenCalledWith(entry.payload);
  });

  it('rejects unsupported scope versions before payload validation', async () => {
    const mod = await import('../src/index');
    expect(() => mod.validateProxyRuntimeScopeEntry({ scope: 'proxy.runtime', scope_version: 1, critical: true, payload: {} })).toThrow(/unsupported/u);
    expect(assertProxyRuntimeScope).not.toHaveBeenCalled();
  });
});
