import { describe, expect, it, vi } from 'vitest';
import type { ProxyRuntime } from '@floegence/flowersec-core/proxy';
import {
  materializeAcquisitionForSource,
  registerAcquisitionSource,
  synchronizeAcquisitionSourceSnapshot,
} from '../src/acquisition';
import { fetchProxyBootstrap, closeProxyBootstrap, createProxyBootstrapOwner, synchronizeProxyBootstrap } from '../src/proxy-bootstrap';

// Only artifact cryptography is replaced; scope validation and proxy framing are real.
vi.mock('@floegence/flowersec-core', () => ({
  parseArtifact: (value: string | Uint8Array) => ({ value }),
  createArtifactLease: (_artifact: unknown, commitSpend: (signal?: AbortSignal) => Promise<void>) => ({ commitSpend }),
}));

function b64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}
async function digest(value: string): Promise<string> {
  return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}
function frame(value: unknown): Uint8Array {
  const json = new TextEncoder().encode(JSON.stringify(value));
  const result = new Uint8Array(4 + json.length + 4);
  new DataView(result.buffer).setUint32(0, json.length);
  result.set(json, 4);
  return result;
}

async function connected(http?: unknown) {
  const projection = JSON.stringify({
    scope: 'proxy.runtime', scope_version: 2, critical: true,
    payload: {
      version: 2, mode: 'service_worker', appBasePath: '/app/',
      serviceWorker: { scriptUrl: '/proxy-sw.js', scope: '/' },
      ...(http === undefined ? {} : { http }),
    },
  });
  const source = { acquire: async () => ({ kind: 'failure', code: 'unused', disposition: { kind: 'terminal' } }) } as never;
  registerAcquisitionSource(source);
  const lease = await materializeAcquisitionForSource(source, {
    v: 1, connect_artifact: 'opaque', critical_scope_projection_json: projection,
    spend_scope: {
      v: 1, receipt: `r1.k.${b64(new Uint8Array(32).fill(3))}`,
      artifact_digest_b64u: await digest('opaque'), projection_digest_b64u: await digest(projection),
      launcher_origin: 'https://launcher.example', runtime_origin: 'https://runtime.example',
      app_origin: 'https://app.example', consumer: 'trusted', target_binding: { target: 'example' },
      expires_at: '2099-01-01T00:00:00Z',
    },
  }, { expectedConsumer: 'trusted', commitSpend: async () => {}, validateSpendBinding: () => 'bound-target' });
  const requests: unknown[] = [];
  const session = {
    openStream: vi.fn(async () => {
      const writes: Uint8Array[] = [];
      let read = false;
      return {
        kind: 'http', terminalError: undefined,
        write: async (bytes: Uint8Array) => { writes.push(bytes.slice()); return bytes.length; },
        read: async () => {
          if (read) return null;
          read = true;
          const bytes = new Uint8Array(writes.reduce((n, chunk) => n + chunk.length, 0));
          let offset = 0;
          for (const chunk of writes) { bytes.set(chunk, offset); offset += chunk.length; }
          const length = new DataView(bytes.buffer).getUint32(0);
          const request = JSON.parse(new TextDecoder().decode(bytes.slice(4, 4 + length))) as { request_id: string };
          requests.push(request);
          return frame({ v: 1, request_id: request.request_id, ok: true, status: 200, headers: [] });
        },
        close: async () => {}, closeWrite: async () => {}, reset: async () => {},
      };
    }),
    rpc: {}, close: async () => {}, waitTermination: () => new Promise(() => {}),
  };
  await (lease as unknown as { commitSpend(): Promise<void> }).commitSpend();
  const acquisition = synchronizeAcquisitionSourceSnapshot(source, {
    state: 'connected', attempt: 1, currentSession: session as never,
  });
  if (!acquisition) throw new Error('missing connected acquisition');
  return { acquisition, session, requests };
}

async function request(runtime: ProxyRuntime, path: string): Promise<Record<string, unknown>[]> {
  const channel = new MessageChannel();
  const messages = new Promise<Record<string, unknown>[]>((resolve, reject) => {
    const result: Record<string, unknown>[] = [];
    const timer = setTimeout(() => { channel.port2.close(); reject(new Error('proxy response timeout')); }, 1000);
    channel.port2.onmessage = (event: MessageEvent<Record<string, unknown>>) => {
      result.push(event.data);
      if (event.data.type === 'flowersec-proxy:response_end' || event.data.type === 'flowersec-proxy:response_error') {
        clearTimeout(timer); channel.port2.close(); resolve(result);
      }
    };
  });
  runtime.dispatchFetch({
    id: 'catalog', method: 'POST', path,
    headers: [
      { name: 'X-Platform-CSRF', value: 'proof' },
      { name: 'Authorization', value: 'must-not-forward' },
    ], body: new TextEncoder().encode('{}').buffer,
  }, channel.port1);
  return messages;
}

