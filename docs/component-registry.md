# Component Registry & Contributions

Floe uses a registry-based contribution model (sidebar tabs, commands, status bar, lifecycle).

Primary implementation:

- `packages/core/src/context/ComponentRegistry.tsx`

## Registry lifecycle

Recommended options:

- Use `FloeApp` when you want the standard Shell + overlays wiring (it mounts and cleans up the registry for you).
- Use `FloeRegistryRuntime` when you want a custom shell (Portal/EnvApp style) but still want registry lifecycle to be symmetric (register + mount + cleanup).
- Add `FloeRegistryContributions` inside either runtime when contribution membership changes while the app is running.

Notes:

- `ComponentRegistry.registerAll()` returns a disposer. Call it on cleanup to avoid registration leaks in HMR/remount flows.

Implementation references:

- `packages/core/src/app/FloeApp.tsx`
- `packages/core/src/app/FloeRegistryRuntime.tsx`
- `packages/core/src/app/FloeRegistryContributions.tsx`

### Dynamic contributions

`FloeRegistryContributions` reconciles a reactive component list by stable `id`:

```tsx
import { ActivityAppsMain, FloeRegistryContributions } from '@floegence/floe-webapp-core/app';

export function ProductActivities() {
  return (
    <>
      <FloeRegistryContributions components={dynamicActivities()} />
      <ActivityAppsMain />
    </>
  );
}
```

- Adding an id registers and mounts it.
- Removing an id waits for `onUnmount`, then unregisters it.
- Lifecycle work is serialized, including changes received while an earlier mount or unmount is still pending.
- Updating a retained id refreshes its registry projection without restarting lifecycle. Existing `ActivityAppsMain` / `KeepAliveStack` views therefore keep their mounted DOM and local state.
- Empty, non-canonical, duplicate, or already-owned ids fail through `onError`; dynamic contributions never replace a separately registered component.

## FloeComponent

```ts
import type { FloeComponent } from '@floegence/floe-webapp-core';
```

Key fields (see the type in `packages/core/src/context/ComponentRegistry.tsx`):

- `id`: stable identifier (used by layout state, commands, storage prefix)
- `name`: display name
- `icon`: optional icon component (required for appearing in the activity bar / mobile tab bar)
- `component`: the registered Solid component
- `sidebar`: sidebar/mobile-tab contribution flags
- `commands`: command palette contributions
- `statusBar`: bottom bar contributions (desktop)
- `onMount(ctx)` / `onUnmount()`: lifecycle hooks

## Sidebar & Mobile Tabs

Shell derives tabs from the registry:

- `packages/core/src/components/layout/Shell.tsx`

Rules:

- Only components with both `sidebar` and `icon` appear as tabs.
- `sidebar.hiddenOnMobile` hides a tab on mobile.
- `sidebar.badge` can render counts/labels in the tab UI.
- `sidebar.collapseBehavior` can override activity-bar collapse semantics:
  - `toggle`: clicking the active tab collapses/expands the sidebar.
  - `preserve`: tab switching does not mutate collapsed state.
  - default: `fullScreen` tabs use `preserve`, others use `toggle`.

Product-owned context menus can be attached without moving menu policy into Floe. `ActivityBarItem.onContextMenu` and `WorkbenchHostDockItem.onContextMenu` receive the concrete trigger button, a viewport-space anchor, and a `pointer` or `keyboard` source. Floe handles right-click, the Context Menu key, Shift+F10, native-menu suppression, and `aria-haspopup="menu"`; the product owns menu contents, placement surface, focus restoration, and actions.

`WorkbenchSurface.dockModeIcons` accepts optional `work` and `background` icon components. The Dock uses the same artwork in the current-mode trigger and mode menu; omitted entries keep the built-in icons. The lower-level `WorkbenchDock` accepts this map as `modeIcons`. This presentation override does not change mode selection, labels, or input ownership.

Workbench host items default to the leading host group. Set `WorkbenchHostDockItem.dockPlacement` to `after-components` to render an item after Floe's component group. External Dock drags use the same optional field on `WorkbenchExternalDockDragItem`, so their placeholder matches the final host-item position.

`WorkbenchSurface.dockItemActivationMode` applies only to Floe's built-in component items. It defaults to `solo-filter`; `focus-cycle` navigates spatially ordered widgets, sticky notes, text, and background regions, or creates an empty type at the viewport center. It does not change `WorkbenchHostDockItem`, external drag, Dock action, mode switcher, or context-menu behavior. `onDockItemClick` remains the host's first-priority interception point in either mode.

