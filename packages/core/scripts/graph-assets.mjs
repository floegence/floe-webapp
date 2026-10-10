import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

/** Vite build adapter for offline file-origin hosts. Layout and ELK remain
 * unchanged published modules; the raw LGPL WASM stays independently replaceable.
 * The host must grant local read access and allow blob workers/scripts/connects.
 */
export function graphBlobWorkersPlugin() {
  const root = new URL('../dist/', import.meta.url);
  const engine = readFileSync(new URL('components/graph/engine.js', root), 'utf8');
  const entry = /new URL\("(\.\.\/\.\.\/assets\/[^"\n]+)", import\.meta\.url\)/.exec(engine)?.[1];
  if (!entry) throw new Error('Unsupported graph layout worker entry');
  const layoutURL = new URL(entry, new URL('components/graph/', root));
  let layout = readFileSync(layoutURL, 'utf8');
  const child = /new URL\("([^"\n]*elk-worker[^"\n]+)", import\.meta\.url\)/.exec(layout)?.[1];
  if (!child) throw new Error('Unsupported graph ELK worker entry');
  const elk = readFileSync(new URL(child, layoutURL), 'utf8');
  // Every package-owned resource URL is substituted by a local blob URL.
  layout = layout.replaceAll(`new URL("${child}", import.meta.url)`, 'new URL(__floeElkURL)');
  layout = layout.replaceAll(/new URL\("[^"\n]*libavoid\.wasm", import\.meta\.url\)/g, 'new URL(__floeWasmURL)');
  const bootstrap = `
    const queue = [];
    self.onmessage = async ({data}) => {
      if (!data.__floeGraphWasm) { queue.push(data); return; }
      const __floeWasmURL = URL.createObjectURL(new Blob([data.__floeGraphWasm], {type:'application/wasm'}));
      const __floeElkURL = URL.createObjectURL(new Blob([${JSON.stringify(elk)}], {type:'text/javascript'}));
      const source = 'const __floeElkURL=' + JSON.stringify(__floeElkURL) + ',__floeWasmURL=' + JSON.stringify(__floeWasmURL) + ';\\n' + ${JSON.stringify(layout)};
      try { await import(URL.createObjectURL(new Blob([source], {type:'text/javascript'}))); }
      catch (error) { setTimeout(() => { throw error; }); return; }
      for (const data of queue) self.onmessage({data});
      queue.length = 0;
    };
  `;
  return {
    name: 'floe-graph-blob-workers',
    apply: 'build',
    transform(code, id) {
      if (!id.endsWith('/components/graph/engine.js')) return;
      const expression = /new Worker\(new URL\([\s\S]*?\), \{ type: "module" \}\)/;
      if (!expression.test(code)) throw new Error('Unsupported graph layout worker factory');
      const asset = this.emitFile({ type: 'asset', fileName: 'assets/libavoid.wasm', source: readFileSync(new URL('libavoid.wasm', root)) });
      const factory = `(() => {
        const url = URL.createObjectURL(new Blob([${JSON.stringify(bootstrap)}], {type:'text/javascript'}));
        const worker = new Worker(url, {type:'module'});
        URL.revokeObjectURL(url);
        const request = new XMLHttpRequest();
        request.open('GET', import.meta.ROLLUP_FILE_URL_${asset});
        request.responseType = 'arraybuffer';
        const fail = () => worker.dispatchEvent(new ErrorEvent('error', {message:'Unable to read graph routing WASM'}));
        request.onload = () => {
          if ((request.status === 0 || request.status === 200) && request.response?.byteLength) {
            worker.postMessage({__floeGraphWasm:request.response}, [request.response]);
          } else fail();
        };
        request.onerror = fail;
        request.send();
        const terminate = worker.terminate.bind(worker);
        worker.terminate = () => { request.abort(); terminate(); };
        return worker;
      })()`;
      return code.replace(expression, () => factory);
    },
  };
}
