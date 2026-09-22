/** Disposable presentation snapshots. Authorization and polling belong to the consumer. */
export interface ResourceCacheStorage {
  /** Reads also update the entry's last-access time. */
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  list(): Promise<readonly { key: string; bytes: number; lastAccessedAt: number }[]>;
}

export interface ResourceSnapshot<T> {
  readonly data: T | undefined;
  /** True until storage settles, or live data/invalidation supersedes restoration. */
  readonly restoring: boolean;
  readonly refreshing: boolean;
  readonly stale: boolean;
  readonly error: unknown;
}

export interface CachedResource<T> {
  snapshot(): ResourceSnapshot<T>;
  subscribe(listener: () => void): () => void;
  hydrate(): Promise<void>;
  refresh(fetcher: (signal: AbortSignal) => Promise<T>): Promise<T>;
  set(value: T): void;
  /** Keeps the visible snapshot by default, but removes its durable copy. */
  invalidate(clear?: boolean): void;
}

export interface CachedResourceDefinition<T> {
  scope: string;
  key: string;
  version: number;
  /** Validate and decode untrusted persisted content; throw to reject it. */
  decode(value: unknown): T;
  /** Persist an explicit presentation projection when live data contains private fields. */
  persist?(value: T): unknown;
}

export interface ResourceCache {
  resource<T>(definition: CachedResourceDefinition<T>): CachedResource<T>;
  /** Abort pending refreshes without retiring snapshots, storage, hydration or subscribers. */
  cancelRefreshes(scope: string): void;
  clearScope(scope: string): Promise<void>;
  flush(): Promise<void>;
  dispose(): void;
}

/** Apply one byte budget to an adapter's complete storage namespace. */
export async function enforceResourceCacheBudget(storage: Pick<ResourceCacheStorage, 'list' | 'remove'>, maxBytes: number): Promise<readonly string[]> {
  const entries = [...await storage.list()].sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
  let total = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  const removed: string[] = [];
  for (const entry of entries) {
    if (total <= Math.max(0, maxBytes)) break;
    await storage.remove(entry.key);
    removed.push(entry.key);
    total -= entry.bytes;
  }
  return removed;
}

