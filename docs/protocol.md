# Protocol Layer (Flowersec)

The protocol layer is an optional package that provides:

- a `ProtocolProvider` + `useProtocol()` context for connection state
- a contract-driven `useRpc()` wrapper for typed RPC calls

Package entrypoint:

- `packages/protocol/src/index.ts`

## Install

```bash
pnpm add @floegence/floe-webapp-protocol @floegence/floe-webapp-core solid-js
```

## Use With FloeApp (recommended)

```tsx
import { FloeApp, type FloeComponent } from '@floegence/floe-webapp-core';
import { ProtocolProvider, useProtocol } from '@floegence/floe-webapp-protocol';

const components: FloeComponent<ReturnType<typeof useProtocol>>[] = [
  // ...
];

export function App() {
  return (
    <FloeApp
      wrapAfterTheme={(renderChildren) => <ProtocolProvider>{renderChildren()}</ProtocolProvider>}
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
- `disconnect(): void`

Type reference:

- `packages/protocol/src/client.tsx` (`ConnectConfig`, `AutoReconnectConfig`)

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

This SDK is contract-driven.

- Built-in contract: `redevenV1Contract` (`packages/protocol/src/contracts/redeven_v1/*`)
- `useRpc()` uses the provider contract by default (see `ProtocolProvider contract={...}`), and you can override it per-hook.

Example:

```ts
import { useRpc } from '@floegence/floe-webapp-protocol';

const rpc = useRpc();
const home = await rpc.fs.getHome();
const list = await rpc.fs.list({ path: home.path, showHidden: false });
```

## TypeIds Governance

Type IDs are part of the protocol contract:

- Built-in contract ids: `redevenV1TypeIds` (`packages/protocol/src/contracts/redeven_v1/typeIds.ts`)

Downstream apps should call `useRpc()` instead of `client.rpc.call(...)` directly.
