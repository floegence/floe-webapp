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
`highlight` may control this from a nested host object. `selected` remains
host-owned. Rendered cards are culled beyond the viewport with an overscan
margin; this does not remove any graph records. Aggregate large domain sets
before layout, then materialize detail on demand.

`fitGraphViewport` centers the diagram. Layout's optional `anchor` preserves an
inspected node's world position when content dimensions change. For independent
regions, hosts can lay out only that region and keep other layout results;
never create a second mutable domain graph to persist renderer geometry.

The surface uses semantic theme tokens and supports forced colors. Consumers
can set `--graph-background`, `--graph-dot`, `--graph-edge`, and
`--graph-edge-active` without injecting arbitrary styles into graph documents.

Validation: `pnpm test packages/core/test/graph-layout.test.ts` covers compound
routes, cycles, self loops, malformed references, anchors, and large graphs.
After building core, run `node scripts/check-graph-browser.mjs` for the public
worker and browser interaction contract. This focused browser check belongs to
local qualification, not ordinary source-only push validation.
