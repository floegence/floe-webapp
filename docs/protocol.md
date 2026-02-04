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

Best practice:

- `@floegence/floe-webapp-protocol` is Solid-specific UI glue (context + contract wiring).
- For framework-agnostic reconnect/state machines, use `@floegence/flowersec-core/reconnect` directly.

Notes:

- `connect()` is intentionally idempotent: it should not tear down a healthy connection.
- Use `reconnect()` when you need to force a hard restart (e.g. token rotation, suspected half-open state, manual retry).

### Tunnel mode (controlplane)

```ts
await protocol.connect({
  mode: 'tunnel',
  controlplane: {
    baseUrl: 'https://<controlplane>',
    endpointId: '<endpoint-id>',
  },
  autoReconnect: { enabled: true },
});
```

Controlplane contract (used by `requestChannelGrant`):

- `POST ${baseUrl}/v1/channel/init`
- body: `{ "endpoint_id": "<endpointId>" }`
- response: `{ "grant_client": <ChannelInitGrant> }`

Implementation reference:

- `packages/protocol/src/controlplane.ts`

### Tunnel mode (dynamic grant provider, recommended)

When your auth flow requires a fresh ticket/grant after disconnects (e.g. `entry_ticket -> /v1/channel/init/entry -> grant_client`),
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
  directInfo: {
    // See flowersec-core DirectConnectInfo
  },
  autoReconnect: { enabled: true },
});
```

## RPC Wrapper (useRpc)

`useRpc()` is the public SDK surface for calling remote capabilities.

Implementation reference:

- `packages/protocol/src/rpc.ts`

Errors:

- `ProtocolNotConnectedError` when `protocol.client()` is missing
- `RpcError` for transport errors and remote errors

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
