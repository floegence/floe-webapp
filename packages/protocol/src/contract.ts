import type { JsonValue, RpcPeer } from '@floegence/flowersec-core';

export interface RpcClientLike {
  rpc: Pick<RpcPeer, 'call' | 'notify' | 'onNotify'>;
}

export type RpcDecoder<T> = (payload: JsonValue) => T;

export interface RpcHelpers {
  call: <Req extends JsonValue, Res>(
    typeId: number,
    payload: Req,
    decodeResponse: RpcDecoder<Res>,
  ) => Promise<Res>;
  /** Strict notification: detached transports fail with ProtocolNotConnectedError. */
  notify: <Req extends JsonValue>(typeId: number, payload: Req) => Promise<void>;
  /** Best-effort notification: detached transports are treated as already dropped. */
  notifyBestEffort: <Req extends JsonValue>(typeId: number, payload: Req) => Promise<void>;
  onNotify: <Payload>(
    typeId: number,
    decodePayload: RpcDecoder<Payload>,
    handler: (payload: Payload) => void | Promise<void>,
  ) => () => void;
}

export interface ProtocolContract<TApi = unknown> {
  /** A stable identifier for logging and debugging (e.g. "app_v1"). */
  id: string;
  /** Build a typed RPC surface from the low-level transport helpers. */
  createRpc: (helpers: RpcHelpers) => TApi;
}
