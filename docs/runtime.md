# E2EE Boot & Runtime Utilities

This repo provides two optional helper packages for Flowersec E2EE deployments (multi-window + sandbox + Service Worker):

- `@floegence/floe-webapp-boot`: small browser-side helpers for bootstrapping (hash/sessionStorage/postMessage).
- `@floegence/floe-webapp-runtime`: runtime helpers for Flowersec proxy mode and Service Worker control.

These packages are intentionally **not** part of `@floegence/floe-webapp-core` (UI framework). They are infrastructure glue you can reuse in Portal / Env App style shells.

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

## @floegence/floe-webapp-runtime

Entry: `packages/runtime/src/index.ts`

Exports:

- `startProxyRuntime({ client, globalName? })`
- `registerServiceWorkerAndEnsureControl({ scriptUrl, scope?, repairQueryKey?, maxRepairAttempts?, controllerTimeoutMs? })`

### startProxyRuntime

Use this when your app runs under Flowersec proxy mode.

```ts
import { startProxyRuntime } from '@floegence/floe-webapp-runtime';

// `client` is a Flowersec Client (e.g. from `useProtocol().client()`).
const runtime = startProxyRuntime({ client, globalName: '__floeRuntime' });
```

### registerServiceWorkerAndEnsureControl

This helper registers a Service Worker and ensures the current page load is controlled.
In DevTools hard reload flows, it can perform a limited "soft navigation" repair when `repairQueryKey` is provided.

```ts
import { registerServiceWorkerAndEnsureControl } from '@floegence/floe-webapp-runtime';

await registerServiceWorkerAndEnsureControl({
  scriptUrl: '/service-worker.js',
  scope: '/',
  repairQueryKey: '_floe_sw_repair',
  maxRepairAttempts: 2,
  controllerTimeoutMs: 2000,
});
```

