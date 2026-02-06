import { describe, expect, it, vi } from 'vitest';

type Globals = typeof globalThis & {
  window?: unknown;
  document?: unknown;
};

function restoreGlobal(g: Globals, key: 'window' | 'document', value: unknown) {
  const record = g as unknown as Record<string, unknown>;
  if (value === undefined) {
    delete record[key];
    return;
  }
  record[key] = value;
}

describe('Persist lifecycle', () => {
  it('does not register global listeners at module import time', async () => {
    const g = globalThis as Globals;

    const originalWindow = g.window;
    const originalDocument = g.document;

    const windowAdd = vi.fn();
    const documentAdd = vi.fn();

    const fakeWindow = { addEventListener: windowAdd, removeEventListener: vi.fn() };
    const fakeDocument = { addEventListener: documentAdd, removeEventListener: vi.fn(), visibilityState: 'visible' };

    (g as unknown as Record<string, unknown>).window = fakeWindow;
    (g as unknown as Record<string, unknown>).document = fakeDocument;

    try {
      vi.resetModules();
      await import('../src/context/FloeConfigContext');

      expect(windowAdd).not.toHaveBeenCalled();
      expect(documentAdd).not.toHaveBeenCalled();
    } finally {
      restoreGlobal(g, 'window', originalWindow);
      restoreGlobal(g, 'document', originalDocument);
    }
  });

  it('installPersistFlushListeners installs and uninstalls listeners', async () => {
    const g = globalThis as Globals;

    const originalWindow = g.window;
    const originalDocument = g.document;

    const windowAdd = vi.fn();
    const windowRemove = vi.fn();
    const documentAdd = vi.fn();
    const documentRemove = vi.fn();

    const fakeWindow = { addEventListener: windowAdd, removeEventListener: windowRemove };
    const fakeDocument = { addEventListener: documentAdd, removeEventListener: documentRemove, visibilityState: 'visible' };

    (g as unknown as Record<string, unknown>).window = fakeWindow;
    (g as unknown as Record<string, unknown>).document = fakeDocument;

    try {
      vi.resetModules();
      const { installPersistFlushListeners } = await import('../src/context/FloeConfigContext');

      const flush = vi.fn();
      const uninstall = installPersistFlushListeners({ flush });

      const pagehide = windowAdd.mock.calls.find(([type]) => type === 'pagehide')?.[1] as
        | (() => void)
        | undefined;
      const beforeunload = windowAdd.mock.calls.find(([type]) => type === 'beforeunload')?.[1] as
        | (() => void)
        | undefined;
      const visibilitychange = documentAdd.mock.calls.find(([type]) => type === 'visibilitychange')?.[1] as
        | (() => void)
        | undefined;

      expect(pagehide).toBeTypeOf('function');
      expect(beforeunload).toBeTypeOf('function');
      expect(visibilitychange).toBeTypeOf('function');

      pagehide?.();
      beforeunload?.();
      expect(flush).toHaveBeenCalledTimes(2);

      fakeDocument.visibilityState = 'hidden';
      visibilitychange?.();
      expect(flush).toHaveBeenCalledTimes(3);

      uninstall();

      expect(windowRemove).toHaveBeenCalledWith('pagehide', pagehide);
      expect(windowRemove).toHaveBeenCalledWith('beforeunload', beforeunload);
      expect(documentRemove).toHaveBeenCalledWith('visibilitychange', visibilitychange);
    } finally {
      restoreGlobal(g, 'window', originalWindow);
      restoreGlobal(g, 'document', originalDocument);
    }
  });
});
