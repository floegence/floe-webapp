import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { URL, fileURLToPath } from 'node:url';

// Preserve statically discoverable worker dependencies in the published package.
// Vite's library wrapper otherwise makes downstream production builds copy only
// the outer worker as an opaque asset, losing ELK and WASM dependencies.
const root = new URL('../dist/', import.meta.url);
const files = [new URL('components/graph/engine.js', root),
  ...readdirSync(new URL('assets/', root)).filter(name => name.startsWith('layout-worker-')).map(name => new URL('assets/' + name, root))];
for (const file of files) {
  const source = readFileSync(file,'utf8');
  let count=0;
  const normalized=source.replace(/new URL\(\s*\/\* @vite-ignore \*\/\s*"" \+ new URL\("([^"\n]+)", import\.meta\.url\)\.href,\s*import\.meta\.url\s*\)/g, (_match,path) => {
    count++; return `new URL(${JSON.stringify(path)}, import.meta.url)`;
  }).replaceAll(/new URL\("([^"\n]*libavoid\.wasm)", import\.meta\.url\)/g, (_match,path)=>`new URL(${JSON.stringify(path+'?no-inline')}, import.meta.url)`);
  if(count!==1 && !(count===0 && /new Worker\(new URL\("[^"]+", import\.meta\.url\)/.test(normalized))) throw new Error(`Unsupported graph worker URL in ${fileURLToPath(file)}`);
  writeFileSync(file,normalized);
}
