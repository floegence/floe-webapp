/* global window */
import { mkdtemp, writeFile, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { URL, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const core=resolve(process.argv[2] ?? 'packages/core');
const require=createRequire(new URL('../packages/core/package.json',import.meta.url));
for(const module of ['vite','vite8']) {
  const {build}=await import(pathToFileURL(require.resolve(module)).href);
  const root=await realpath(await mkdtemp(join(tmpdir(),'floe-graph-production-')));
  let browser,server;
  try {
    await writeFile(join(root,'index.html'),'<script type="module" src="./entry.js"></script>');
    await writeFile(join(root,'entry.js'),`
      import {createGraphLayoutEngine} from ${JSON.stringify(join(core,'dist/components/graph/engine.js'))};
      const engine=createGraphLayoutEngine();
      engine.layout({nodes:[{id:'a',width:100,height:80},{id:'b',width:100,height:80}],edges:[{id:'ab',source:'a',target:'b'}]})
      .then(result=>{window.result=result;engine.dispose();}).catch(error=>{window.failure=String(error);});
    `);
    await build({configFile:false,root,base:'./',build:{outDir:join(root,'dist')}});
    server=createServer(async(request,response)=>{
      try {
        const file=request.url==='/'?'/index.html':request.url;
        response.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'text/html');
        response.end(await readFile(join(root,'dist',file)));
      } catch {response.statusCode=404;response.end();}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage();
    const errors=[], failed=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400)failed.push(response.url());});
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(()=>window.result || window.failure,{},{timeout:10000});
    const result=await page.evaluate(()=>({result:window.result,failure:window.failure}));
    assert.equal(result.failure,undefined,`${module}: ${JSON.stringify({result,errors,failed})}`);
    assert.deepEqual(errors,[]);
    assert.deepEqual(failed,[]);
    assert.equal(result.result.nodes.length,2);
    assert.ok(result.result.edges[0].sections[0].length>=2);
    const binaries=(await readdir(join(root,'dist/assets'))).filter(name=>name.endsWith('.wasm'));
    assert.ok(binaries.length>0,'Production build retains independently replaceable WASM');
    for(const binary of binaries) assert.deepEqual(await readFile(join(root,'dist/assets',binary)),await readFile(join(core,'dist/libavoid.wasm')));
    console.log(`${module}: production layout, child ELK worker and raw WASM passed`);
  } finally {
    await browser?.close();
    if(server) await new Promise(resolve=>server.close(resolve));
    await rm(root,{recursive:true,force:true});
  }
}
