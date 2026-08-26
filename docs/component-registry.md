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
- If you want the activity tab selection to drive your own main views (for non-fullScreen tabs), use `KeepAliveStack`
  keyed by `useLayout().sidebarActiveTab()`.

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
