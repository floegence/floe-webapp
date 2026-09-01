import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { build, type Plugin } from 'vite';
import solid from 'vite-plugin-solid';

const ENTRY_ID = 'virtual:floe-protocol-consumer';
const RESOLVED_ENTRY_ID = `\0${ENTRY_ID}`;

function consumerEntryPlugin(protocolEntry: string): Plugin {
  return {
    name: 'floe-protocol-consumer-entry',
    resolveId(id) {
      return id === ENTRY_ID ? RESOLVED_ENTRY_ID : null;
    },
    load(id) {
      return id === RESOLVED_ENTRY_ID
        ? `import { ProtocolProvider } from ${JSON.stringify(protocolEntry)}; globalThis.__FLOE_PROTOCOL_TEST__ = ProtocolProvider;`
        : null;
    },
  };
}

describe('@floegence/floe-webapp-protocol initial static graph', () => {
  it('keeps the Flowersec browser runtime behind the connection-time dynamic import', async () => {
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      plugins: [consumerEntryPlugin(resolve(__dirname, '../src/index.ts')), solid()],
      build: {
        write: false,
        minify: false,
        target: 'esnext',
        rollupOptions: {
          input: ENTRY_ID,
          output: { format: 'es' },
        },
      },
    });

    const builds = Array.isArray(result) ? result : [result];
    const output = builds.flatMap((item) => ('output' in item ? item.output : []));
    type OutputChunk = Extract<(typeof output)[number], { type: 'chunk' }>;
    const chunks = output.filter((item): item is OutputChunk => item.type === 'chunk');
    const entry = chunks.find((chunk) => chunk.isEntry);
    expect(entry).toBeDefined();

    const chunksByFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
    const initialFiles = new Set<string>();
    const visitInitialChunk = (fileName: string) => {
      if (initialFiles.has(fileName)) return;
      initialFiles.add(fileName);
      for (const importedFileName of chunksByFileName.get(fileName)?.imports ?? []) {
        visitInitialChunk(importedFileName);
      }
    };
    visitInitialChunk(entry?.fileName ?? '');

    const normalize = (id: string) => id.replaceAll('\\', '/');
    const initialModules = chunks
      .filter((chunk) => initialFiles.has(chunk.fileName))
      .flatMap((chunk) => Object.keys(chunk.modules).map(normalize));
    const lazyModules = chunks
      .filter((chunk) => !initialFiles.has(chunk.fileName))
      .flatMap((chunk) => Object.keys(chunk.modules).map(normalize));

    expect(initialModules.filter((id) => id.includes('/flowersec-core/dist/'))).toEqual([]);
    expect(lazyModules).toEqual(
      expect.arrayContaining([expect.stringContaining('/flowersec-core/dist/browser/index.js')])
    );
  });
});
