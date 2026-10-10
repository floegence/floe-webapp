/** Vite build plugin for offline file-origin hosts. Requires local file read
 * access and CSP blob: permissions for scripts, workers, and connections. */
export declare function graphBlobWorkersPlugin(): {
  name: string;
  apply: 'build';
  transform(this: { emitFile(asset: {type: 'asset'; fileName: string; source: Uint8Array}): string }, code: string, id: string): string | undefined;
};
