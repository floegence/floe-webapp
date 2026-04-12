import { beforeEach, describe, expect, it, vi } from 'vitest';

const assertProxyRuntimeScopeV1 = vi.fn();

vi.mock('@floegence/flowersec-core/proxy', () => ({
  assertProxyRuntimeScopeV1,
}));

describe('boot scope helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates proxy.runtime scope entries with the shared flowersec contract', async () => {
    const mod = await import('../src/index');
    const entry = {
      scope_version: 1,
      payload: { runtime_origin: 'https://runtime.example.com' },
    } as const;

    mod.validateProxyRuntimeScopeEntry(entry);

    expect(assertProxyRuntimeScopeV1).toHaveBeenCalledWith(entry.payload);
  });

  it('rejects unsupported proxy.runtime scope versions before delegating payload validation', async () => {
    const mod = await import('../src/index');

    expect(() =>
      mod.validateProxyRuntimeScopeEntry({
        scope_version: 2,
        payload: {},
      }),
    ).toThrow('unsupported proxy.runtime scope_version: 2');
    expect(assertProxyRuntimeScopeV1).not.toHaveBeenCalled();
  });

  it('preserves extra scope resolvers while enforcing the shared proxy.runtime validator', async () => {
    const mod = await import('../src/index');
    const customScopeResolver = vi.fn();

    const resolvers = mod.createBootstrapScopeResolvers({
      custom: customScopeResolver,
      [mod.PROXY_RUNTIME_SCOPE_NAME]: vi.fn(),
    });

    expect(resolvers.custom).toBe(customScopeResolver);
    expect(resolvers[mod.PROXY_RUNTIME_SCOPE_NAME]).toBe(mod.validateProxyRuntimeScopeEntry);
  });
});
