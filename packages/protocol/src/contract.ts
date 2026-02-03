export type RpcTransportCall = (typeId: number, payload: unknown) => Promise<{ payload: unknown; error?: { code: number; message?: string } }>;
export type RpcTransportNotify = (typeId: number, payload: unknown) => Promise<void> | void;
export type RpcTransportOnNotify = (typeId: number, handler: (payload: unknown) => void) => () => void;

export interface RpcClientLike {
  rpc: {
    call: RpcTransportCall;
    notify: RpcTransportNotify;
    onNotify: RpcTransportOnNotify;
  };
}

export interface RpcHelpers {
  call: <Req, Res>(typeId: number, payload: Req) => Promise<Res>;
  notify: <Req>(typeId: number, payload: Req) => Promise<void>;
  onNotify: <Payload>(typeId: number, handler: (payload: Payload) => void) => () => void;
}

export interface ProtocolContract<TApi = unknown> {
  /** A stable identifier for logging and debugging (e.g. "app_v1"). */
  id: string;
  /** Build a typed RPC surface from the low-level transport helpers. */
  createRpc: (helpers: RpcHelpers) => TApi;
}
