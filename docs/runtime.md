# Runtime Bootstrap

Runtime bootstrap is owned by `@floegence/floe-webapp-boot` and targets the published `@floegence/flowersec-core@5.2.2` package through its current public entrypoints. It creates an exact artifact source, validates `proxy.runtime@2`, binds each Lease to one spend attempt, and exposes an opaque `ConnectedAcquisition` only after the single Flowersec controller reports a matching session generation.

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

A validated acquisition may declare `http.additionalPathPrefixes` and
`http.extraRequestHeaders`. Bootstrap composes HTTP access from `appBasePath`
plus those explicit additions and passes only the declared headers to Flowersec.
WebSocket access remains limited to `appBasePath`. Page messages cannot replace
this authority. Replacing the acquisition disposes the old proxy and applies the
new scope, including removal of previously granted HTTP additions.

HTTPS is required by default. Loopback HTTP requires `allowLoopbackHTTP: true`. No option permits reuse of a consumed artifact Lease. The application-provided spend adapter is the sole durable fact source; a production host must use its own transactional storage rather than an in-memory flag.

`createPrivateLoopbackControlplaneArtifactSource()` is the dedicated source for an explicitly authorized private browser document. It accepts only a root numeric-loopback HTTP origin, parses only `flowersec-private-loopback/1`, and feeds `createPrivateLoopbackDirectConnectionConfig()`. Both public and private sources use the same envelope validation, digest verification, spend callback, acquisition synchronization, retry ownership, replacement, and cleanup. The private path cannot be selected through `allowLoopbackHTTP`, a public artifact, or an automatic fallback.

The boot package also provides a bounded single-request `fetchServerSentEvents` helper. It performs exactly one fetch, validates `text/event-stream`, and does not parse application JSON or reconnect.

Persistent event streams default to `priority: 'low'`. Chromium can otherwise keep
native media requests queued behind long-lived high-priority fetches when its
network quality estimator selects a slow connection class, including for a local
HTTP server. Hosts with their own event readers use
`createServerSentEventRequestInit(init)` to apply the same request policy. This
helper returns a new options object, preserves headers, credentials, cancellation
and all other request options, and honors an explicit priority. It does not change
event delivery, implement reconnects, or alter HTTP connection limits.

## Native isolated application controllers

`createIsolatedControlplaneArtifactSource()` from `@floegence/floe-webapp-boot/artifact-source`
accepts the control-plane v6 isolated response and validates its handoff, exact
resource context, cross-bound origins, critical projection, and isolated consumer
before materializing a lease. Native shells pass `isolatedContext` plus the same
explicit target validator and spend callback; no browser location, SW, iframe,
network patch, or browser capability is synthesized. Pass the source to the
published Flowersec Node controller, which remains the only reconnect owner.
Each acquisition uses a fresh entry ticket supplied by the authenticated product
fetch adapter. Node TLS and Origin admission remain explicit connector options.
The existing trusted source rejects isolated acquisitions and browser one-shot
handoffs retain their location-clearing and one-consumption requirements.

## Explicit HTTP Direct connections

`createHTTPDirectControlplaneArtifactSource()` accepts an explicitly chosen canonical
HTTP origin and acquires only `flowersec-http-direct/1` leases. Pair it with
`createHTTPDirectConnectionConfig({ source, httpDirect: { origin } })`. Flowersec's
HTTP Direct controller owns endpoint validation and same-origin WS admission;
public HTTP is never inferred from a failed TLS connection or private bridge.
The host authenticates each client and supplies its own durable spend callback.
Separate clients use independent sources, controllers, leases, and sessions.
Closing one controller does not close another client's session or stop the server.

All three source profiles share digest validation, spend binding, retirement,
and acquisition lifecycle ownership. SHA-256 uses the published `@noble/hashes`
implementation on HTTP and HTTPS, so integrity validation does not depend on
SubtleCrypto. Secure random attempt identifiers still require `getRandomValues`;
missing entropy fails explicitly. HTTP does not provide transport encryption.
Capabilities that the browser restricts to secure contexts remain restricted.

Core exports `secureRandomUUID()` for client identifiers. Chat attachments,
Markdown rendering tasks, and Workbench identifiers use this CSPRNG-backed UUIDv4
helper on either protocol, without weak random fallbacks.

The clean release consumer verifies both TLS and HTTP against the published Go
peer. The HTTP case runs two parallel Boot/Protocol clients with SubtleCrypto and
randomUUID absent, verifies RPC on both, closes the first, then verifies RPC on
the second before closing it. Page acquisition and WS share the peer's one port.

### Established session health

The acquisition connection lifecycle keeps its current Flowersec session alive
with a liveness probe every 20 seconds, including while the page is in the
background. Foreground, online, and page restoration events request an immediate
probe. Concurrent probes coalesce. A failed probe or a 10-second deadline closes
only the observed session; the Flowersec controller remains the sole owner of
reacquisition, retry delays, and terminal failures. Replacement and disposal abort
outstanding probes and remove timers and browser listeners. Browser suspension
can still interrupt a session; health checking resumes when the page wakes.