### fullScreen semantics

`sidebar.fullScreen: true` means "this tab is a page":

- Desktop: the sidebar panel is hidden while this tab is active.
- Mobile: selecting the tab **does not** open the sidebar overlay; it only switches the active tab.

Implementation reference:

- `packages/core/src/components/layout/Shell.tsx`

This means the app should render fullScreen pages in the main content area, based on:

- `useLayout().sidebarActiveTab()` (`packages/core/src/context/LayoutContext.tsx`)

Recommended: use `ActivityAppsMain` to render main-view tabs with keep-alive semantics (pages stay mounted after first activation):

```tsx
import type { FloeComponent } from '@floegence/floe-webapp-core';
import { ActivityAppsMain } from '@floegence/floe-webapp-core/app';

const components: FloeComponent[] = [
  { id: 'home', name: 'Home', icon: HomeIcon, component: HomePage, sidebar: { fullScreen: true } },
  {
    id: 'settings',
    name: 'Settings',
    icon: SettingsIcon,
    component: SettingsPage,
    sidebar: { fullScreen: true },
  },
];

export function AppContent() {
  return <ActivityAppsMain />;
}
```

### Main view + sidebar (renderIn)

By default, non-`fullScreen` tabs render their component inside Shell's sidebar panel.

If you want a tab to render in the **main content area** while keeping the sidebar available, set:

- `sidebar.renderIn: 'main'`

This is useful for "page + sidebar panel" layouts (for example, a chat page with a thread list in the sidebar).

When a product shell needs the main page and the shell-owned sidebar to switch together without a width animation, prefer the shared one-shot Shell capability instead of page-level CSS hacks:

- `layout.setSidebarActiveTab(id, { openSidebar, visibilityMotion: 'instant' })`
- `Shell.resolveSidebarVisibilityMotion(...)`

This capability is for system-owned page boundary changes. Explicit user disclosure toggles on the active sidebar tab should usually stay animated.

### Keep-alive behavior (recommended)

Floe provides keep-alive utilities so switching activity tabs can preserve UI state and avoid remount thrash.

Notes:

- Desktop sidebar panels are kept mounted after first activation by default (Shell uses `KeepAliveStack`).
- FullScreen pages should be rendered via `ActivityAppsMain` (also keep-alive).
- For UI-first Activity navigation, set `Shell activitySelectionMode="ui-first"`
  and `ActivityAppsMain activationMode="after-paint"`. Selection feedback paints
  before the committed page changes; focus and other activation effects follow.
- `useViewActivation().visible()` follows committed visibility immediately and
  includes ancestor view visibility. Renderers use it to present retained content
  in the same update as its container. `active()` and `activationSeq()` retain
  their existing activation timing. Custom providers can omit `visible`; their
  `active` accessor then supplies visibility.
- `renderFallback={(id) => <PageLoading id={id} />}` adds a separate Suspense
  boundary for each retained view. The host owns localized, target-local loading
  copy. Navigation remains available; resolving a hidden lazy view never selects
  it. Without this prop, existing ancestor Suspense boundaries remain in control.
- Hidden views remain `display: none`, inert, and excluded from accessibility.
  File grids, lists, and breadcrumbs retain their last rendered measurements;
  hidden zero-sized boxes do not reset column counts or virtual scroll ranges.
  Real resize observations apply when the view returns. This does not keep every
  hidden page in layout or eagerly mount unvisited features.
- The `content_presented` selection event marks a scheduled paint opportunity,
  not asynchronous feature readiness. Validate lazy content and renderer pixels
  separately; do not interpret that event as proof a module or data has loaded.
- If you want the activity tab selection to drive your own main views (for non-fullScreen tabs), use `KeepAliveStack`
  keyed by `useLayout().sidebarActiveTab()`.

The interactive navigation demo is available at `/navigation.html` after
`pnpm dev`. It exercises a large Files grid/list, a retained canvas and draft,
and a lazy Reports page. `pnpm test:activity-navigation` verifies real browser
scroll retention, opaque canvas presentation, deferred loading, superseded
selection, keyboard navigation, and warm intent/content timing.

```tsx
import { useLayout } from '@floegence/floe-webapp-core';
import { KeepAliveStack, type KeepAliveView } from '@floegence/floe-webapp-core/layout';

const views: KeepAliveView[] = [
  { id: 'files', render: () => <FilesPage /> },
  { id: 'search', render: () => <SearchPage /> },
  { id: 'showcase', render: () => <ShowcasePage /> },
];

export function AppMain() {
  const layout = useLayout();
  return <KeepAliveStack views={views} activeId={layout.sidebarActiveTab()} />;
}
```

