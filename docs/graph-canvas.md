# Graph canvas

`@floegence/floe-webapp-core/graph` provides a controlled graph surface for
relationship diagrams. Import `@floegence/floe-webapp-core/graph.css` alongside
the application's normal Floe styles. The package owns wheel zoom, drag pan,
compound layout, orthogonal routes, selection affordances, viewport culling,
and pointer/keyboard object events. Consumers own domain data, card artwork,
localized labels, persistence, and authorization.

Create one `createGraphLayoutEngine()` per mounted graph. Call `layout(input)`
and pass the returned `GraphLayout` to `GraphCanvas`. Dispose the engine on
unmount. Layout runs in a packaged module worker, so no worker URL or CDN
configuration is needed. Worker and validation errors reject the request;
the host must retain the last rendered graph and show an actionable error.
Multiple requests are correlated independently; hosts must only apply the
result of their latest requested document.

Nodes have stable IDs, accessible labels, measured dimensions, optional ports,
and optional parent group IDs. Groups are containers, not domain objects with
automatic execution semantics. Node, port, and edge IDs share one namespace.
Containment must be acyclic; relationships may form cycles or self loops.
Endpoints reference explicit nodes and optional ports on those nodes. Layout
validates this contract before invoking ELK. All returned coordinates, including
edge sections, use the same absolute world space.

`GraphCanvas` renders host-owned `renderNode` and `renderGroup` slots. It emits
`onActivate` and `onContextMenu` with stable object references and client-space
positions. Enter activates a focused object; the Context Menu key or Shift+F10
opens its menu. Slots should expose a touch-accessible action button using
`context.openMenu`. Blank canvas events carry `object: null`. Pass event
`position` and `owner` directly to `SurfaceFloatingLayer`; do not rescale them.
Use shared menu/window components for dismissal, focus return, and rich detail.

Wheel zoom remains active over ordinary cards. Dragging cards pans without
selecting labels or activating them on pointer release. Buttons, text inputs,
and explicit `data-floe-canvas-interactive` regions retain native interaction.
Put selectable detail text in a shared floating layer outside the zoomed plane.

Routes are faint but visible by default. Hovering or focusing a node emphasizes
its relations; a group traces descendant relations and hides unrelated edges.
Automatic border anchors are chosen jointly from peer-facing spans and free
obstacle corridors. Their attached segments can separate into lanes; batches
with explicit ports or self loops preserve their exact endpoint constraints.
`highlight` may control this from a nested host object. `selected` remains
host-owned. Rendered cards and edge segments are culled beyond the viewport with an overscan
margin; selected objects remain mounted. This does not remove any graph records.
Packing, coordinate normalization, and libavoid routing run in a dedicated
worker; its packaged ELK child worker preserves the official ELK protocol.
Pending requests reject on disposal or worker failure. Aggregate large domain sets
before layout, then materialize detail on demand.

`fitGraphViewport` centers the diagram. Layout's optional `anchor` preserves an
inspected node's world position when content dimensions change. For independent
regions, hosts can lay out only that region and keep other layout results;
never create a second mutable domain graph to persist renderer geometry.

Optional `positions: [{ nodeId, x, y }]` use absolute world coordinates.
`positionMode: 'fixed'` is the default: positions are exact, descendants move
with their group, and impossible containment or obstructed routes reject the
request. Use `positionMode: 'preferred'` for authored or generated layout hints.
Clear coordinates are retained; overlapping siblings are separated deterministically
by the smaller forward horizontal or vertical shift. Groups resize around their
content, and moving a group moves its complete subtree. Requested spacing is a
minimum, with at least 16 units between siblings and 12 units of group padding
to keep routed endpoints clear. The worker routes this resulting geometry once;
it never drops nodes or edges or retries with an unrelated automatic layout.
Unknown, duplicate, or nonfinite positions still reject. Positions take
precedence over the transient anchor in both modes. Preferred geometry is a
render result; hosts need not rewrite persisted hints.

The surface uses semantic theme tokens and supports forced colors. Consumers
can set `--graph-background`, `--graph-dot`, `--graph-edge`, and
`--graph-edge-active` without injecting arbitrary styles into graph documents.

Validation: `pnpm test packages/core/test/graph-layout.test.ts` covers compound
routes, cycles, self loops, malformed references, anchors, and large graphs.
After building core, run `node scripts/check-graph-browser.mjs` for the public
worker and browser interaction contract. This focused browser check belongs to
local qualification, not ordinary source-only push validation.

Set `GraphCanvas.minimap = { ariaLabel }` to show a compact interactive overview.
It uses the main layout without starting another engine, renders the topology
as three cached SVG paths, and shows the live viewport rectangle. Drag that
rectangle to pan, click elsewhere to center, use arrow keys to navigate, or
press Home to fit. Pointer capture, touch, theme tokens, and forced colors are
owned by Floe; hosts supply the localized label.

Run `node scripts/check-graph-scale-browser.mjs <evidence-directory>` after
building Core for 100, 500, and 1,000 actual nodes, both ungrouped and in groups
of ten. The check records complete layout/edge counts, layout and paint times,
main-thread long tasks, visible DOM counts, and pan frame P95. It qualifies
responsiveness and bounded layout completion without replacing large input
graphs with domain aggregates. This is local performance qualification, not
ordinary push CI. Anchor candidates use obstacles in each endpoint corridor;
all obstacles remain in the routing engine. ELK retains stable node model order
without its quadratic edge-model ordering pass.

## Offline file-origin hosts

Use `graphBlobWorkersPlugin` from `@floegence/floe-webapp-core/graph-assets`
in the host Vite build when WKWebView cannot create file-origin workers.
The plugin transports the unchanged published layout and ELK modules through
local blob workers; it keeps the original `assets/libavoid.wasm` independently
replaceable. The host must grant local file read access and include `blob:` in
`script-src`, `worker-src`, and `connect-src`. No remote resource is required.
Ordinary HTTP applications retain the default worker path. Do not transform
worker internals or copy the layout/routing implementation in a product.

Production consumers must keep the worker resource closure intact: the published
layout worker references its ELK child worker and independently replaceable WASM
through statically discoverable URLs. Run `node scripts/check-graph-production.mjs`
after building Core to qualify actual built HTTP applications with Vite 7 and 8,
including successful child-worker and raw-WASM requests. Development-server
acceptance alone cannot prove that a host ships the complete worker closure.
