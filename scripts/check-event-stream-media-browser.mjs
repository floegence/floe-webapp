/* global window, document */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { setInterval, clearInterval } from 'node:timers';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const requireBoot = createRequire(new URL('../packages/boot/package.json', import.meta.url));
const { createServer } = await import(requireBoot.resolve('vite'));
// Synthetic six-second H.264/AAC clip; no user media is used by this test.
const media = readFileSync(new URL('./fixtures/media/scheduler.mp4', import.meta.url));
const streams = new Set();
let mediaRequests = 0;
const html = `<!doctype html><html><body><video muted controls preload="metadata"></video>
<script type="module">
import * as events from '/packages/boot/src/server-sent-events.ts';
window.startStreams = async (mode) => {
  window.eventCounts = [0, 0, 0];
  window.controllers = window.eventCounts.map(() => new AbortController());
  window.streamTasks = window.controllers.map(async (controller, index) => {
    const input = '/events/' + index;
    const options = { signal: controller.signal, headers: { Accept: 'text/event-stream' } };
    try {
      if (mode === 'reader') {
        for await (const frame of events.fetchServerSentEvents(input, options)) {
          window.eventCounts[index] = Number(frame.data);
        }
      } else {
        const response = await fetch(input, events.createServerSentEventRequestInit(options));
        const reader = response.body.getReader();
        try {
          while (!(await reader.read()).done) window.eventCounts[index]++;
        } finally { reader.releaseLock(); }
      }
    } catch (error) {
      if (!controller.signal.aborted) throw error;
    }
  });
};
window.stopStreams = async () => {
  window.controllers.forEach(controller => controller.abort());
  await Promise.all(window.streamTasks);
};
</script></body></html>`;

const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  server: { host: '127.0.0.1', port: 0 },
  plugins: [{
    name: 'event-stream-media-fixture',
    configureServer(instance) {
      instance.middlewares.use((request, response, next) => {
        if (request.url === '/media.html') {
          response.setHeader('Content-Type', 'text/html');
          void instance.transformIndexHtml('/media.html', html).then(body => response.end(body));
        } else if (request.url?.startsWith('/events/')) {
          streams.add(response);
          response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' });
          let sequence = 1;
          response.write(`data: ${sequence}\n\n`);
          const timer = setInterval(() => response.write(`data: ${++sequence}\n\n`), 50);
          response.once('close', () => { clearInterval(timer); streams.delete(response); });
        } else if (request.url === '/media.mp4') {
          mediaRequests++;
          const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range ?? '');
          const start = range ? Number(range[1]) : 0;
          const end = range?.[2] ? Math.min(Number(range[2]), media.length - 1) : media.length - 1;
          response.writeHead(range ? 206 : 200, {
            'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store',
            'Content-Length': end - start + 1,
            ...(range ? { 'Content-Range': `bytes ${start}-${end}/${media.length}` } : {}),
          });
          response.end(media.subarray(start, end + 1));
        } else next();
      });
    },
  }],
});

let browser;
try {
  await server.listen();
  // The full headless browser runs network quality estimation; headless-shell does not.
  browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--force-effective-connection-type=3G'] });
  for (const mode of ['reader', 'request-init']) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      await page.goto(`${server.resolvedUrls.local[0]}media.html`);
      await page.waitForFunction(() => typeof window.startStreams === 'function');
      assert.equal(await page.evaluate(() => window.navigator.connection.effectiveType), '3g');
      await page.evaluate(mode => window.startStreams(mode), mode);
      await page.waitForFunction(() => window.eventCounts.every(count => count >= 2));
      assert.equal(streams.size, 3);
      const requestsBefore = mediaRequests;
      await page.locator('video').evaluate(video => { video.src = '/media.mp4'; });
      await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
      assert.ok(mediaRequests > requestsBefore, 'Media must reach the server while all event streams remain open');
      assert.equal(streams.size, 3);
      const counts = await page.evaluate(() => window.eventCounts.slice());
      await page.waitForFunction(previous => window.eventCounts.every((count, index) => count > previous[index]), counts);
      await page.locator('video').evaluate(video => video.play());
      await page.waitForFunction(() => document.querySelector('video').currentTime > 0.1);
      await page.locator('video').evaluate(video => { video.currentTime = 4; });
      await page.waitForFunction(() => { const video = document.querySelector('video'); return !video.seeking && video.currentTime >= 4; });
      await page.evaluate(() => window.stopStreams());
    } finally { await context.close(); }
  }
  console.log('SSE request defaults preserve native media loading, playback, seeking, and live events under Chromium 3G scheduling.');
} finally {
  await browser?.close();
  for (const response of streams) response.end();
  await server.close();
}
