import { useProtocol } from './client';
import { TypeIds, type ListRequest, type ListResponse, type ReadFileRequest, type ReadFileResponse, type WriteFileRequest, type WriteFileResponse, type DeleteRequest, type DeleteResponse } from './types';

/**
 * RPC wrapper for type-safe remote calls
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

export function useRpc() {
  const protocol = useProtocol();

  const call = async <Req, Res>(typeId: number, request: Req): Promise<Res> => {
    const client = protocol.client();
    if (!client) {
      throw new ProtocolNotConnectedError();
    }

    let response: Awaited<ReturnType<typeof client.rpc.call>>;
    try {
      response = await client.rpc.call(typeId, request);
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

  return {
    // File system operations
    fs: {
      list: (req: ListRequest) => call<ListRequest, ListResponse>(TypeIds.FS_LIST, req),
      readFile: (req: ReadFileRequest) => call<ReadFileRequest, ReadFileResponse>(TypeIds.FS_READ_FILE, req),
      writeFile: (req: WriteFileRequest) => call<WriteFileRequest, WriteFileResponse>(TypeIds.FS_WRITE_FILE, req),
      delete: (req: DeleteRequest) => call<DeleteRequest, DeleteResponse>(TypeIds.FS_DELETE, req),
      getHome: () => call<Record<string, never>, { path: string }>(TypeIds.FS_GET_HOME, {}),
    },

    // Raw call for custom operations
    call,
  };
}
