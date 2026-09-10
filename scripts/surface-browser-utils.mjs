import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, dirname, sep } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from 'playwright';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const artifactRoot = resolve(repoRoot, '.cache/surface-style');
export async function openSurfaceBrowser({ renderer = 'chromium' } = {}) {
  if (!['chromium', 'shell'].includes(renderer)) throw new Error('Unknown surface renderer');
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(
      artifactRoot,
      `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`
    );
    if (!file.startsWith(`${artifactRoot}${sep}`)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const data = await readFile(file);
      response
        .writeHead(200, {
          'Content-Type':
            {
              '.html': 'text/html',
              '.js': 'text/javascript',
              '.css': 'text/css',
              '.svg': 'image/svg+xml',
            }[extname(file)] ?? 'application/octet-stream',
        })
        .end(data);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  // Full Chromium uses the same compositor as the product browser. Keep the
  // software Headless Shell available as a separately identified diagnostic lane.
  const browser = await chromium.launch({
    headless: true,
    ...(renderer === 'chromium' ? { channel: 'chromium' } : {}),
  });
  return {
    browser,
    renderer,
    baseURL: `http://127.0.0.1:${server.address().port}`,
    close: async () => {
      await browser.close();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

export async function openFixture(
  browser,
  baseURL,
  version = 'current',
  entry = 'styles',
  mode = 'light',
  surface = 'standard',
  viewport = { width: 1440, height: 1080 }
) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseURL}/${version}-${entry}/dist/?mode=${mode}&surface=${surface}`);
  await page.waitForFunction(() => !!window.surfaceFixture);
  await page.waitForTimeout(350);
  return { page, errors };
}

/* global window */
