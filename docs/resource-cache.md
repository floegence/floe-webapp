# Persistent resource snapshots

`@floegence/floe-webapp-core/resource-cache` provides a framework-neutral cache for
previously successful presentation data. It restores snapshots while a consumer
fetches current data, without owning polling, transport recovery, authorization,
navigation, or mutation policy. The default entrypoint does not load this module.

Create one `createResourceCache({ storage, maxBytes })` per application. Browser
consumers can use `createIndexedDBResourceCacheStorage(databaseName)`. Native hosts
can implement `ResourceCacheStorage` with asynchronous IPC. Its `get` method must
record access time; `list` reports UTF-8 payload bytes and access time for bounded
least-recently-used eviction. Storage is exclusively for disposable snapshots.

After authenticating the current user and environment, acquire a resource with
`cache.resource({ scope, key, version, decode, persist })`. Identity includes the
scope, resource key, and snapshot version. `decode` validates untrusted disk data;
optional `persist` projects live results to a safe presentation-only shape. Do not
store credentials, mutation approvals, executable plans, or private access URLs.

`snapshot()` exposes `data`, `refreshing`, `stale`, and `error`; `subscribe` lets a
view observe changes. `undefined` means no snapshot; an empty array is valid data.
Hydration starts on acquisition. `refresh(signal => fetchData(signal))` runs
concurrently with hydration and deduplicates concurrent callers for that resource.
Failed refreshes retain the last successful snapshot, and slow disk reads cannot
replace newer network results. Consumers decide how to present refresh/errors.

`set` accepts an authoritative result and fences earlier requests. `invalidate()`
aborts in-flight requests and deletes the durable copy while retaining visible
data as stale; `invalidate(true)` also clears visible data. Invalidate affected
resources after successful mutations. On authorization loss, call `clearScope`
and stop requesting that scope. Cached data is never authorization for an action.

Equal results do not rewrite snapshots. Writes are coalesced (100 ms by default),
and the default persisted budget is 32 MiB. `flush()` awaits queued writes;
`dispose()` cancels requests and schedules a final flush. Storage failures do not
reject successful network data. Refresh promises still reject network failures,
so consumers must handle them. A cache is not a durable user-data store.

Run the focused unit suite and `node scripts/check-resource-cache-browser.mjs`
after building core to verify real IndexedDB restoration across a page reload.

Native adapters that partition access by owner can use `enforceResourceCacheBudget` over their complete private storage index to enforce one physical byte budget. Return opaque adapter-owned keys from that internal index; do not expose another owner's records through the renderer bridge. The same eviction policy is used by the resource cache itself. Reusing a handle counts as recent use, and an evicted handle can persist its next successful refresh again.
