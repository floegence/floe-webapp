/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLOE_CONTROLPLANE_BASE_URL?: string;
  readonly VITE_FLOE_ENDPOINT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Monaco editor internal module declarations
declare module 'monaco-editor/esm/vs/base/common/errors.js' {
  export function isCancellationError(error: unknown): boolean;
}

declare module 'monaco-editor/esm/vs/platform/log/common/log.js' {
  export class ConsoleLogger {
    constructor();
  }
}

declare module 'monaco-editor/esm/vs/platform/log/common/logService.js' {
  export class LogService {
    constructor(logger: unknown);
    error(message: unknown, ...args: unknown[]): void;
  }
}