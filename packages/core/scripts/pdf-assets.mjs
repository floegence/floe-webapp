import { URL } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const root = dirname(require.resolve('pdfjs-dist/package.json'));
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const prefix = `pdf-assets/${version}/legacy/`;
const files = new Map();
function collect(directory, outputDirectory = directory) {
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    const file = join(directory, entry.name);
    const output = join(outputDirectory, entry.name);
    if (entry.isDirectory()) collect(file, output);
    else files.set(output.replaceAll('\\', '/'), join(root, file));
  }
}
for (const directory of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) collect(directory);
collect('legacy/web/images', 'images');
files.set('pdf.worker.min.mjs', join(root, 'legacy/build/pdf.worker.min.mjs'));
files.set('LICENSE', join(root, 'LICENSE'));

/** Vite-compatible asset plugin. Keeps workers, CMaps, fonts, codecs and their
 * original notices self-hosted and versioned, outside the initial JS graph. */
export function pdfAssetsPlugin() {
  let base = '/';
  return {
    name: 'floe-pdf-assets',
    configResolved(config) { base = config.base; },
    resolveId(id) { if (id === 'virtual:floe-pdf-assets') return '\0virtual:floe-pdf-assets'; },
    load(id) {
      if (id === '\0virtual:floe-pdf-assets') return `export default new URL(${JSON.stringify(base + prefix)}, globalThis.location.href).href;`;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url, 'http://localhost').pathname;
        const candidates = [base + prefix, '/' + prefix];
        const matched = candidates.find(candidate => pathname.startsWith(candidate));
        const file = matched && files.get(pathname.slice(matched.length));
        if (!file) return next();
        const type = file.endsWith('.mjs') ? 'text/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream';
        res.setHeader('Content-Type', type);
        res.end(readFileSync(file));
      });
    },
    generateBundle() {
      for (const [name, file] of files) this.emitFile({ type: 'asset', fileName: prefix + name, source: readFileSync(file) });
    },
  };
}