## Commands

Commands are contributed through `FloeComponent.commands`.

Type reference:

- `packages/core/src/context/ComponentRegistry.tsx`
- `packages/core/src/context/CommandContext.tsx`

```ts
commands: [
  {
    id: 'settings.open',
    title: 'Open Settings',
    category: 'Navigation',
    keybind: 'mod+,',
    execute: (ctx) => ctx.layout.setSidebarActiveTab('settings'),
  },
];
```

Notes:

- `execute(ctx)` receives a `ComponentContext` with `layout/theme/commands/notifications/storage/logger` and an optional `protocol`.
- Command execution is intentionally non-blocking (palette UI closes first): `packages/core/src/context/CommandContext.tsx`.
- Commands that must remain reachable during typing can add `allowWhileTyping: true` next to their `keybind`.

### Declarative command lifecycle (without registry)

For app-level command groups that are not tied to a `FloeComponent`, use:

```ts
import { useCommandContributions, type Command } from '@floegence/floe-webapp-core';

const commands: Command[] = [
  {
    id: 'portal.openPalette',
    title: 'Open Command Palette',
    keybind: 'mod+k',
    execute: () => {
      // ...
    },
  },
];

export function usePortalCommands() {
  useCommandContributions(commands);
}
```

`useCommandContributions()` registers commands on mount and automatically unregisters them on cleanup.

## Status Bar

Status bar items are contributed through `FloeComponent.statusBar`.

Shell renders them in:

- `packages/core/src/components/layout/BottomBar.tsx`
- `packages/core/src/components/layout/Shell.tsx`

## Per-component Storage & Logger

`ComponentContext.storage` provides per-component persisted storage:

- prefix: `component:<componentId>:` (implementation: `packages/core/src/context/ComponentRegistry.tsx`)
- backed by `FloeConfig.storage` (implementation: `packages/core/src/context/FloeConfigContext.tsx`)

`ComponentContext.logger` is a lightweight wrapper over `console.*` with a component prefix.

### Workbench composition surfaces

Sticky notes support `material: 'tint' | 'tab' | 'ruled'` independently of their color. Missing material in older layouts resolves to `tint`. Hosts must persist the material with the note and include it when comparing or synchronizing layouts. Notes remain editable in composition mode; business widgets retain their mode-specific input lock.

Background region names are optional. Empty names round-trip as empty strings, render no label, and can be restored through the selected region's Add name action. Regions support a transparent `frame` material as well as solid color fields, hatch, and the existing dotted, grid, and wash materials. Moving a region changes its boundary without moving its contents.

Clicking canvas text uses native caret placement and selection. A changed text editing session commits once on blur or Ctrl/Cmd+Enter; region names also commit on Enter. Escape restores the original value, and composition keystrokes do not commit or cancel. Hosts receive no text patch for a no-op or cancelled session. Sticky rich text remains supported. `WorkbenchSurface.compositionMessages` accepts translated composition labels, with `WorkbenchCompositionMessages` describing the complete catalog.

Selected-object tools use `SurfaceAnchoredLayer`, which builds on `SurfaceFloatingLayer` to retain the owning surface, avoid clipping, follow transforms, and keep controls at screen size. Measurement is event-driven and mounted only for selected objects; there is no idle polling. Plain wheel routing remains governed by the existing selected-widget contract. Space+drag and middle-button drag explicitly pan the canvas without changing region geometry.

Compound input focus markers do not opt a surface into the inset palette. The soft material recolors only explicit `data-floe-surface="inset"` fields; canvas notes, text, and region labels preserve their own fill or transparent background. Composition browser coverage exercises both standard and soft materials in world and projected layouts.

### Code block copy feedback

The public `CodeBlock` from `@floegence/floe-webapp-core/chat` accepts optional
`copyLabel`, `copiedLabel`, and `copyErrorLabel` strings. Hosts provide localized
copy for code or output. Clipboard success and failure use the button accessible
name and a polite status announcement; changing content clears stale feedback.
Code is copied literally, including whitespace. The component owns highlighting
and copying; host surfaces own placement, disclosure, and content limits.

### Workbench widget header contributions

A widget body may render one `WorkbenchWidgetHeader` from `@floegence/floe-webapp-core/workbench`, with `actions` and optional `titleTooltip`. The contribution renders its actions once between the title and the trailing window controls; themes with leading window controls place actions at the trailing edge. The widget owns layout, title truncation, and input isolation. Header actions do not increase the header height and must fit its existing compact chrome.

