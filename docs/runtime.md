# Runtime Bootstrap

Runtime bootstrap is owned by `@floegence/floe-webapp-boot` and targets the published `@floegence/flowersec-core@2.3.4` package. It creates an `ArtifactSource` and passes it to the browser `createConnectionController` API. Flowersec's controller is the sole owner of connection and retry state.

```ts
import { createControlplaneArtifactSource } from '@floegence/floe-webapp-boot';
import { createConnectionController } from '@floegence/flowersec-core/browser';

const source = createControlplaneArtifactSource({
  baseUrl: 'https://controlplane.example.com',
  endpointId: 'endpoint-1',
});
const controller = createConnectionController(source, { maximumAttempts: 3 });
controller.start();
const session = await controller.waitForSession();
```

An `ArtifactSource` acquires a fresh opaque lease for each attempt. Flowersec owns retry, session lifecycle, and lease spending; application code owns only the control-plane request and policy configuration. `createArtifactTunnelConnectionConfig`, `createProxyRuntimeTunnelConnectionConfig`, and `createArtifactDirectConnectionConfig` are small source/controller option helpers exported by the boot package.

HTTPS is required by default. Loopback HTTP requires `allowLoopbackHTTP: true`. No option permits reuse of a consumed artifact lease.

Proxy bootstrap scopes use `@floegence/flowersec-core/proxy`'s `PROXY_RUNTIME_SCOPE` and `assertProxyRuntimeScope` contracts. Unknown scope versions fail before payload validation.

The boot package also provides a bounded single-request `fetchServerSentEvents` helper. It performs exactly one fetch, validates `text/event-stream`, and does not parse application JSON or reconnect.
