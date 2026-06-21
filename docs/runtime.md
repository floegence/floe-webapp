# E2EE Boot Utilities & Flowersec Proxy Integration

This repo provides an optional helper package for bootstrapping Flowersec E2EE deployments (multi-window + sandbox flows):

- `@floegence/floe-webapp-boot`: small browser-side helpers for bootstrapping (hash/sessionStorage/postMessage).

Best practice:

- Keep low-level Flowersec building blocks in `@floegence/flowersec-core` (source of truth).
- Keep Floe Webapp packages focused on UI/protocol glue plus reusable browser bootstrap orchestration.
- Use `@floegence/floe-webapp-boot` for first-party browser bootstrap concerns such as `ArtifactSource`, shared reconnect config assembly, and shared `proxy.runtime` scope validation.
- For proxy runtime mode (Service Worker + HTML injection + WS patch), keep the runtime itself integrated directly via `@floegence/flowersec-core/proxy`.

This document is aligned with `@floegence/flowersec-core@0.19.10`. Consumers should depend on `^0.19.10` or a later compatible release before adopting the artifact-first reconnect contracts described below.

---

## @floegence/floe-webapp-boot

Entry: `packages/boot/src/index.ts`

Exports:

- `parseHashParam(key)` / `parseBase64UrlJsonFromHash(key)` (read data from `location.hash`)
- `clearLocationHash()` (remove hash after reading)
- `getSessionStorage(key)` / `setSessionStorage(key, value)` / `removeSessionStorage(key)`
- `postMessageToOrigins(target, origins, message)`
- `waitForMessage({ expectedOrigins, expectedSource, timeoutMs, accept })`
- `createArtifactSourceFromFactory(getArtifact, kind?)`
- `createFixedArtifactSource(artifact)`
- `createControlplaneArtifactSource(config)`
- `createEntryControlplaneArtifactSource(config)`
- `createArtifactTunnelReconnectConfig(options)`
- `createProxyRuntimeTunnelReconnectConfig(options)`
- `createArtifactDirectReconnectConfig(options)`
- `FLOWERSEC_BOOTSTRAP_SCOPE_RESOLVERS`
- `createBootstrapScopeResolvers(extra?)`

### Example: read payload from hash and clear it

```ts
import { parseBase64UrlJsonFromHash, setSessionStorage, clearLocationHash } from '@floegence/floe-webapp-boot';

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
  createEntryControlplaneArtifactSource,
  createProxyRuntimeTunnelReconnectConfig,
} from '@floegence/floe-webapp-boot';

const artifactSource = createEntryControlplaneArtifactSource({
  baseUrl: 'https://region.example.com',
  endpointId: 'env_demo',
  entryTicket: '<entry-ticket>',
  credentials: 'omit',
  payload: {
    floe_app: 'com.floegence.redeven.agent',
  },
});

const reconnectConfig = createProxyRuntimeTunnelReconnectConfig({
  artifactSource,
  connect: {
    handshakeTimeoutMs: 10_000,
  },
  autoReconnect: {
    enabled: true,
  },
});
```

`ArtifactSource` is the shared boundary for browser bootstrap documents:

- controlplane-backed sources (`createControlplaneArtifactSource`, `createEntryControlplaneArtifactSource`)
- fixed artifacts (`createFixedArtifactSource`)
- product-owned factories (`createArtifactSourceFromFactory`)

This keeps `connect_artifact` acquisition reusable while leaving product policy outside the shared package.

### Fixed artifacts and auto reconnect

Fixed artifact sources are for single-use demos, tests, or product flows that already own artifact freshness outside this package. A fixed artifact is reused verbatim, so `createArtifactTunnelReconnectConfig()` and `createArtifactDirectReconnectConfig()` reject `artifactSource.kind === 'fixed'` when `autoReconnect.enabled` is true.

That rejection is intentional: auto reconnect normally means the browser can request a fresh artifact for each reconnect attempt. A fixed artifact cannot refresh expiry, one-time grants, trace correlation, or server-side revocation state by itself.

Use a controlplane-backed or factory source for normal reconnecting production flows:

```ts
const artifactSource = createEntryControlplaneArtifactSource({
  baseUrl: 'https://region.example.com',
  endpointId: 'env_demo',
  entryTicket: '<entry-ticket>',
});

const reconnectConfig = createArtifactTunnelReconnectConfig({
  artifactSource,
  autoReconnect: { enabled: true },
});
```

Only opt in when the product explicitly guarantees that reusing the exact artifact across reconnect attempts is valid and within its security model:

```ts
const artifactSource = createFixedArtifactSource(artifact, {
  allowAutoReconnect: true,
});
```

`allowAutoReconnect` is an escape hatch, not the production default. Prefer a controlplane-backed source or `createArtifactSourceFromFactory()` for products that need reconnect after ticket rotation, grant expiry, user changes, or endpoint rebinding.

---

## Flowersec proxy runtime (recommended entrypoints)

Use `@floegence/flowersec-core` directly:

```ts
import { createProxyRuntime, createProxyServiceWorkerScript, registerServiceWorkerAndEnsureControl } from '@floegence/flowersec-core/proxy';

// `client` is a Flowersec Client (e.g. from `useProtocol().client()`).
const runtime = createProxyRuntime({ client });
(window as any).__flowersecProxyRuntime = runtime;

// Serve this script at "/_proxy/sw.js" (same-origin).
const swScript = createProxyServiceWorkerScript({
  sameOriginOnly: true,
  passthrough: { prefixes: ['/assets/', '/api/'], paths: ['/_proxy/sw.js'] },
  injectHTML: { mode: 'external_script', scriptUrl: '/_proxy/inject.js', excludePathPrefixes: ['/_proxy/'] },
});

await registerServiceWorkerAndEnsureControl({ scriptUrl: '/_proxy/sw.js', scope: '/' });
```

For `external_script` and `external_module` injection, `scriptUrl` is intentionally a root-relative current-origin path such as `/_proxy/inject.js`. Keep it on the same origin controlled by the Service Worker; Flowersec rejects absolute, protocol-relative, or attribute-breaking URLs before generating the worker script.

Ownership boundary:

- `@floegence/floe-webapp-boot` owns the browser bootstrap document helpers and first-party reconnect config assembly.
- `@floegence/flowersec-core/proxy` still owns the proxy runtime itself.
- Product repositories still own trusted-launcher routing, entry-ticket policy, recovery UX, and runtime-isolation payloads.
