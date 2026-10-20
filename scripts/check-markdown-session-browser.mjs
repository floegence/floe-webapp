/* global window, requestAnimationFrame, performance, Worker, Blob */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const requireCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { build, preview } = await import(requireCore.resolve('vite'));
const temporary = await realpath(await mkdtemp(path.join(tmpdir(), 'floe-markdown-session-')));
const entry = path.resolve('packages/core/dist/markdown.js');
let server;
let browser;
try {
  await writeFile(path.join(temporary, 'index.html'), '<!doctype html><button>Reading remains available</button><script type="module" src="/fixture.js"></script>');
  await writeFile(path.join(temporary, 'host.worker.js'), [
    'import { createMarkdownParser, createMarkdownSessionHandler } from ' + JSON.stringify(entry) + ';',
    'const handler=createMarkdownSessionHandler(config=>{const parser=createMarkdownParser(config);parser.use({extensions:[{name:"citation",level:"inline",start:source=>source.indexOf("🌸"),tokenizer:source=>source.startsWith("🌸")?{type:"citation",raw:"🌸",text:"citation"}:undefined,renderer:()=>"<span>citation</span>"}]});return parser;});',
    'addEventListener("message",event=>postMessage(handler.handle(event.data)));',
  ].join('\n'));
  await writeFile(path.join(temporary, 'fixture.js'), [
    'import { createMarkdownParser, createIncrementalMarkdownParser, createMarkdownSessionWorker, createMarkdownWorkerClient } from ' + JSON.stringify(entry) + ';',
    'window.api={createMarkdownParser,createIncrementalMarkdownParser,createMarkdownSessionWorker,createMarkdownWorkerClient};',
    'window.hostWorker=()=>new Worker(new URL("./host.worker.js",import.meta.url),{type:"module"});',
    'window.ready=true;',
  ].join('\n'));
  await build({ configFile: false, root: temporary, base: './', logLevel: 'error', worker: { format: 'es' }, build: { outDir: path.join(temporary, 'dist') } });
  server = await preview({ configFile: false, root: temporary, logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } });
  browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => window.ready);
  const small = await page.evaluate(async () => {
    const api = window.api;
    const client = api.createMarkdownWorkerClient(api.createMarkdownSessionWorker());
    const session = await client.open({ breaks: false });
    const model = api.createIncrementalMarkdownParser(api.createMarkdownParser({ breaks: false }));
    const equal = [];
    const source = 'Title\r\n=====\r\n\r\n[guide]\r\n\r\n~~~ts\r\n<script>世界</script>\r\n';
    equal.push(JSON.stringify(await session.reset(source)) === JSON.stringify(model.reset(source)));
    for (const text of ['~~~\r\n\r\n', '[guide]: /docs\r\n', '\r\n**注意：**正文🌸']) {
      equal.push(JSON.stringify(await session.append(text)) === JSON.stringify(model.append(text)));
    }
    equal.push(JSON.stringify(await session.finish()) === JSON.stringify(model.finish()));
    equal.push(JSON.stringify(await session.reset('Replacement')) === JSON.stringify(model.reset('Replacement')));
    session.close();
    client.close();
    return { equal, diagnostics: client.diagnostics() };
  });
  assert.ok(small.equal.every(Boolean));
  assert.deepEqual(small.diagnostics, { pendingRequests: 0, pendingBytes: 0, closed: true });
  const custom = await page.evaluate(async () => {
    const client = window.api.createMarkdownWorkerClient(window.hostWorker());
    const session = await client.open({ breaks: false });
    await session.reset('Before ');
    const result = await session.append('🌸 after');
    const serialized = JSON.stringify(result);
    session.close(); client.close();
    return serialized.includes('citation');
  });
  assert.equal(custom, true);
  const large = await page.evaluate(async () => {
    const api = window.api;
    const client = api.createMarkdownWorkerClient(api.createMarkdownSessionWorker(), { maxPendingBytes: 16 * 1024 * 1024 });
    const session = await client.open({ breaks: false });
    const source = '~~~text\n' + '世界🌸 content\n'.repeat(250000);
    let frames = 0;
    let running = true;
    const frame = () => { if (running) { frames++; requestAnimationFrame(frame); } };
    requestAnimationFrame(frame);
    const started = performance.now();
    const initial = await session.reset(source);
    const initialized = performance.now();
    const appended = await session.append('\n~~~\n');
    const finished = await session.finish();
    const completed = performance.now();
    running = false;
    session.close(); client.close();
    return { sourceLength: source.length, initial: initial.sourceLength, appended: appended.sourceLength,
      finished: finished.sourceLength, frames, initializeMs: initialized - started, finishAndAppendMs: completed - initialized };
  });
  assert.equal(large.initial, large.sourceLength);
  assert.equal(large.appended, large.sourceLength + 5);
  assert.equal(large.finished, large.appended);
  assert.ok(large.frames > 0, 'worker parsing must permit animation frames');
  const cycles = await page.evaluate(async () => {
    const api = window.api;
    const client = api.createMarkdownWorkerClient(api.createMarkdownSessionWorker());
    for (let i = 0; i < 50; i++) {
      const session = await client.open({ breaks: false });
      await session.reset('cycle ' + i);
      session.close();
    }
    const pending = client.open({ breaks: false }).then(() => false, () => true);
    client.close();
    return { rejected: await pending, diagnostics: client.diagnostics() };
  });
  assert.equal(cycles.rejected, true);
  assert.deepEqual(cycles.diagnostics, { pendingRequests: 0, pendingBytes: 0, closed: true });
  const failure = await page.evaluate(async () => {
    const client = window.api.createMarkdownWorkerClient(new Worker(URL.createObjectURL(new Blob(['throw new Error("worker failed")'], { type: 'text/javascript' }))), { timeoutMs: 1000 });
    try { await client.open(undefined); return false; }
    catch { return client.diagnostics().closed && client.diagnostics().pendingRequests === 0; }
  });
  assert.equal(failure, true);
  assert.deepEqual(errors, []);
  console.log('PASS: built default and host-extension workers, canonical batches, CRLF/CJK/reference/fence semantics, large worker parsing, 50 release cycles and failure rejection');
  console.log(JSON.stringify({ diagnosticOnly: true, large }));
} finally {
  await browser?.close();
  await new Promise((resolve) => server ? server.httpServer.close(resolve) : resolve());
  await rm(temporary, { recursive: true, force: true });
}
