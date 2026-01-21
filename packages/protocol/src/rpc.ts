import { useProtocol } from './client';
import { TypeIds, type ListRequest, type ListResponse, type ReadFileRequest, type ReadFileResponse, type WriteFileRequest, type WriteFileResponse, type DeleteRequest, type DeleteResponse } from './types';

/**
 * RPC wrapper for type-safe remote calls
 */
export function useRpc() {
  const protocol = useProtocol();

  const call = async <Req, Res>(typeId: number, request: Req): Promise<Res> => {
    const client = protocol.client();
    if (!client) {
      throw new Error('Not connected');
    }

    const response = await client.rpc.call(typeId, request);
    if (response.error) {
      throw new Error(response.error.message ?? `RPC error: ${response.error.code}`);
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
