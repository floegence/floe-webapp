/* global window, document */
import assert from 'node:assert/strict';
import { URL } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import solid from 'vite-plugin-solid';
const requireCore = createRequire(new URL('../packages/core/package.json', import.meta.url));
const { createServer } = await import(requireCore.resolve('vite'));
const html = `<button onclick="document.body.requestPointerLock().catch(e=>window.lockError=e.name)">Lock mouse</button><input value="Keep state"><script>window.tryLock=async()=>{await document.body.requestPointerLock().catch(()=>{});await new Promise(r=>setTimeout(r,100));};</script>`;
const fixture = `import {createSignal} from 'solid-js';import {render} from 'solid-js/web';import {SandboxedHtmlFrame} from '/packages/core/src/components/html-preview/SandboxedHtmlFrame';const [active,setActive]=createSignal(true),[inert,setInert]=createSignal(false),[html,setHTML]=createSignal(${JSON.stringify(html)});const dispose=render(()=><SandboxedHtmlFrame title="Game" html={html()} active={active()} inert={inert()} labels={{linkUnavailable:'Unavailable',anchorUnavailable:'Missing',pointerLocked:'Mouse locked; press Esc to exit'}}/>,document.getElementById('root'));window.test={setActive,setInert,dispose,replace:()=>setHTML('<h1>Replacement</h1>')};`;
const server = await createServer({
  configFile: false,
  resolve: {
    alias: [
      ...['solid-js', 'solid-js/web', 'solid-js/store', 'solid-js/html', 'solid-js/h'].map(
        (name) => ({
          find: new RegExp('^' + name + '$'),
          replacement: requireCore.resolve(
            name === 'solid-js'
              ? 'solid-js/dist/solid.js'
              : name + '/dist/' + name.split('/').at(-1) + '.js'
          ),
        })
      ),
    ],
  },
  optimizeDeps: { noDiscovery: true },
  plugins: [
    solid({ hot: false }),
    {
      name: 'pointer-lock-fixture',
      resolveId: (id) => (id === '/fixture.tsx' ? id : undefined),
      load: (id) => (id === '/fixture.tsx' ? fixture : undefined),
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url !== '/') return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(
            '<!doctype html><div id="root" style="height:400px"></div><button id="outside">Outside</button><script type="module" src="/fixture.tsx"></script>'
          );
        });
      },
    },
  ],
  server: { host: '127.0.0.1', port: 0, hmr: false },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'chromium', headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(4000);
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('[data-floe-html-state="ready"]').waitFor();
  const child = page.frames().find((frame) => frame !== page.mainFrame());
  const lock = async () => {
    await child.getByRole('button', { name: 'Lock mouse' }).click();
    await child.waitForFunction(() => !!document.pointerLockElement);
    await page.getByRole('status').filter({ hasText: 'Mouse locked; press Esc to exit' }).waitFor();
  };
  const released = async () => {
    await child.waitForFunction(() => !document.pointerLockElement);
    await page.getByRole('status').waitFor({ state: 'detached' });
  };
  await child.locator('input').fill('Retained game');
  await lock();
  await page.keyboard.press('Escape');
  await released();
  await child.evaluate(() => window.tryLock());
  await released();
  for (const option of ['setActive', 'setInert']) {
    await lock();
    await page.evaluate((option) => window.test[option](option === 'setInert'), option);
    await released();
    await child.evaluate(() => window.tryLock());
    await released();
    await page.evaluate((option) => window.test[option](option === 'setActive'), option);
    await child.evaluate(() => window.tryLock());
    await released();
    assert.equal(await child.locator('input').inputValue(), 'Retained game');
  }
  await lock();
  await page.locator('#outside').focus();
  await released();
  await lock();
  await page.evaluate(() => window.test.replace());
  await page.frameLocator('iframe').getByRole('heading', { name: 'Replacement' }).waitFor();
  assert.equal(await page.getByRole('status').count(), 0);
  await page.evaluate(() => window.test.dispose());
  assert.equal(await page.locator('iframe').count(), 0);
  console.log(
    'PASS HTML pointer lock: trusted acquisition, release, inactive/inert/blur fences, retained state, replacement and disposal'
  );
} finally {
  await browser?.close();
  await server.close();
}
