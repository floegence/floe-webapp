# Protocol Layer (Flowersec)

The protocol layer is an optional package that provides:

- a `ProtocolProvider` + `useProtocol()` context for connection state
- a contract-driven `useRpc()` wrapper for typed RPC calls (via injected `ProtocolContract`)

Package entrypoint:

- `packages/protocol/src/index.ts`

## Install

```bash
pnpm add @floegence/floe-webapp-protocol @floegence/floe-webapp-core solid-js
```

## Provide a Contract (required)

`@floegence/floe-webapp-protocol` does not ship any business contract.
Downstream apps must provide a `ProtocolContract` from the host app (or a separate npm package)
and inject it into `ProtocolProvider`.

Minimal example:

```ts
import type { ProtocolContract } from '@floegence/floe-webapp-protocol';

const typeIds = { ping: 1 } as const;

export type AppRpc = {
  ping: () => Promise<{ ok: true }>;
};

export const appContract: ProtocolContract<AppRpc> = {
  id: 'app_v1',
  createRpc: ({ call }) => ({
    ping: () => call<Record<string, never>, { ok: true }>(typeIds.ping, {}),
  }),
};
```

## Use With FloeApp (recommended)

```tsx
import type { FloeComponent } from '@floegence/floe-webapp-core';
import { FloeApp } from '@floegence/floe-webapp-core/app';
import { ProtocolProvider, useProtocol } from '@floegence/floe-webapp-protocol';
import { appContract } from './protocol/contract';

const components: FloeComponent<ReturnType<typeof useProtocol>>[] = [
  // ...
];

export function App() {
  return (
    <FloeApp
      wrapAfterTheme={(renderChildren) => (
        <ProtocolProvider contract={appContract}>{renderChildren()}</ProtocolProvider>
      )}
      getProtocol={useProtocol}
      components={components}
    >
      <div />
    </FloeApp>
  );
}
```

Implementation references:

- `packages/core/src/app/FloeApp.tsx`
- `packages/protocol/src/client.tsx`
- `packages/core/src/context/ComponentRegistry.tsx` (`ComponentContext.protocol`)

## Connection API

`ProtocolProvider` exposes:

- `status(): 'disconnected' | 'connecting' | 'connected' | 'error'`
- `error(): Error | null`
- `client(): Client | null`
- `contract(): ProtocolContract`
- `connect(config): Promise<void>`
- `reconnect(config?): Promise<void>` (hard reconnect)
- `disconnect(): void`

Type reference:

- `packages/protocol/src/client.tsx` (`ConnectConfig`, `AutoReconnectConfig`)

`ConnectConfig` directly reuses the Flowersec browser reconnect adapter shape:

- `ConnectConfig = BrowserReconnectConfig`
- every connection uses exactly one discriminated `source`
- connection timeouts, transport security, resource limits, and liveness live under `connect`
- the acquired `ConnectArtifact` selects tunnel or direct transport without a separate mode field

```ts
type ArtifactSource =
  | { kind: 'once'; artifact: ConnectArtifact }
  | {
      kind: 'refreshable';
      acquire(context: ArtifactAcquireContext): Promise<ConnectArtifact>;
    };
```

Best practice:

- `@floegence/floe-webapp-protocol` is Solid-specific UI glue (context + contract wiring).
- Flowersec owns `ArtifactSource`; `@floegence/floe-webapp-boot` reexports that contract and provides first-party browser bootstrap assembly.
- For framework-agnostic reconnect/state machines, use `@floegence/flowersec-core/reconnect` directly.
- These docs target `@floegence/flowersec-core@0.26.0`; package manifests must use `^0.26.0` or a later compatible release.

Notes:

- `connect()` is intentionally idempotent: it should not tear down a healthy connection.
- Use `reconnect()` when you need to force a hard restart (e.g. token rotation, suspected half-open state, manual retry).
- Reusing the same config also reuses the same Flowersec reconnect adapter, preserving one-time source consumption and reconnect trace correlation.
- A `once` source cannot enable automatic reconnect. Pass a new config with a fresh artifact for another connection.

### Refreshable controlplane source

Use the shared controlplane helper when a reconnect attempt must acquire a fresh artifact. The same helper accepts normal and entry-ticket request inputs.

