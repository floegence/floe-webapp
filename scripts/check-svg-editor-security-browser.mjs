/* global window */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import solid from 'vite-plugin-solid';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '../packages/core');
const require = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(require.resolve('vite'));
const fixture = await mkdtemp(resolve(root, '.security-browser-'));
let server;
let browser;
try {
  await writeFile(resolve(fixture, 'index.html'), '<!doctype html><div id="root"></div><script type="module" src="./main.tsx"></script>');
  await writeFile(resolve(fixture, 'main.tsx'), `
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { ThemeProvider } from '../src/context/ThemeContext';
import { SvgBlock } from '../src/components/chat/blocks/SvgBlock';
import { CodeEditor } from '../src/components/editor/CodeEditor';
import { createMarkdownWorker, configureMarkdownWorker, renderMarkdown, terminateMarkdownWorker } from '../src/components/chat/hooks/useMarkdown';
import { createDiffWorker, configureDiffWorker, computeCodeDiff, terminateDiffWorker } from '../src/components/chat/hooks/useCodeDiff';
const [svg, setSvg] = createSignal('');
window.setSvg = setSvg;
window.dispose = render(() => <ThemeProvider><SvgBlock content={svg()} /><CodeEditor path="security.ts" language="typescript" value="const answer: number = 42;" options={{readOnly:false,ariaLabel:'Security editor'}} style={{height:'300px'}} onReady={api => window.editorAPI = api}/></ThemeProvider>, document.getElementById('root'));
window.checkWorkers = async () => {
  await configureMarkdownWorker(createMarkdownWorker());
  await configureDiffWorker(createDiffWorker());
  try { return { html: await renderMarkdown('**Dedicated worker**'), diff: await computeCodeDiff('before', 'after') }; }
  finally { terminateMarkdownWorker(); terminateDiffWorker(); }
};
`);
  server = await createServer({ configFile: false, root, plugins: [solid()], optimizeDeps: { entries: [resolve(fixture, 'index.html')] }, resolve: { dedupe: ['solid-js'] }, server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${server.resolvedUrls.local[0]}${fixture.split('/').at(-1)}/`);
  await page.waitForFunction(() => !!window.editorAPI, { timeout: 30000 });
  const attacks = [
    '<svg onload=window.svgExecuted=true><circle r="4"/></svg>',
    '<svg><script>window.svgExecuted=true</script ></svg>',
    '<svg><a href="javascript:window.svgExecuted=true"><text>link</text></a></svg>',
    '<svg><foreignObject><img src=x onerror=window.svgExecuted=true></foreignObject></svg>',
    '<svg><a xlink:href="javascript:window.svgExecuted=true"><text>link</text></a></svg>',
    '<svg><animate attributeName="href" values="javascript:window.svgExecuted=true"/></svg>',
    '<svg><g onpointerover=window.svgExecuted=true><circle r="5"/></g></svg>',
  ];
  for (const content of attacks) {
    await page.evaluate(value => window.setSvg(value), content);
    assert.equal(await page.locator('.chat-svg-block script, .chat-svg-block foreignObject, .chat-svg-block animate').count(), 0);
    assert.equal(await page.locator('.chat-svg-block').evaluate(root => [...root.querySelectorAll('*')].some(node => [...node.attributes].some(attribute => /^on/i.test(attribute.name) || /javascript:/i.test(attribute.value)))), false);
    assert.equal(await page.evaluate(() => window.svgExecuted), undefined);
  }
  await page.evaluate(() => window.setSvg('<svg viewBox="0 0 20 20"><defs><linearGradient id="paint"><stop offset="0" stop-color="red"/></linearGradient></defs><circle cx="10" cy="10" r="8" fill="url(#paint)"/></svg>'));
  assert.equal(await page.locator('.chat-svg-block circle').getAttribute('fill'), 'url(#paint)');
  assert.equal(await page.locator('.chat-svg-block linearGradient').count(), 1);
  await page.evaluate(() => { window.editorAPI.focus(); window.editorAPI.editor.setPosition({lineNumber:1,column:1}); });
  await page.keyboard.type('// edited\n');
  assert.match(await page.evaluate(() => window.editorAPI.getValue()), /^\/\/ edited\nconst answer/);
  assert.equal(await page.evaluate(() => window.editorAPI.model.getLanguageId()), 'typescript');
  const workers = await page.evaluate(() => window.checkWorkers());
  assert.match(workers.html, /<strong>Dedicated worker<\/strong>/);
  assert.ok(workers.diff.stats.added > 0 && workers.diff.stats.removed > 0);
  assert.deepEqual(errors, []);
  await page.evaluate(() => window.dispose());
  console.log('PASS: SVG attacks removed, vector content retained, Monaco editing and dedicated workers functional');
} finally {
  await browser?.close();
  await server?.close();
  await rm(fixture, { recursive: true, force: true });
}
