/* global window, document, getSelection */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';
const require = createRequire(createRequire(new URL('../packages/core/package.json', import.meta.url)).resolve('@aiden0z/pptx-renderer'));
const JSZip = require('jszip');
const dist = resolve('packages/core/dist');
const artifacts = resolve('.cache/pptx-surface');
mkdirSync(artifacts, { recursive: true });
const suppliedFile = process.argv[2];
const zip = new JSZip();
zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
zip.file('ppt/presentation.xml', '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>');
zip.file('ppt/_rels/presentation.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>');
zip.file('ppt/slides/slide1.xml', '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="Text"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="9144000" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="2400"><a:hlinkClick r:id="external"/></a:rPr><a:t>Presentation page 1 中文预览</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>');
zip.file('ppt/slides/_rels/slide1.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="external" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.invalid/pptx-preview" TargetMode="External"/></Relationships>');
const fixture = await zip.generateAsync({ type: 'nodebuffer' });
const html = '<!doctype html><meta charset="utf-8"><div id="viewer"></div><script type="module">import {PptxDocumentSurface} from "/dist/pptx.js";window.failures=[];window.ready=(async()=>{window.surface=await PptxDocumentSurface.open(new Uint8Array(await(await fetch("/deck.pptx")).arrayBuffer()),{onNodeError:(id,error)=>failures.push({id,error:String(error)})});window.handles=[];for(let i=0;i<surface.pageCount;i++){const holder=document.createElement("div");holder.style.cssText="position:relative;width:"+surface.pageWidth+"px;height:"+surface.pageHeight+"px";document.querySelector("#viewer").append(holder);const handle=surface.renderPage(i,holder);handles.push(handle);await handle.ready;}await document.fonts.ready;return {pages:surface.pageCount,width:surface.pageWidth,height:surface.pageHeight,external:surface.hasExternalLinks,failures};})();</script>';
const server = createServer((request, response) => {
  if (request.url === '/deck.pptx') return response.end(suppliedFile ? readFileSync(suppliedFile) : fixture);
  if (request.url.startsWith('/dist/')) {
    const file = resolve(dist, request.url.slice(6));
    if (!file.startsWith(dist + '/') || !existsSync(file) || !statSync(file).isFile()) { response.writeHead(404); return response.end(); }
    response.setHeader('content-type', extname(file) === '.js' ? 'text/javascript' : 'application/octet-stream');
    return response.end(readFileSync(file));
  }
  response.setHeader('content-type', 'text/html'); response.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1320, height: 850 } });
  const errors = [], remote = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = 'http://127.0.0.1:' + server.address().port;
  await page.route('**/*', route => { if (!route.request().url().startsWith(origin + '/')) { remote.push(route.request().url()); return route.abort(); } return route.continue(); });
  await page.goto(origin);
  const result = await page.evaluate(() => window.ready);
  assert.deepEqual(errors, []); assert.deepEqual(remote, []); assert.deepEqual(result.failures, []);
  assert(result.pages > 0);
  if (!suppliedFile) {
    assert.equal(result.pages, 1); assert.equal(result.external, true);
    assert.match(await page.locator('#viewer').innerText(), /中文预览/);
    assert.equal(await page.locator('a[href]').count(), 0);
    await page.evaluate(() => { const span = [...document.querySelectorAll('span')].find(e => e.textContent === 'Presentation page 1 中文预览'); const range = document.createRange(); range.selectNodeContents(span); getSelection().removeAllRanges(); getSelection().addRange(range); });
    assert.match(await page.evaluate(() => getSelection().toString()), /中文预览/);
  }
  for (const index of new Set([0, Math.floor(result.pages / 2), result.pages - 1])) await page.locator('#viewer > div').nth(index).screenshot({ path: artifacts + '/page-' + (index + 1) + '.png' });
  result.chartCanvases = await page.locator('canvas').count();
  await page.evaluate(() => { window.surface.dispose(); for (const handle of window.handles) { handle.dispose(); handle.dispose(); } });
  assert.equal(await page.locator('#viewer [data-node-id]').count(), 0);
  assert.deepEqual(errors, []);
  writeFileSync(artifacts + '/report.json', JSON.stringify({ ...result, errors, remote }, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