Actions keep the body owner and its providers. Reactive updates and stacking changes do not remount the body. Removing the contribution clears the actions and restores the ordinary title tooltip. Pointer input in the action region does not start widget dragging or emit body activation; native controls retain keyboard focus and click behavior. The existing selected-widget wheel contract still applies. Hosts own action availability, responsive presentation, and document state.

## Inline chat media

`MarkdownMedia` from `@floegence/floe-webapp-core/chat` renders images, video,
audio, and self-contained interactive HTML. Hosts provide localized
`MarkdownMediaLabels` and may supply a `resolve(source, signal)` callback for
local files or opaque references. The callback owns authorization and returns a
media URL or a bounded `loadHTML` function. Release host-created object URLs when
the signal aborts. Images open a draggable, resizable `FloatingWindow`; optional
`ResolvedMarkdownMedia.preview` and `reveal` actions supply a localized label and
`onSelect` callback to reuse the host's preview and containing-folder navigation.
The image and eye button share the same preview action. Show the folder action
only for a real host-resolved file; a blob URL never implies a folder. The optional
`previewImage` label distinguishes image preview from HTML expansion. Remote image/video/audio URLs use HTTP(S), with no credentials
in the URL; HTML always requires inline source or an explicit host loader.

`markdownMediaPlaceholder` and `readMarkdownMediaPlaceholder` from the pure
`@floegence/floe-webapp-core/chat-media` subpath carry an inert,
escaped display request through a controlled Markdown renderer. Mount the
component only into placeholders emitted by that renderer; raw HTML must remain
escaped. `markdownMediaKind` classifies common media filename extensions. These
helpers do not authorize resources, infer local filesystem access, or parse host
API routes.

Media appears directly in the conversation, without an enclosing border or
title bar. Quiet captions sit below the content; source/enlarge actions appear
on hover, keyboard focus, or touch devices. The component preserves native playback controls, supports image enlargement in the
shared surface-aware dialog, expands HTML without replacing its iframe, and
exposes loading, failure, and retry states. Retain the same mounted component for
an unchanged Markdown segment during streaming. Images never autoplay; video and
audio preload metadata and start only on user interaction.

HTML is limited to one million characters and rendered with `sandbox="allow-scripts"`
without same-origin permission. Its leading CSP blocks network requests, nested
frames, forms, external scripts, and assets. Inline styles/scripts and embedded
data images remain usable. A host must also bound bytes before decoding fetched
HTML. Preview output is never inserted into the application's DOM.

Validation: `node scripts/check-chat-media-browser.mjs` covers interactive HTML,
shell/network isolation, stable iframe expansion, media playback and seeking,
image dialog dismissal, and narrow layout.

## Recovery after a deployment or interrupted module load

`ActivityAppsMain` and `KeepAliveStack` accept `renderError(error, reset, id)`.
This installs a per-view error boundary outside Suspense: rejected lazy imports
replace the loading placeholder, while navigation, sibling DOM, and unsaved
sibling input remain available. The host supplies localized error presentation.
`reset` can remount a failed render, but does not invalidate Solid or browser
module caches; a rejected dynamic import should offer a document reload.

`createDocumentAssetRecovery` from `@floegence/floe-webapp-core/app` captures the
loaded document's ESM entry URLs and compares them with fresh HTML from a stable
host-provided entry URL. Call `check()` when a secure connection becomes ready.
Supply an authenticated `fetch` adapter when required. Checks are bounded,
coalesced, abort on disposal, reject redirects, and never poll or navigate.
Only valid HTML with module entries can establish a changed build. Unavailable
or unauthorized HTML leaves connection recovery to the host.

The controller exposes `reason()` (`updated`, `load-failed`, or null) and
`checking()`. Vite's `vite:preloadError` event reports failed imports without
suppressing their rejection, so the view boundary can settle into its error UI.
A current-entry check does not clear a previous import failure: reusing the same
lazy component cannot guarantee a new fetch. The host owns the explicit reload
action, draft/save guidance, embedding-aware navigation, and notification copy.
Never reload automatically over unsaved work. Serve entry HTML without storage
and immutable assets under content-hashed names; entry URLs must change when the
application's module graph changes.

`node scripts/check-asset-recovery-browser.mjs` serves two real production builds
in one browser session and verifies stale chunk 404s, interrupted downloads,
error isolation, unchanged-version checks, retained drafts, and explicit reload.
