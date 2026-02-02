import { useProtocol } from './client';
import type { ProtocolContract, RpcHelpers } from './contract';
import { redevenV1Contract, type RedevenV1Rpc } from './contracts/redeven_v1';

/**
 * RPC wrapper for typed remote calls.
 *
 * This module is contract-driven: a contract defines TypeIds + wire codecs + domain surface.
 */
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
  const call: RpcHelpers['call'] = async <Req, Res>(typeId: number, payload: Req): Promise<Res> => {
    const client = protocol.client();
    if (!client) throw new ProtocolNotConnectedError();

    let response: Awaited<ReturnType<typeof client.rpc.call>>;
    try {
      response = await client.rpc.call(typeId, payload);
    } catch (err) {
      throw new RpcError({ typeId, code: -1, message: 'RPC transport error', cause: err });
    }

    if (response.error) {
      throw new RpcError({
        typeId,
        code: response.error.code,
        message: response.error.message ?? `RPC error: ${response.error.code}`,
        cause: response.error,
      });
    }

    return response.payload as Res;
  };

  const notify: RpcHelpers['notify'] = async <Req>(typeId: number, payload: Req): Promise<void> => {
    const client = protocol.client();
    if (!client) return;
    try {
      await client.rpc.notify(typeId, payload);
    } catch (err) {
      throw new RpcError({ typeId, code: -1, message: 'RPC notify transport error', cause: err });
    }
  };

  const onNotify: RpcHelpers['onNotify'] = <Payload>(
    typeId: number,
    handler: (payload: Payload) => void
  ) => {
    const client = protocol.client();
    if (!client) return () => {};

    return client.rpc.onNotify(typeId, (payload) => {
      handler(payload as Payload);
    });
  };

  return { call, notify, onNotify };
}

export type UseRpcOptions<TApi extends object> = {
  contract?: ProtocolContract<TApi>;
};

export function useRpc<TApi extends object = RedevenV1Rpc>(options?: UseRpcOptions<TApi>): TApi & RpcHelpers {
  const protocol = useProtocol();
  const contract = (options?.contract ?? protocol.contract() ?? redevenV1Contract) as ProtocolContract<TApi>;

  const helpers = createHelpers(protocol);
  const api = contract.createRpc(helpers);

  // Provide both: domain API + raw helpers.
  return Object.assign(api, helpers);
}