export function createResourceCache(options: {
  storage: ResourceCacheStorage;
  maxBytes?: number;
  writeDelayMs?: number;
}): ResourceCache {
  const storage = options.storage;
  const maxBytes = Math.max(0, options.maxBytes ?? 32 * 1024 * 1024);
  const resources = new Map<string, { scope: string; handle: CachedResource<unknown>; accessedAt: number; evicted(): void; cancelRefresh(): void; stop(): void }>();
  const pending = new Map<string, { value: string; valid(): boolean; stored(): void }>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writes = Promise.resolve();
  let disposed = false;
  const enqueue = (operation: () => Promise<void>) => {
    // Persistence failure cannot turn successful live data into a failed request.
    writes = writes.then(operation).catch(() => undefined);
    return writes;
  };
  const trim = async () => {
    const removed = await enforceResourceCacheBudget({
      list: async () => (await storage.list()).map(entry => ({ ...entry, lastAccessedAt: Math.max(entry.lastAccessedAt, resources.get(entry.key)?.accessedAt ?? 0) })),
      remove: key => storage.remove(key),
    }, maxBytes);
    for (const key of removed) resources.get(key)?.evicted();
  };
  const flush = async () => {
    clearTimeout(timer);
    timer = undefined;
    const batch = [...pending];
    pending.clear();
    if (batch.length) enqueue(async () => {
      for (const [key, write] of batch) {
        if (write.valid()) {
          try { await storage.set(key, write.value); write.stored(); } catch { /* Best-effort cache. */ }
        }
      }
      await trim();
    });
    await writes;
  };
  const schedule = (key: string, value: string, valid: () => boolean, stored: () => void) => {
    pending.set(key, { value, valid, stored });
    if (timer === undefined) timer = setTimeout(() => { void flush(); }, options.writeDelayMs ?? 100);
  };

  const resource = <T>(definition: CachedResourceDefinition<T>): CachedResource<T> => {
    if (disposed) throw new Error('Resource cache is disposed');
    if (!definition.scope || !definition.key || !Number.isSafeInteger(definition.version)) throw new Error('Invalid resource identity');
    const key = JSON.stringify([definition.scope, definition.key, definition.version]);
    const existing = resources.get(key);
    if (existing) { existing.accessedAt = Date.now(); return existing.handle as CachedResource<T>; }
    let state: ResourceSnapshot<T> = { data: undefined, restoring: true, refreshing: false, stale: true, error: undefined };
    const listeners = new Set<() => void>();
    let revision = 0;
    let requestID = 0;
    let serialized: string | undefined;
    let persisted: string | undefined;
    let controller: AbortController | undefined;
    let request: Promise<T> | undefined;
    let rejectCancellation: (() => void) | undefined;
    const notify = () => { for (const listener of listeners) listener(); };
    const accept = (value: T) => {
      ++revision;
      state = { data: value, restoring: false, refreshing: state.refreshing, stale: false, error: undefined };
      try {
        const next = JSON.stringify({ version: definition.version, data: definition.persist ? definition.persist(value) : value });
        serialized = next;
        if (next !== persisted) {
          schedule(key, next, () => serialized === next, () => { persisted = next; });
        } else {
          pending.delete(key);
        }
      } catch { /* Non-serializable live values remain usable. */ }
      notify();
    };
    const hydrationRevision = revision;
    const hydration = storage.get(key).then(raw => {
      if (disposed || revision !== hydrationRevision || raw === null) return;
      try {
        const stored = JSON.parse(raw) as { version?: unknown; data?: unknown };
        if (stored.version !== definition.version) throw new Error('Unsupported snapshot');
        const data = definition.decode(stored.data);
        state = { ...state, data, stale: true };
        serialized = raw;
        persisted = raw;
      } catch {
        void enqueue(() => storage.remove(key));
      }
    }).catch(() => undefined).finally(() => {
      if (disposed || !state.restoring) return;
      state = { ...state, restoring: false };
      notify();
    });
    const invalidate = (clear = false) => {
      ++revision;
      ++requestID;
      controller?.abort();
      controller = undefined;
      request = undefined;
      serialized = undefined;
      persisted = undefined;
      pending.delete(key);
      state = { data: clear ? undefined : state.data, restoring: false, refreshing: false, stale: true, error: undefined };
      notify();
      void enqueue(() => storage.remove(key));
    };
    const handle: CachedResource<T> = {
      snapshot: () => state,
      subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
      hydrate: () => hydration,
      refresh: fetcher => {
        if (request) return request;
        const id = ++requestID;
        const abort = new AbortController();
        controller = abort;
        state = { ...state, refreshing: true, error: undefined };
        notify();
        const cancelled = new Promise<never>((_resolve, reject) => {
          rejectCancellation = () => reject(new DOMException('Resource refresh cancelled', 'AbortError'));
        });
        const fetched = Promise.resolve().then(() => fetcher(abort.signal)).then(value => {
          if (!disposed && id === requestID && !abort.signal.aborted) accept(value);
          return value;
        }, error => {
          if (!disposed && id === requestID && !abort.signal.aborted) {
            state = { ...state, stale: true, error };
            notify();
          }
          throw error;
        });
        request = Promise.race([fetched, cancelled]).finally(() => {
          if (id !== requestID) return;
          request = undefined;
          controller = undefined;
          rejectCancellation = undefined;
          state = { ...state, refreshing: false };
          notify();
        });
        return request;
      },
      set: value => {
        ++requestID;
        controller?.abort();
        request = undefined;
        state = { ...state, refreshing: false };
        accept(value);
      },
      invalidate,
    };
    resources.set(key, { scope: definition.scope, accessedAt: Date.now(), evicted: () => { persisted = undefined; }, handle: handle as CachedResource<unknown>, cancelRefresh: () => {
      if (!request) return;
      ++requestID;
      rejectCancellation?.();
      rejectCancellation = undefined;
      controller?.abort();
      controller = undefined;
      request = undefined;
      state = { ...state, refreshing: false, stale: true };
      notify();
    }, stop: () => {
      ++requestID;
      controller?.abort();
      listeners.clear();
    } });
    return handle;
  };

  return {
    resource,
    flush,
    cancelRefreshes: scope => {
      for (const entry of resources.values()) if (entry.scope === scope) entry.cancelRefresh();
    },
    clearScope: async scope => {
      for (const entry of resources.values()) if (entry.scope === scope) entry.handle.invalidate(true);
      await enqueue(async () => {
        for (const entry of await storage.list()) {
          try { if (JSON.parse(entry.key)[0] === scope) await storage.remove(entry.key); } catch { /* Foreign storage key. */ }
        }
      });
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const entry of resources.values()) entry.stop();
      void flush();
      resources.clear();
    },
  };
}

/** A dedicated database containing disposable snapshots only, never application settings. */
export function createIndexedDBResourceCacheStorage(name = 'floe-resource-cache'): ResourceCacheStorage {
  type Entry = { key: string; value: string; bytes: number; lastAccessedAt: number };
  let connection: Promise<IDBDatabase> | undefined;
  const open = () => connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('snapshots', { keyPath: 'key' });
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = undefined; };
      resolve(db);
    };
    request.onerror = () => { connection = undefined; reject(request.error); };
    request.onblocked = () => { connection = undefined; reject(new Error('Resource cache database is blocked')); };
  });
  const transact = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, result: (value: T) => void) => void): Promise<T> => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction('snapshots', mode);
      let value: T;
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('Resource cache transaction aborted'));
      run(transaction.objectStore('snapshots'), result => { value = result; });
    });
  };
  return {
    get: key => transact<string | null>('readwrite', (store, result) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const entry = request.result as Entry | undefined;
        if (entry) store.put({ ...entry, lastAccessedAt: Date.now() });
        result(entry?.value ?? null);
      };
    }),
    set: (key, value) => transact<void>('readwrite', (store, result) => {
      store.put({ key, value, bytes: new TextEncoder().encode(value).byteLength, lastAccessedAt: Date.now() } satisfies Entry);
      result(undefined);
    }),
    remove: key => transact<void>('readwrite', (store, result) => { store.delete(key); result(undefined); }),
    list: () => transact('readonly', (store, result) => {
      const entries: Omit<Entry, 'value'>[] = [];
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) { result(entries); return; }
        const { key, bytes, lastAccessedAt } = cursor.value as Entry;
        entries.push({ key, bytes, lastAccessedAt });
        cursor.continue();
      };
    }),
  };
}
