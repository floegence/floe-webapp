# Runtime Bootstrap

Runtime bootstrap is owned by `@floegence/floe-webapp-boot` and targets the published `@floegence/flowersec-core@5.0.0` package through its current public entrypoints. It creates an exact artifact source, validates `proxy.runtime@2`, binds each Lease to one spend attempt, and exposes an opaque `ConnectedAcquisition` only after the single Flowersec controller reports a matching session generation.

```ts
import {
  createControlplaneArtifactSource,
  createProxyBootstrapOwner,
  createProxyRuntimeTunnelConnectionConfig,
} from '@floegence/floe-webapp-boot';
import { ProtocolProvider } from '@floegence/floe-webapp-protocol';

const source = createControlplaneArtifactSource({
  baseUrl: 'https://controlplane.example.com',
  endpointId: 'endpoint-1',
  commitSpend: commitSpend,
  validateSpendBinding: validateSpendBinding,
});
const proxy = createProxyBootstrapOwner({
  controllerBridge: ({ runtime, allowedOrigins, capabilityNonce }) => installBridge(runtime, allowedOrigins, capabilityNonce),
});
const connection = createProxyRuntimeTunnelConnectionConfig({
  source,
  controller: { maximumAttempts: 3, connectTimeoutMs: 10_000 },
  proxyBootstrap: proxy,
});

<ProtocolProvider contract={contract} />;
```

Every controller attempt acquires a fresh opaque Lease. `commitSpend` receives a new 256-bit `attemptId` and must durably commit before Flowersec sends credential bytes; a failed or cancelled callback is never reused. The browser `connectTimeoutMs` and `maximumAttempts` options are projected from Flowersec's browser entrypoint, while Flowersec remains the sole retry/backoff owner.

`materializeIsolatedOneShot()` owns hash cleanup, canonical base64url and fatal UTF-8 decoding, exact v6/origin/digest/projection validation, and same-realm consume-once state. `connectIsolatedOneShot()` performs one connection without creating a second Controller. The handoff API does not expose a reusable decoder or raw artifact scope.

`createProxyBootstrapOwner()` derives runtime limits and mode from the validated projection. Each connected session generation owns one ProxyRuntime; waiting, failure, close, and replacement dispose the previous runtime and bridge before a new one is installed. Product adapters receive only the opaque runtime and immutable projection-derived values.

Proxy scope validation uses `@floegence/flowersec-core/proxy`'s `PROXY_RUNTIME_SCOPE` and `assertProxyRuntimeScope` contracts.

HTTPS is required by default. Loopback HTTP requires `allowLoopbackHTTP: true`. No option permits reuse of a consumed artifact Lease. The application-provided spend adapter is the sole durable fact source; a production host must use its own transactional storage rather than an in-memory flag.

`createPrivateLoopbackControlplaneArtifactSource()` is the dedicated source for an explicitly authorized private browser document. It accepts only a root numeric-loopback HTTP origin, parses only `flowersec-private-loopback/1`, and feeds `createPrivateLoopbackDirectConnectionConfig()`. Both public and private sources use the same envelope validation, digest verification, spend callback, acquisition synchronization, retry ownership, replacement, and cleanup. The private path cannot be selected through `allowLoopbackHTTP`, a public artifact, or an automatic fallback.

The boot package also provides a bounded single-request `fetchServerSentEvents` helper. It performs exactly one fetch, validates `text/event-stream`, and does not parse application JSON or reconnect.
