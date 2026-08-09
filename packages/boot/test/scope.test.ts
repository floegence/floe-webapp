import { beforeEach, describe, expect, it, vi } from 'vitest';

const assertProxyRuntimeScope = vi.fn();
const PROXY_RUNTIME_SCOPE = { version: 2 };

vi.mock('@floegence/flowersec-core/proxy', () => ({ assertProxyRuntimeScope, PROXY_RUNTIME_SCOPE }));

describe('boot scope helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates proxy.runtime scope entries with the current Flowersec contract', async () => {
    const mod = await import('../src/index');
    const entry = { scope_version: 2, payload: { runtime_origin: 'https://runtime.example.com' } } as const;
    mod.validateProxyRuntimeScopeEntry(entry);
    expect(assertProxyRuntimeScope).toHaveBeenCalledWith(entry.payload);
  });

  it('rejects unsupported scope versions before payload validation', async () => {
    const mod = await import('../src/index');
    expect(() => mod.validateProxyRuntimeScopeEntry({ scope_version: 1, payload: {} })).toThrow(/unsupported/u);
    expect(assertProxyRuntimeScope).not.toHaveBeenCalled();
  });
});