describe('acquisition-bound HTTP proxy authority', () => {
  it('keeps acquisitions without HTTP additions restricted to the application base', async () => {
    const current = await connected();
    const bindings: ProxyRuntime[] = [];
    const owner = createProxyBootstrapOwner({ serviceWorker: ({ runtime }) => {
      bindings.push(runtime);
      return { dispose: () => {} };
    } });
    try {
      synchronizeProxyBootstrap(owner, current.acquisition);
      expect(await request(bindings[0]!, '/platform/api/catalog/query')).toContainEqual(expect.objectContaining({ status: 403 }));
      expect(await request(bindings[0]!, '/app/catalog')).toContainEqual(expect.objectContaining({ status: 200 }));
      expect(current.requests).toEqual([expect.objectContaining({ headers: [] })]);
    } finally { closeProxyBootstrap(owner); }
  });

  it('uses the same authority for direct session fetch without a browser binding', async () => {
    const current = await connected({ additionalPathPrefixes: ['/platform/api/'], extraRequestHeaders: ['X-Platform-CSRF'] });
    const owner = createProxyBootstrapOwner();
    try {
      expect(synchronizeProxyBootstrap(owner, current.acquisition)?.mode).toBe('session');
      const response = await fetchProxyBootstrap(owner, 'https://app.example/platform/api/catalog', {
        method: 'POST', headers: { 'X-Platform-CSRF': 'proof', Authorization: 'must-not-forward', 'Content-Type': 'application/json' }, body: '{}',
      });
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('');
      expect(current.requests).toEqual([expect.objectContaining({ headers: [
        { name: 'content-type', value: 'application/json' },
        { name: 'x-platform-csrf', value: 'proof' },
      ] })]);
      await expect(fetchProxyBootstrap(owner, 'https://untrusted.example/platform/api/catalog')).rejects.toThrow();
      await expect(fetchProxyBootstrap(owner, '/private/')).rejects.toThrow(/not allowed/);
      expect(current.session.openStream).toHaveBeenCalledTimes(1);
    } finally { closeProxyBootstrap(owner); }
    await expect(fetchProxyBootstrap(owner, '/app/')).rejects.toThrow('unavailable');
  });

  it('adds declared HTTP paths and headers, keeps WebSockets bounded, and replaces authority on reconnect', async () => {
    const first = await connected({ additionalPathPrefixes: ['/platform/api/'], extraRequestHeaders: ['X-Platform-CSRF'] });
    const bindings: ProxyRuntime[] = [];
    const dispose = vi.fn();
    const owner = createProxyBootstrapOwner({ serviceWorker: ({ runtime }) => { bindings.push(runtime); return { dispose }; } });
    try {
      expect(synchronizeProxyBootstrap(owner, first.acquisition)?.generation).toBe(1);
      const runtime = bindings[0]!;
      expect(await request(runtime, '/platform/api/catalog/query')).toContainEqual(expect.objectContaining({ status: 200 }));
      expect(first.requests).toEqual([expect.objectContaining({ headers: [{ name: 'x-platform-csrf', value: 'proof' }] })]);
      await expect(runtime.openWebSocketStream('/platform/api/events')).rejects.toThrow(/not allowed/);
      expect(await request(runtime, '/private/')).toContainEqual(expect.objectContaining({ status: 403 }));
      expect(first.session.openStream).toHaveBeenCalledTimes(1);

      const second = await connected();
      expect(synchronizeProxyBootstrap(owner, second.acquisition)?.generation).toBe(2);
      expect(dispose).toHaveBeenCalledTimes(1);
      expect(await request(runtime, '/app/catalog')).toContainEqual(expect.objectContaining({ status: 503, code: 'closed' }));
      expect(await request(bindings[1]!, '/platform/api/catalog/query')).toContainEqual(expect.objectContaining({ status: 403 }));
      expect(await request(bindings[1]!, '/app/catalog')).toContainEqual(expect.objectContaining({ status: 200 }));
      expect(second.requests).toEqual([expect.objectContaining({ headers: [] })]);
    } finally { closeProxyBootstrap(owner); }
    expect(dispose).toHaveBeenCalledTimes(2);
  });
});
