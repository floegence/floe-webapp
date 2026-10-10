/* global window */
import { mkdtemp, writeFile, readFile, rm, realpath } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium, webkit } from 'playwright';
import { graphBlobWorkersPlugin } from '../packages/core/scripts/graph-assets.mjs';
const require = createRequire(import.meta.url);
const { build } = await import(pathToFileURL(require.resolve('vite', {paths:[resolve('packages/core')]})).href);
const root = await realpath(await mkdtemp(join(tmpdir(), 'floe-graph-file-')));
try {
  await writeFile(join(root, 'index.html'), `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' blob: 'unsafe-eval'; worker-src blob:; connect-src 'self' blob:; style-src 'self'"><script type="module" src="/entry.js"></script>`);
  await writeFile(join(root, 'entry.js'), `
    import { createGraphLayoutEngine } from ${JSON.stringify(resolve('packages/core/dist/components/graph/engine.js'))};
    const engine = createGraphLayoutEngine();
    const input = {nodes:[{id:'a',width:100,height:80},{id:'b',width:100,height:80}],edges:[{id:'ab',source:'a',target:'b'}]};
    Promise.all([engine.layout(input),engine.layout(input)]).then(result=>{window.result=result; engine.dispose();}).catch(error=>{window.failure=String(error);});
  `);
  await build({configFile:false,root,base:'./',plugins:[graphBlobWorkersPlugin()],build:{outDir:join(root,'dist'),minify:true}});
  assert.deepEqual(await readFile(join(root,'dist/assets/libavoid.wasm')), await readFile('packages/core/dist/libavoid.wasm'));
  const server = createServer(async (request,response) => {
    const file = request.url === '/' ? '/index.html' : request.url;
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.wasm') ? 'application/wasm' : 'text/html');
    response.end(await readFile(join(root,'dist',file)));
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  try {
  for (const [name, type] of Object.entries({chromium,webkit})) {
    const browser = await type.launch({headless:true,...(name==='chromium'?{args:['--allow-file-access-from-files']}: {})});
    try {
      const page = await browser.newPage();
      const errors=[]; page.on('console', message => console.log(name + ': ' + message.text())); page.on('requestfailed', request => console.log(request.failure()));
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(name === 'chromium' ? pathToFileURL(join(root,'dist/index.html')).href : `http://127.0.0.1:${server.address().port}/`);
      await page.waitForFunction(()=>window.result || window.failure,{},{timeout:15000});
      const result = await page.evaluate(()=>({result:window.result,failure:window.failure}));
      assert.equal(result.failure, undefined);
      assert.deepEqual(errors,[]);
      assert.equal(result.result.length,2);
      assert.deepEqual(result.result[0],result.result[1]);
      assert.equal(result.result[0].nodes.length,2);
      assert.ok(result.result[0].edges[0].sections[0].length>=2);
      console.log(`${name}: blob graph workers and unchanged WASM passed (${name==='chromium'?'file':'http'} origin)`);
    } finally {await browser.close();}
  }
  } finally {await new Promise(resolve => server.close(resolve));}
} finally {await rm(root,{recursive:true,force:true});}
