import { describe, expect, it, vi } from 'vitest';

const leases: Array<{ commitSpend: (signal?: AbortSignal) => Promise<void> }> = [];
const connect = vi.fn(async (lease: { commitSpend: (signal?: AbortSignal) => Promise<void> }) => {
  await lease.commitSpend();
  return {
    close: vi.fn(async () => {}),
    waitTermination: vi.fn(async () => ({ error: { code: 'closed' } })),
    rpc: {},
  };
});

vi.mock('@floegence/flowersec-core', () => ({
  parseArtifact: (value: string | Uint8Array) => ({ value }),
  createArtifactLease: (_artifact: unknown, commitSpend: (signal?: AbortSignal) => Promise<void>) => {
    const lease = { commitSpend };
    leases.push(lease);
    return lease;
  },
}));

vi.mock('@floegence/flowersec-core/proxy', () => ({
  assertProxyRuntimeScope: (payload: unknown) => payload,
  PROXY_RUNTIME_SCOPE: { name: 'proxy.runtime', version: 2 },
}));

vi.mock('@floegence/flowersec-core/browser', () => ({ connect }));

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

async function digest(value: string): Promise<string> {
  const result = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return encodeBase64Url(new Uint8Array(result));
}

const context = {
  envPublicId: 'env_demo',
  floeApp: 'com.example.demo',
  codeSpaceId: 'space_demo',
  appPath: '/app',
  launcherKind: 'cs' as const,
  launcherId: 'launcher_demo',
  launcherOrigin: 'https://launcher.example.com',
  runtimeOrigin: 'https://runtime.example.com',
  appOrigin: 'https://app.example.com',
  validateTargetBinding: vi.fn(),
};

async function buildRawHandoff(): Promise<string> {
  const artifact = 'opaque-artifact';
  const projection = JSON.stringify({
    scope: 'proxy.runtime',
    scope_version: 2,
    critical: true,
    payload: {
      mode: 'service_worker',
      appBasePath: '/app',
      serviceWorker: { scriptUrl: '/proxy-sw.js', scope: '/' },
    },
  });
  const envelope = {
    v: 1,
    connect_artifact: artifact,
    critical_scope_projection_json: projection,
    spend_scope: {
      v: 1,
      receipt: `r1.k.${encodeBase64Url(new Uint8Array(32).fill(9))}`,
      artifact_digest_b64u: await digest(artifact),
      projection_digest_b64u: await digest(projection),
      launcher_origin: context.launcherOrigin,
      runtime_origin: context.runtimeOrigin,
      app_origin: context.appOrigin,
      consumer: 'isolated' as const,
      target_binding: { env_public_id: context.envPublicId },
      expires_at: '2099-01-01T00:00:00Z',
    },
  };
  const payload = {
    v: 6,
    env_public_id: context.envPublicId,
    floe_app: context.floeApp,
    code_space_id: context.codeSpaceId,
    app_path: context.appPath,
    launcher_kind: context.launcherKind,
    launcher_id: context.launcherId,
    launcher_origin: context.launcherOrigin,
    runtime_origin: context.runtimeOrigin,
    app_origin: context.appOrigin,
    acquisition: envelope,
  };
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

describe('isolated one-shot acquisition', () => {
  it('clears the handoff before decoding and permits one local materialization', async () => {
    leases.length = 0;
    connect.mockClear();
    const mod = await import('../src/index');
    const rawHandoff = await buildRawHandoff();
    const clear = vi.fn(() => true);
    const navigate = vi.fn();
    const commitSpend = vi.fn(async () => {});
    const acquisition = await mod.materializeIsolatedOneShot({
      rawHandoff,
      clearSensitiveLocation: clear,
      navigateToLauncher: navigate,
      validationContext: context,
      commitSpend,
    });
    expect(clear).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    expect(context.validateTargetBinding).toHaveBeenCalledOnce();
    const connected = await mod.connectIsolatedOneShot(acquisition);
    expect(connected).toBeDefined();
    expect(commitSpend).toHaveBeenCalledOnce();
    await expect(mod.connectIsolatedOneShot(acquisition)).rejects.toMatchObject({ code: 'isolated_acquisition_consumed' });
    await expect(mod.materializeIsolatedOneShot({
      rawHandoff,
      clearSensitiveLocation: () => true,
      navigateToLauncher: navigate,
      validationContext: context,
      commitSpend,
    })).rejects.toMatchObject({ code: 'isolated_handoff_consumed' });
  });

  it('never parses or materializes when location cleanup fails', async () => {
    leases.length = 0;
    const mod = await import('../src/index');
    const navigate = vi.fn();
    const commitSpend = vi.fn(async () => {});
    await expect(mod.materializeIsolatedOneShot({
      rawHandoff: 'not-decoded-yet',
      clearSensitiveLocation: () => false,
      navigateToLauncher: navigate,
      validationContext: context,
      commitSpend,
    })).rejects.toMatchObject({ code: 'isolated_location_clear_failed' });
    expect(navigate).toHaveBeenCalledOnce();
    expect(commitSpend).not.toHaveBeenCalled();
    expect(leases).toHaveLength(0);
  });
});
