/* global window, InputEvent, CompositionEvent, KeyboardEvent */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { chromium, webkit, firefox } from 'playwright';
import ts from 'typescript';

const sourceMode = process.argv.includes('--source');
const script = sourceMode
  ? ts.transpileModule(readFileSync('packages/core/src/remote-input.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText
  : readFileSync('packages/core/dist/remote-input.js', 'utf8');
const css = readFileSync(`packages/core/${sourceMode ? 'src/styles' : 'dist'}/remote-input.css`, 'utf8');
const server = createServer((request, response) => {
  if (request.url === '/input.js') {
    response.setHeader('content-type', 'text/javascript'); response.end(script); return;
  }
  response.setHeader('content-type', 'text/html');
  response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body{margin:0}#surface{position:absolute;inset:40px 0 0}button{position:relative;z-index:2}</style></head><body><button id="outside">Outside</button><div id="surface"></div><script type="module">
    import {createRemoteInput} from '/input.js';
    window.events=[];
    window.input=createRemoteInput({surface:document.querySelector('#surface'),label:'Remote application input',
      commitText:(text,target)=>window.events.push(['text',text,target]),
      sendKey:(key,target)=>window.events.push(['key',key.key,key.pressed,target]),
      release:target=>window.events.push(['release',target])});
    window.input.bindTarget('first');window.input.focus();
  </script></body></html>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const engines = process.argv.includes('--all') ? { chromium, webkit, firefox } : { chromium };
try {
  for (const [name, engine] of Object.entries(engines)) {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.waitForFunction(() => !!window.input);
      const result = await page.evaluate(() => {
        const input = window.input;
        const element = input.element;
        const snapshot = () => window.events.splice(0);
        const before = (inputType, data = null) => element.dispatchEvent(new InputEvent('beforeinput', {inputType,data,bubbles:true,cancelable:true}));
        const edit = (value, inputType = 'insertText', isComposing = false) => {
          element.value = value;
          element.dispatchEvent(new InputEvent('input', {inputType,data:value,isComposing,bubbles:true}));
        };
        const start = () => element.dispatchEvent(new CompositionEvent('compositionstart', {bubbles:true}));
        const end = data => element.dispatchEvent(new CompositionEvent('compositionend', {data,bubbles:true}));
        // These strings intentionally exercise multiple scripts and Unicode scalars.
        const text = '你好日本語한글🙂👩🏽‍💻e\u0301𠮷';
        start(); edit(text, 'insertCompositionText', true);
        const preedit = snapshot();
        end(text); edit(text, 'insertFromComposition');
        const after = snapshot();
        start(); edit(text, 'insertCompositionText', true); end(text);
        const identical = snapshot();
        start(); edit('cancelled', 'insertCompositionText', true); end('');
        const cancelled = snapshot();
        start(); edit('stale', 'insertCompositionText', true);
        input.bindTarget('second'); end('stale'); edit('stale','insertFromComposition');
        const stale = snapshot();
        input.focus(); start(); edit('先', 'insertFromComposition', false); end('先');
        const beforeEnd = snapshot();
        start(); edit('字', 'insertCompositionText', true);
        element.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',isComposing:true,cancelable:true}));
        end('字'); element.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter'}));
        const imeEnter = snapshot();
        start();
        element.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',code:'ArrowLeft',isComposing:true,cancelable:true}));
        input.reset(); end(''); input.focus();
        element.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',code:'ArrowLeft',cancelable:true}));
        element.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowLeft',code:'ArrowLeft'}));
        const abandonedKey = snapshot();
        before('insertText','mobile'); edit('mobile');
        before('deleteContentBackward'); before('deleteContentForward'); before('insertLineBreak');
        const mobile = snapshot();
        input.setAnchor(380,690); start(); edit('候選', 'insertCompositionText', true);
        const rect = element.getBoundingClientRect();
        end('候選'); snapshot();
        input.bindTarget(null); before('insertText','disconnected'); edit('disconnected');
        const disconnected = snapshot();
        input.bindTarget('third'); input.focus();
        return {text,preedit,after,identical,cancelled,stale,beforeEnd,imeEnter,abandonedKey,mobile,
          bounds:[rect.left,rect.top,rect.right,rect.bottom],disconnected};
      });
      assert.deepEqual(result.preedit, []);
      assert.deepEqual(result.after, [['text',result.text,'first']]);
      assert.deepEqual(result.identical, [['text',result.text,'first']]);
      assert.deepEqual(result.cancelled, []);
      assert.ok(!result.stale.some(event => event[0] === 'text'));
      assert.deepEqual(result.beforeEnd, [['text','先','second']]);
      assert.deepEqual(result.imeEnter, [['text','字','second']]);
      assert.deepEqual(result.abandonedKey, [['key','ArrowLeft',true,'second'],['key','ArrowLeft',false,'second']]);
      assert.deepEqual(result.mobile, [
        ['text','mobile','second'],['key','Backspace',true,'second'],['key','Backspace',false,'second'],
        ['key','Delete',true,'second'],['key','Delete',false,'second'],
        ['key','Enter',true,'second'],['key','Enter',false,'second'],
      ]);
      assert.ok(result.bounds[0] >= 0 && result.bounds[1] >= 40 && result.bounds[2] <= 390 && result.bounds[3] <= 700);
      assert.deepEqual(result.disconnected, []);
      await page.keyboard.type('Ab');
      assert.deepEqual(await page.evaluate(() => window.events.splice(0)), [
        ['key','A',true,'third'],['key','A',false,'third'],['key','b',true,'third'],['key','b',false,'third'],
      ]);
      await page.keyboard.down('ArrowLeft');
      await page.locator('#outside').click();
      assert.deepEqual(await page.evaluate(() => window.events.splice(0)), [['key','ArrowLeft',true,'third'],['release','third']]);
      await page.keyboard.up('ArrowLeft');
      await page.evaluate(() => { window.input.focus(); window.events=[]; });
      await page.keyboard.insertText('🙂👩🏽‍💻e\u0301𠮷\n第二行');
      assert.deepEqual(await page.evaluate(() => window.events.splice(0)), [['text','🙂👩🏽‍💻e\u0301𠮷\n第二行','third']]);
      if (name === 'chromium') {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.imeSetComposition', {text:'ni',selectionStart:2,selectionEnd:2});
        assert.deepEqual(await page.evaluate(() => window.events.splice(0)), []);
        await cdp.send('Input.insertText', {text:'你好'});
        assert.deepEqual(await page.evaluate(() => window.events.splice(0)), [['text','你好','third']]);
        await cdp.send('Input.imeSetComposition', {text:'cancel',selectionStart:6,selectionEnd:6});
        await cdp.send('Input.imeSetComposition', {text:'',selectionStart:0,selectionEnd:0});
        assert.deepEqual(await page.evaluate(() => window.events.splice(0)), []);
        await cdp.detach();
      }
      await page.evaluate(() => { window.input.dispose(); });
      assert.equal(await page.locator('textarea').count(), 0);
      console.log(`PASS ${name}: composition transactions, Unicode, keys, mobile edits, target revocation and bounded anchoring`);
    } finally { await browser.close(); }
  }
} finally { await new Promise(resolve => server.close(resolve)); }