```ts
import { createControlplaneArtifactSource } from '@floegence/floe-webapp-boot';

await protocol.connect({
  source: createControlplaneArtifactSource({
    baseUrl: 'https://<controlplane>',
    endpointId: '<endpoint-id>',
    entryTicket: '<entry-ticket>',
  }),
  connect: {
    handshakeTimeoutMs: 10_000,
  },
  autoReconnect: { enabled: true },
});
```

Artifact requests use HTTPS by default and reject redirects. For local development only, literal loopback HTTP can be enabled explicitly:

```ts
const localSource = createControlplaneArtifactSource({
  baseUrl: 'http://127.0.0.1:8787',
  endpointId: '<endpoint-id>',
  allowLoopbackHTTP: true,
});
```

The option does not permit HTTP for network hosts.

Canonical artifact contract (used by `requestConnectArtifact` / `requestEntryConnectArtifact` from `@floegence/flowersec-core/controlplane`):

- `POST ${baseUrl}/v1/connect/artifact`
- `POST ${baseUrl}/v1/connect/artifact/entry`
- body: `{ "endpoint_id": "<endpointId>", "payload": { ... }, "correlation": { "trace_id": "<traceId>" } }`
- response: `{ "connect_artifact": <ConnectArtifact> }`
- the reconnect helper automatically forwards the latest `trace_id` it observed from a prior artifact, so downstream control planes can correlate refreshes without product-specific state

Public helper exports:

- `requestConnectArtifact`
- `requestEntryConnectArtifact`
- `assertConnectArtifact`

### One-time source

```ts
await protocol.connect({
  source: { kind: 'once', artifact },
  connect: {
    connectTimeoutMs: 10_000,
  },
});
```

Do not combine a one-time source with `autoReconnect.enabled`. Flowersec consumes the source once and rejects automatic reconnect at configuration time.

### Transport security and liveness

High-level Flowersec connections require TLS by default. Local `ws://` development must explicitly select `allow_plaintext_for_loopback`; network plaintext requires an explicit host-scoped policy and risk acceptance.

Tunnel connections derive acknowledged Yamux liveness defaults from the artifact idle timeout. Direct connections do not run periodic probes unless configured:

```ts
connect: {
  liveness: { intervalMs: 10_000, timeoutMs: 10_000 },
  transportSecurityPolicy: 'allow_plaintext_for_loopback',
}
```

Use `client().probeLiveness()` for an acknowledged round trip. `client().ping()` only confirms that the encrypted ping record was accepted locally for sending.

## RPC Wrapper (useRpc)

`useRpc()` is the public SDK surface for calling remote capabilities.

Implementation reference:

- `packages/protocol/src/rpc.ts`

Errors:

- `ProtocolNotConnectedError` when the provider is currently detached from a live RPC client
- `RpcError` for transport errors and remote errors

Notify semantics:

- `useRpc().notify()` is strict. It throws `ProtocolNotConnectedError` when no live RPC client is attached, so product flows that must observe delivery failures can fail fast instead of silently losing state.
- `useRpc().notifyBestEffort()` keeps the legacy detached-drop behavior. Use it only for telemetry, presence hints, opportunistic cache invalidation, or other signals where losing the notification while disconnected is acceptable.
- Both notify helpers still throw `RpcError` for non-detached transport failures. Best-effort only relaxes the detached state, not active transport errors.
- Do not use `notifyBestEffort()` for state-changing commands, grant/session lifecycle events, writes, or user-visible workflow transitions; those should use `notify()` or an RPC call whose failure is surfaced to the product.

Reconnect behavior:

- `ProtocolProvider` keeps a stable RPC transport proxy under the hood.
- `useRpc().onNotify()` subscriptions survive reconnects and rebind to the latest client automatically.
- `useRpc().call()` still fails fast with `ProtocolNotConnectedError` while no client is attached.

This SDK is contract-driven: it uses the provider contract by default, and you can override it per-hook.

Example:

```ts
import { useRpc } from '@floegence/floe-webapp-protocol';
import type { AppRpc } from './protocol/contract';

const rpc = useRpc<AppRpc>();
await rpc.ping();
```

## TypeIds Governance

Type IDs are part of the protocol contract.

Downstream apps should call `useRpc()` instead of `client.rpc.call(...)` directly.
