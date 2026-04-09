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
- connection timeouts / keepalive live under `connect`
- tunnel helpers support the canonical artifact flow (`artifactControlplane`, `getArtifact`, `artifact`) and still keep the legacy grant flow (`controlplane`, `getGrant`, `grant`) for compatibility
- direct helpers still use `directInfo` / `getDirectInfo`, and can also opt into the canonical artifact flow through `artifactControlplane`, `getArtifact`, or `artifact`

Best practice:

- `@floegence/floe-webapp-protocol` is Solid-specific UI glue (context + contract wiring).
- For framework-agnostic reconnect/state machines, use `@floegence/flowersec-core/reconnect` directly.

Notes:

- `connect()` is intentionally idempotent: it should not tear down a healthy connection.
- Use `reconnect()` when you need to force a hard restart (e.g. token rotation, suspected half-open state, manual retry).

### Tunnel mode (canonical connect artifact, recommended)

Flowersec v0.19.x treats the canonical `connect_artifact` envelope as the recommended browser contract.
When your control plane can mint that stable envelope, prefer wiring `artifactControlplane` so reconnects keep using the same public contract.

```ts
await protocol.connect({
  mode: 'tunnel',
  artifactControlplane: {
    baseUrl: 'https://<controlplane>',
    endpointId: '<endpoint-id>',
    entryTicket: '<entry-ticket>',
  },
  connect: {
    handshakeTimeoutMs: 10_000,
  },
  autoReconnect: { enabled: true },
});
```

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

### Tunnel mode (controlplane, legacy grant envelope)

```ts
await protocol.connect({
  mode: 'tunnel',
  controlplane: {
    baseUrl: 'https://<controlplane>',
    endpointId: '<endpoint-id>',
  },
  connect: {
    handshakeTimeoutMs: 10_000,
  },
  autoReconnect: { enabled: true },
});
```

Controlplane contract (used by the compatibility helper `requestChannelGrant`):

- `POST ${baseUrl}/v1/channel/init`
- body: `{ "endpoint_id": "<endpointId>" }`
- response: `{ "grant_client": <ChannelInitGrant> }`
- non-2xx failures surface as `ControlplaneRequestError`, preserving `status`, `code`, and the server message from Flowersec

Implementation references:

- `packages/protocol/src/controlplane.ts`
- `packages/protocol/src/client.tsx`

### Tunnel mode (dynamic grant provider)

When your auth flow still requires a fresh legacy grant after disconnects (e.g. `entry_ticket -> /v1/channel/init/entry -> grant_client`),
you should use `getGrant()` so every reconnect attempt uses a new `ChannelInitGrant`.

```ts
await protocol.connect({
  mode: 'tunnel',
  getGrant: async () => {
    // Your own flow here:
    // 1) exchange broker_token -> entry_ticket
    // 2) POST /v1/channel/init/entry -> grant_client
    // 3) return grant_client
    return grantClient;
  },
  autoReconnect: { enabled: true },
});
```

### Direct mode

```ts
await protocol.connect({
  mode: 'direct',
  getDirectInfo: async () => {
    // Re-mint a fresh direct connect payload when needed.
    return directInfo;
  },
  connect: {
    connectTimeoutMs: 10_000,
  },
  autoReconnect: { enabled: true },
});
```

## RPC Wrapper (useRpc)

`useRpc()` is the public SDK surface for calling remote capabilities.

Implementation reference:

- `packages/protocol/src/rpc.ts`

Errors:

- `ProtocolNotConnectedError` when the provider is currently detached from a live RPC client
- `RpcError` for transport errors and remote errors

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
