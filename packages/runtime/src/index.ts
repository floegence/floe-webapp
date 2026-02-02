import type { Client } from '@floegence/flowersec-core';
import { createProxyRuntime } from '@floegence/flowersec-core/proxy';

export type ProxyRuntime = ReturnType<typeof createProxyRuntime>;

export type StartProxyRuntimeOptions = Readonly<{
  client: Client;
  /**
   * Optional global variable name to expose the runtime instance for debugging.
   * When omitted, the runtime is not attached to window.
   */
  globalName?: string;
}>;

export function startProxyRuntime(opts: StartProxyRuntimeOptions): ProxyRuntime {
  const runtime = createProxyRuntime({ client: opts.client });
  const name = String(opts.globalName ?? '').trim();
  if (name) {
    try {
      const g = globalThis as unknown as Record<string, unknown>;
      g[name] = runtime;
    } catch {
      // ignore
    }
  }
  return runtime;
}

export type RegisterServiceWorkerOptions = Readonly<{
  scriptUrl: string;
  scope?: string;
  /**
   * Optional query key to trigger a "soft navigation" repair when a hard reload causes
   * the current page load to be uncontrolled by the installed Service Worker.
   */
  repairQueryKey?: string;
  maxRepairAttempts?: number;
  controllerTimeoutMs?: number;
}>;

function swRepairAttemptFromURL(queryKey: string): number {
  try {
    const u = new URL(window.location.href);
    const raw = String(u.searchParams.get(queryKey) ?? '').trim();
    const n = raw ? Number(raw) : 0;
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(9, Math.floor(n));
  } catch {
    return 0;
  }
}

function navigateWithSwRepairAttempt(queryKey: string, attempt: number): void {
  try {
    const u = new URL(window.location.href);
    u.searchParams.set(queryKey, String(Math.max(0, Math.floor(attempt))));
    window.location.replace(u.toString());
  } catch {
    window.location.reload();
  }
}

function clearSwRepairQueryParam(queryKey: string): void {
  try {
    const u = new URL(window.location.href);
    if (!u.searchParams.has(queryKey)) return;
    u.searchParams.delete(queryKey);
    const search = u.searchParams.toString();
    const next = u.pathname + (search ? `?${search}` : '') + u.hash;
    history.replaceState(null, document.title, next);
  } catch {
    // ignore
  }
}

function waitForController(timeoutMs: number): Promise<boolean> {
  if (navigator.serviceWorker.controller) return Promise.resolve(true);
  const ms = Math.max(0, Math.floor(timeoutMs));

  return new Promise((resolve) => {
    let done = false;
    let t = 0;

    function finish(ok: boolean) {
      if (done) return;
      done = true;
      if (t) window.clearTimeout(t);
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      resolve(ok);
    }

    function onChange() {
      finish(true);
    }

    navigator.serviceWorker.addEventListener('controllerchange', onChange);

    // Avoid race: controller can become available before/after the listener registration.
    if (navigator.serviceWorker.controller) {
      finish(true);
      return;
    }

    if (ms > 0) {
      t = window.setTimeout(() => finish(Boolean(navigator.serviceWorker.controller)), ms);
    }
  });
}

/**
 * Register a Service Worker and ensure the current page is controlled.
 *
 * Notes:
 * - In DevTools hard reload flows, the SW may be installed but not control the current load.
 * - When repairQueryKey is provided, we perform a limited "soft navigation" repair to recover control.
 */
export async function registerServiceWorkerAndEnsureControl(opts: RegisterServiceWorkerOptions): Promise<void> {
  const scriptUrl = String(opts.scriptUrl ?? '').trim();
  if (!scriptUrl) throw new Error('scriptUrl is required');

  const scope = String(opts.scope ?? '/').trim() || '/';
  const queryKey = String(opts.repairQueryKey ?? '_floe_sw_repair').trim() || '_floe_sw_repair';
  const maxRepair = Math.max(0, Math.floor(opts.maxRepairAttempts ?? 2));
  const controllerTimeoutMs = Math.max(0, Math.floor(opts.controllerTimeoutMs ?? 2_000));

  await navigator.serviceWorker.register(scriptUrl, { scope });
  await navigator.serviceWorker.ready;

  const attempt = swRepairAttemptFromURL(queryKey);
  if (navigator.serviceWorker.controller) {
    if (attempt > 0) clearSwRepairQueryParam(queryKey);
    return;
  }

  const controlled = await waitForController(controllerTimeoutMs);
  if (controlled) {
    if (attempt > 0) clearSwRepairQueryParam(queryKey);
    return;
  }

  if (attempt < maxRepair) {
    navigateWithSwRepairAttempt(queryKey, attempt + 1);
    // Navigation will interrupt JS; keep pending so callers don't proceed with dependent work.
    await new Promise(() => {});
  }

  throw new Error('Service Worker is installed but not controlling this page');
}
