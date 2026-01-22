/**
 * Common type definitions for the protocol layer
 */

// Type ID constants for RPC calls
/**
 * Type IDs that are currently implemented by `useRpc()`.
 *
 * Keep this list aligned with `packages/protocol/src/rpc.ts` to avoid misleading downstream users.
 */
export const TypeIds = {
  // File system operations
  FS_LIST: 1001,
  FS_READ_FILE: 1002,
  FS_WRITE_FILE: 1003,
  FS_DELETE: 1006,
  FS_GET_HOME: 1010,
} as const;

/**
 * Reserved Type IDs for future protocol domains.
 *
 * These are part of the protocol contract, but are not yet exposed via `useRpc()`.
 */
export const ReservedTypeIds = {
  // File system operations
  FS_CREATE_FILE: 1004,
  FS_CREATE_DIR: 1005,
  FS_RENAME: 1007,
  FS_MOVE: 1008,
  FS_COPY: 1009,

  // Terminal operations
  TERMINAL_SESSION_CREATE: 2001,
  TERMINAL_SESSION_LIST: 2002,
  TERMINAL_SESSION_ATTACH: 2003,
  TERMINAL_DATA: 2004, // Bidirectional notification

  // System operations
  SYSTEM_INFO: 3001,
  SYSTEM_EXEC: 3002,
} as const;

// File system types
export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: number;
  createdAt: number;
  permissions?: string;
}

export interface ListRequest {
  path: string;
  showHidden?: boolean;
}

export interface ListResponse {
  entries: FileInfo[];
}

export interface ReadFileRequest {
  path: string;
  encoding?: 'utf8' | 'base64';
}

export interface ReadFileResponse {
  content: string;
  encoding: string;
}

export interface WriteFileRequest {
  path: string;
  content: string;
  encoding?: 'utf8' | 'base64';
  createDirs?: boolean;
}

export interface WriteFileResponse {
  success: boolean;
}

export interface DeleteRequest {
  path: string;
  recursive?: boolean;
}

export interface DeleteResponse {
  success: boolean;
}

// Terminal types
export interface TerminalSession {
  id: string;
  name?: string;
  cols: number;
  rows: number;
  pid?: number;
}

export interface CreateTerminalRequest {
  name?: string;
  cols: number;
  rows: number;
  cwd?: string;
  env?: Record<string, string>;
}

export interface CreateTerminalResponse {
  session: TerminalSession;
}

export interface TerminalDataPayload {
  sessionId: string;
  data: Uint8Array;
}

export interface TerminalResizePayload {
  sessionId: string;
  cols: number;
  rows: number;
}
