# Protocol Integration

The protocol package consumes the published Flowersec 5.0.0 browser API. Its initial static module graph contains no Flowersec runtime: the first connection dynamically imports the public `@floegence/flowersec-core/browser` entry and keeps that runtime for the Controller's publish and error paths. Boot owns the exact control-plane acquisition envelope, durable `commitSpend` adapter, critical-scope projection, and isolated handoff materialization. Protocol owns one browser `ConnectionController` and never recreates it for ordinary retry; Flowersec remains the sole retry/backoff owner.

```tsx
import {
  createControlplaneArtifactSource,
  createArtifactTunnelConnectionConfig,
} from '@floegence/floe-webapp-boot';
import { ProtocolProvider, useProtocol } from '@floegence/floe-webapp-protocol';

const source = createControlplaneArtifactSource({
  baseUrl: 'https://controlplane.example.com',
  endpointId: 'endpoint-1',
  commitSpend: async (request) => {
    await fetch('/spend', { method: 'POST', body: JSON.stringify(request) });
  },
  validateSpendBinding: (binding) => binding.artifactDigestB64u,
});
const connection = createArtifactTunnelConnectionConfig({
  source,
  controller: { maximumAttempts: 3, connectTimeoutMs: 10_000 },
});

function ConnectButton() {
  const protocol = useProtocol();
  return <button onClick={() => protocol.connect(connection)}>Connect</button>;
}

<ProtocolProvider contract={contract}>
  <ConnectButton />
</ProtocolProvider>;
```

`useProtocol()` exposes `status()`, the full `snapshot()`, the session-free `diagnostic()`, terminal `error()`, `session()`, `connect()`, `replaceConnection()`, `retryNow()`, and `disconnect()`. Diagnostics and structured terminal errors use Flowersec's public `connectionDiagnostic` and `ConnectionControllerError` APIs from that dynamically loaded runtime; Protocol does not copy diagnostic, retry, or error-classification logic. The pre-connection idle diagnostic is a fixed, session-free constant. A retrying `waiting` state reports its failure and disposition only through `diagnostic()`; `error()` is reserved for terminal Controller states and local binding failures. `replaceConnection()` is required when source/options identity changes. `retryNow()` delegates to the existing Flowersec controller and returns `false` while an absolute `retry_after` deadline is active.

An established `session()?.probeLiveness()` remains available for an application-level health check. The probe is a Flowersec session operation; Protocol does not implement a parallel liveness or reconnect loop around it.

RPC helpers are decoder-first: `call(typeId, payload, decodeResponse)`, `notify(typeId, payload)`, `notifyBestEffort(typeId, payload)`, and `onNotify(typeId, decodePayload, handler)`. Requests are `JsonValue`; application decoders validate exact wire shape before business code runs. `notifyBestEffort` treats a detached transport as an already dropped notification, while failures from an attached transport remain observable as `RpcError`. Detached calls and strict notifications raise `ProtocolNotConnectedError`; transport and decoder failures are surfaced as `RpcError`.

The source posts to `/v1/connect/artifact` or `/v1/connect/artifact/entry` and requires an exact acquisition envelope containing an opaque string `connect_artifact`, a `proxy.runtime@2` critical projection, digests, and a spend receipt. HTTPS by default is required; loopback HTTP is available only when `allowLoopbackHTTP: true` is explicitly set. There is no default or no-op spend callback.

Desktop shells that already own a private numeric-loopback document may explicitly use `createPrivateLoopbackControlplaneArtifactSource()` and `createPrivateLoopbackDirectConnectionConfig()`. This selects Flowersec's separately versioned `flowersec-private-loopback/1` browser Controller while preserving the same Floe acquisition, spend, snapshot, retry, replacement, and disposal lifecycle. The private source accepts only a root `http://` numeric-loopback origin. It is not inferred from a URL, port, environment type, or failed public connection, and ordinary configs continue to use only `flowersec/3`.

The package dependency is pinned to the published `@floegence/flowersec-core@5.0.0` package. Protocol uses only Flowersec's current root, browser, and proxy entrypoints. It does not expose an arbitrary Controller factory or a second control-plane fetch/decode facade; all acquisition imports come from `@floegence/floe-webapp-boot`.
