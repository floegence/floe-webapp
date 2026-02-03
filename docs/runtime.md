# E2EE Boot Utilities & Flowersec Proxy Integration

This repo provides an optional helper package for bootstrapping Flowersec E2EE deployments (multi-window + sandbox flows):

- `@floegence/floe-webapp-boot`: small browser-side helpers for bootstrapping (hash/sessionStorage/postMessage).

Best practice:

- Keep low-level Flowersec building blocks in `@floegence/flowersec-core` (source of truth).
- Keep Floe Webapp packages focused on UI/protocol glue (providers, contracts, typed RPC).
- For proxy runtime mode (Service Worker + HTML injection + WS patch), integrate directly via `@floegence/flowersec-core/proxy`.

---

## @floegence/floe-webapp-boot

Entry: `packages/boot/src/index.ts`

Exports:

- `parseHashParam(key)` / `parseBase64UrlJsonFromHash(key)` (read data from `location.hash`)
- `clearLocationHash()` (remove hash after reading)
- `getSessionStorage(key)` / `setSessionStorage(key, value)` / `removeSessionStorage(key)`
- `postMessageToOrigins(target, origins, message)`
- `waitForMessage({ expectedOrigins, expectedSource, timeoutMs, accept })`

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
