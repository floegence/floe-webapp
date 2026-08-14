# Protocol Integration

The protocol package uses Flowersec 2.3.10's opaque artifact and session APIs. A control-plane response is parsed into an `Artifact`, wrapped in an `ArtifactLease`, and consumed by a browser `ConnectionController`.

```tsx
import { createControlplaneArtifactSource } from '@floegence/floe-webapp-boot';
import { ProtocolProvider, useProtocol } from '@floegence/floe-webapp-protocol';

const source = createControlplaneArtifactSource({
  baseUrl: 'https://controlplane.example.com',
  endpointId: 'endpoint-1',
});

function ConnectButton() {
  const protocol = useProtocol();
  return <button onClick={() => protocol.connect({ source })}>Connect</button>;
}

<ProtocolProvider contract={contract}>
  <ConnectButton />
</ProtocolProvider>;
```

`useProtocol()` exposes `status()`, `error()`, `session()`, `connect()`, `reconnect()`, and `disconnect()`. These are thin application-facing controls over one Flowersec `ConnectionController`; Flowersec remains the sole owner of connection and retry state. RPC calls use `session()?.rpc`; `useRpc()` supplies typed `call`, `notify`, `notifyBestEffort`, and `onNotify` helpers.

Detached calls raise `ProtocolNotConnectedError`; transport failures are surfaced as `RpcError`.

The source posts an envelope to `/v1/connect/artifact` (or `/v1/connect/artifact/entry` with an entry ticket). Responses must contain `connect_artifact`, which is parsed by Flowersec 2.3.10's root `parseArtifact` API. HTTPS by default is required; loopback HTTP is available only when `allowLoopbackHTTP: true` is explicitly set in the boot helper. A connected session exposes `probeLiveness()` and the RPC notifications include `notifyBestEffort`.

The package dependency is pinned to the published `@floegence/flowersec-core@2.3.10` package. Public protocol entrypoints use `ConnectionController`, `Session`, `RpcPeer`, `ByteStream`, and `StreamMetadata`.
