import type { JsonValue, RpcResult } from '@floegence/flowersec-core';
import { useProtocol } from './client';
import type { ProtocolContract, RpcDecoder, RpcHelpers, RpcOperationOptions } from './contract';

export class ProtocolNotConnectedError extends Error {
  constructor() {
    super('Not connected');
    this.name = 'ProtocolNotConnectedError';
  }
}

export class RpcError extends Error {
  readonly typeId: number;
  readonly code: number;

  constructor(args: { typeId: number; code: number; message?: string; cause?: unknown }) {
    super(args.message ?? `RPC error: ${args.code}`, { cause: args.cause });
    this.name = 'RpcError';
    this.typeId = args.typeId;
    this.code = args.code;
  }
}

function createHelpers(protocol: ReturnType<typeof useProtocol>): RpcHelpers {
  const call: RpcHelpers['call'] = async <Req extends JsonValue, Res>(
    typeId: number,
    payload: Req,
    decodeResponse: RpcDecoder<Res>,
    options?: RpcOperationOptions,
  ): Promise<Res> => {
    const transport = protocol.rpcTransport();
    if (!transport) throw new ProtocolNotConnectedError();

    let response: RpcResult<Res>;
    try {
      response = await transport.call(typeId, payload, decodeResponse, options);
    } catch (error) {
      throw new RpcError({ typeId, code: -1, message: 'RPC transport or response decode error', cause: error });
    }

    if (!response.ok) {
      throw new RpcError({
        typeId,
        code: response.error.code,
        message: response.error.message ?? `RPC error: ${response.error.code}`,
        cause: response.error,
      });
    }
    return response.payload;
  };

  const runNotify = async <Req extends JsonValue>(
    typeId: number,
    payload: Req,
    options: { detached: 'throw' | 'ignore' },
  ): Promise<void> => {
    const transport = protocol.rpcTransport();
    if (!transport) {
      if (options.detached === 'ignore') return;
      throw new ProtocolNotConnectedError();
    }
    try {
      await transport.notify(typeId, payload);
    } catch (error) {
      throw new RpcError({ typeId, code: -1, message: 'RPC notify transport error', cause: error });
    }
  };

  const notify: RpcHelpers['notify'] = async <Req extends JsonValue>(typeId: number, payload: Req): Promise<void> => {
    await runNotify(typeId, payload, { detached: 'throw' });
  };

  const notifyBestEffort: RpcHelpers['notifyBestEffort'] = async <Req extends JsonValue>(
    typeId: number,
    payload: Req,
  ): Promise<void> => {
    await runNotify(typeId, payload, { detached: 'ignore' });
  };

  const onNotify: RpcHelpers['onNotify'] = <Payload>(
    typeId: number,
    decodePayload: RpcDecoder<Payload>,
    handler: (payload: Payload) => void | Promise<void>,
  ) => {
    const transport = protocol.rpcTransport();
    if (!transport) return () => {};
    return transport.onNotify(typeId, decodePayload, handler);
  };

  return { call, notify, notifyBestEffort, onNotify };
}

export type UseRpcOptions<TApi extends object> = {
  contract?: ProtocolContract<TApi>;
};

export function useRpc<TApi extends object = Record<string, never>>(options?: UseRpcOptions<TApi>): TApi & RpcHelpers {
  const protocol = useProtocol();
  const contract = (options?.contract ?? protocol.contract()) as ProtocolContract<TApi>;
  const helpers = createHelpers(protocol);
  const api = contract.createRpc(helpers);
  return Object.assign(api, helpers);
}
