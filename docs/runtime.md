# E2EE Boot Utilities & Flowersec Proxy Integration

This repo provides an optional helper package for bootstrapping Flowersec E2EE deployments (multi-window + sandbox flows):

- `@floegence/floe-webapp-boot`: small browser-side helpers for bootstrapping (hash/sessionStorage/postMessage).

Best practice:

- Keep low-level Flowersec building blocks in `@floegence/flowersec-core` (source of truth).
- Keep Floe Webapp packages focused on UI/protocol glue plus reusable browser bootstrap orchestration.
- Use `@floegence/floe-webapp-boot` for first-party browser bootstrap concerns such as shared reconnect config assembly and shared `proxy.runtime` scope validation.
- For proxy runtime mode (Service Worker + HTML injection + WS patch), keep the runtime itself integrated directly via `@floegence/flowersec-core/proxy`.

This document is aligned with `@floegence/flowersec-core@0.20.0`. Consumers must depend on `^0.20.0` or a later compatible release before adopting the artifact-first reconnect contracts described below.

---

## @floegence/floe-webapp-boot

Entry: `packages/boot/src/index.ts`

Exports:

- `parseHashParam(key)` / `parseBase64UrlJsonFromHash(key)` (read data from `location.hash`)
- `clearLocationHash()` (remove hash after reading)
- `getSessionStorage(key)` / `setSessionStorage(key, value)` / `removeSessionStorage(key)`
- `postMessageToOrigins(target, origins, message)`
- `waitForMessage({ expectedOrigins, expectedSource, timeoutMs, accept })`
- Flowersec `ArtifactSource` and `ArtifactAcquireContext` types
- `createControlplaneArtifactSource(config)`
- `createArtifactTunnelReconnectConfig(options)`
- `createProxyRuntimeTunnelReconnectConfig(options)`
- `createArtifactDirectReconnectConfig(options)`
- `FLOWERSEC_BOOTSTRAP_SCOPE_RESOLVERS`
- `createBootstrapScopeResolvers(extra?)`

### Example: read payload from hash and clear it

```ts
import {
  parseBase64UrlJsonFromHash,
  setSessionStorage,
  clearLocationHash,
} from '@floegence/floe-webapp-boot';

type BootPayload = { token: string; endpointId: string };

const payload = parseBase64UrlJsonFromHash<BootPayload>('boot');
if (payload) {
  setSessionStorage('floe.boot.payload', JSON.stringify(payload));
  clearLocationHash();
}
```

### Example: simple postMessage handshake

```ts
import { postMessageToOrigins, waitForMessage } from '@floegence/floe-webapp-boot';

// Child window side:
postMessageToOrigins(window.opener!, ['https://portal.example.com'], { type: 'boot_ready' });

const init = await waitForMessage({
  expectedOrigins: ['https://portal.example.com'],
  expectedSource: window.opener!,
  timeoutMs: 8000,
  accept: (data) => {
    if (typeof data !== 'object' || !data) return null;
    const msg = data as { type?: string; config?: unknown };
    if (msg.type !== 'boot_init') return null;
    return msg;
  },
});
```

### Example: artifact-first shared bootstrap

```ts
import {
  createControlplaneArtifactSource,
  createProxyRuntimeTunnelReconnectConfig,
} from '@floegence/floe-webapp-boot';

const source = createControlplaneArtifactSource({
  baseUrl: 'https://region.example.com',
  endpointId: 'env_demo',
  entryTicket: '<entry-ticket>',
  credentials: 'omit',
  payload: {
    app: 'example',
  },
});

const reconnectConfig = createProxyRuntimeTunnelReconnectConfig({
  source,
  connect: {
    handshakeTimeoutMs: 10_000,
  },
  autoReconnect: {
    enabled: true,
  },
});
```

Flowersec owns the shared `ArtifactSource` boundary and Boot reexports it unchanged:

```ts
type ArtifactSource =
  | { kind: 'once'; artifact: ConnectArtifact }
  | {
      kind: 'refreshable';
      acquire(context: ArtifactAcquireContext): Promise<ConnectArtifact>;
    };
```

This keeps `connect_artifact` acquisition reusable while leaving product policy outside the shared package.

### One-time and refreshable sources

Use a one-time source for a single connection attempt:

```ts
const source: ArtifactSource = { kind: 'once', artifact };
```

One-time sources are consumed once and cannot enable automatic reconnect. There is no opt-in that permits reusing the same artifact.

Use a refreshable controlplane source for reconnecting flows:

```ts
const source = createControlplaneArtifactSource({
  baseUrl: 'https://region.example.com',
  endpointId: 'env_demo',
  entryTicket: '<entry-ticket>',
});

const reconnectConfig = createArtifactTunnelReconnectConfig({
  source,
  autoReconnect: { enabled: true },
});
```

Product-owned acquisition is expressed directly with the shared refreshable contract:

```ts
const source: ArtifactSource = {
  kind: 'refreshable',
  acquire: async ({ signal, traceId }) => acquireArtifact({ signal, traceId }),
};
```

---

## Flowersec proxy runtime (recommended entrypoints)

Use `@floegence/flowersec-core` directly:

```ts
import {
  createProxyRuntime,
  createProxyServiceWorkerScript,
  registerServiceWorkerAndEnsureControl,
} from '@floegence/flowersec-core/proxy';

// `client` is a Flowersec Client (e.g. from `useProtocol().client()`).
const runtime = createProxyRuntime({ client });
(window as any).__flowersecProxyRuntime = runtime;

// Serve this script at "/_proxy/sw.js" (same-origin).
const swScript = createProxyServiceWorkerScript({
  sameOriginOnly: true,
  passthrough: { prefixes: ['/assets/', '/api/'], paths: ['/_proxy/sw.js'] },
  injectHTML: {
    mode: 'external_script',
    scriptUrl: '/_proxy/inject.js',
    excludePathPrefixes: ['/_proxy/'],
  },
});

await registerServiceWorkerAndEnsureControl({ scriptUrl: '/_proxy/sw.js', scope: '/' });
```

For `external_script` and `external_module` injection, `scriptUrl` is intentionally a root-relative current-origin path such as `/_proxy/inject.js`. Keep it on the same origin controlled by the Service Worker; Flowersec rejects absolute, protocol-relative, or attribute-breaking URLs before generating the worker script.

Ownership boundary:

- Flowersec owns `ArtifactSource`; `@floegence/floe-webapp-boot` reexports it and owns first-party browser bootstrap assembly.
- `@floegence/flowersec-core/proxy` still owns the proxy runtime itself.
- Product repositories still own trusted-launcher routing, entry-ticket policy, recovery UX, and runtime-isolation payloads.
