/* global window, document, getComputedStyle, MutationObserver, setTimeout */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const requireCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { build, preview } = await import(requireCore.resolve('vite'));
const temporary = await realpath(await mkdtemp(path.join(tmpdir(), 'floe-code-highlight-')));
const entry = path.resolve('packages/core/dist/code-highlight.js');
const source = 'def weather(city):\r\n\treturn "<script>世界</script>"  # forecast\r\n';
const fixture = `import { enhanceCodeBlock } from ${JSON.stringify(entry)};
window.jobs=[];window.requests=0;window.workers=0;
const RealWorker=window.Worker;
window.Worker=class extends RealWorker { constructor(...args){super(...args);window.workers++;} postMessage(...args){window.requests++;return super.postMessage(...args);} };
window.add=(text,lang,selected=false)=>{
 const frame=document.createElement('section');const pre=document.createElement('pre');const code=document.createElement('code');const button=document.createElement('button');
 code.textContent=text;button.textContent='Copy';pre.append(code);frame.append(pre,button);document.querySelector('main').append(frame);
 if(selected){const range=document.createRange();range.selectNodeContents(code);window.getSelection().removeAllRanges();window.getSelection().addRange(range);button.focus();}
 const initial={width:pre.getBoundingClientRect().width,height:pre.getBoundingClientRect().height,scrollWidth:pre.scrollWidth};
 const dispose=enhanceCodeBlock(code,lang);const job={frame,pre,code,button,dispose,initial};window.jobs.push(job);return window.jobs.length-1;
};
window.add(${JSON.stringify(source)},'python',true);
window.ready=true;`;
let server;
let browser;
try {
  await writeFile(path.join(temporary, 'index.html'), '<!doctype html><html style="color-scheme:light"><head><style>body{margin:8px}main{max-width:720px}pre{font:12px/18px monospace;white-space:pre;overflow:auto;padding:12px;margin:10px 0}code{font:inherit}section{position:relative}button{position:absolute;top:0;right:0}</style></head><body><main></main><script type="module" src="/fixture.js"></script></body></html>');
  await writeFile(path.join(temporary, 'fixture.js'), fixture);
  await build({ configFile: false, root: temporary, base: './', logLevel: 'error', worker: { format: 'es' }, build: { outDir: path.join(temporary, 'dist') } });
  server = await preview({ configFile: false, root: temporary, logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } });
  browser = await chromium.launch({ headless: true, channel: 'chromium' });
  for (const width of [1000, 360]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(server.resolvedUrls.local[0]);
    await page.waitForFunction(() => window.ready && window.requests === 1);
    // The second request completes after the first, proving selection deferral.
    await page.evaluate(() => window.add('echo "ready"', 'bash'));
    await page.waitForFunction(() => window.jobs[1].code.hasAttribute('data-floe-code-highlighted'));
    assert.equal(await page.evaluate(() => window.jobs[0].code.children.length), 0);
    assert.equal(await page.evaluate(() => window.getSelection().toString()), source.trimEnd());
    await page.evaluate(() => window.getSelection().removeAllRanges());
    await page.waitForFunction(() => window.jobs[0].code.hasAttribute('data-floe-code-highlighted'));
    const result = await page.evaluate(() => {
      const { pre, code, button, initial } = window.jobs[0];
      return { text: code.textContent, initial, after: { width: pre.getBoundingClientRect().width, height: pre.getBoundingClientRect().height, scrollWidth: pre.scrollWidth }, focused: document.activeElement === button, colors: [...new Set([...code.children].map((node) => getComputedStyle(node).color))], scripts: code.querySelectorAll('script').length };
    });
    assert.equal(result.text, source);
    assert.deepEqual(result.after, result.initial);
    assert.equal(result.focused, true);
    assert.equal(result.scripts, 0);
    assert.ok(result.colors.length > 1);
    const themed = await page.evaluate(async () => {
      const code = window.jobs[0].code;
      const node = code.firstElementChild;
      const before = getComputedStyle(node).color;
      const mutations = [];
      const observer = new MutationObserver((records) => mutations.push(...records));
      observer.observe(code, { subtree: true, childList: true, attributes: true });
      const range = document.createRange(); range.selectNodeContents(code); window.getSelection().addRange(range);
      document.documentElement.style.colorScheme = 'dark';
      await new Promise((resolve) => setTimeout(resolve, 20));
      observer.disconnect();
      return { changed: before !== getComputedStyle(node).color, retained: node === code.firstElementChild, selection: window.getSelection().toString(), mutations: mutations.length, requests: window.requests };
    });
    assert.deepEqual(themed, { changed: true, retained: true, selection: source.trimEnd(), mutations: 0, requests: 2 });
    await page.evaluate(() => {
      window.getSelection().removeAllRanges();
      window.add('const stale = 1;', 'js'); window.jobs[2].code.textContent = 'replacement';
      window.add('const removed = 1;', 'js'); window.jobs[3].dispose(); window.jobs[3].frame.remove();
      window.add('plain', 'unknown-language');
      window.add('x'.repeat(32_769), 'python');
      window.add('const last = true;', 'ts');
    });
    await page.locator('section').last().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.jobs[6].code.hasAttribute('data-floe-code-highlighted'));
    assert.deepEqual(await page.evaluate(() => window.jobs.slice(2, 6).map((job) => [job.code.children.length, job.code.hasAttribute('data-floe-code-highlighted')])), [[0,false],[0,false],[0,false],[0,false]]);
    assert.equal(await page.evaluate(() => window.jobs[2].code.textContent), 'replacement');
    assert.equal(await page.evaluate(() => window.workers), 1);
    assert.deepEqual(errors, []);
    await page.close();
  }
  // A blocked worker must not remove source or prevent any ordinary interaction.
  const failed = await browser.newPage();
  await failed.route('**/*highlight.worker*.js', (route) => route.abort());
  await failed.goto(server.resolvedUrls.local[0]);
  await failed.waitForFunction(() => window.ready);
  await failed.evaluate(() => window.getSelection().removeAllRanges());
  await failed.waitForTimeout(200);
  assert.equal(await failed.locator('code').textContent(), source);
  assert.equal(await failed.locator('code span').count(), 0);
  await failed.close();
  console.log('PASS: built worker assets, Python/Bash/TypeScript colors, literal source, CRLF/Unicode/HTML safety, selection deferral, focus, geometry at 1000/360px, theme without DOM mutation, stale/disposed work, bounds and worker failure');
} finally {
  await browser?.close();
  await new Promise((resolve) => server ? server.httpServer.close(resolve) : resolve());
  await rm(temporary, { recursive: true, force: true });
}
