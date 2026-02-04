# Component Registry & Contributions

Floe uses a registry-based contribution model (sidebar tabs, commands, status bar, lifecycle).

Primary implementation:

- `packages/core/src/context/ComponentRegistry.tsx`

## Registry lifecycle

Recommended options:

- Use `FloeApp` when you want the standard Shell + overlays wiring (it mounts and cleans up the registry for you).
- Use `FloeRegistryRuntime` when you want a custom shell (Portal/EnvApp style) but still want registry lifecycle to be symmetric (register + mount + cleanup).

Notes:

- `ComponentRegistry.registerAll()` returns a disposer. Call it on cleanup to avoid registration leaks in HMR/remount flows.

Implementation references:

- `packages/core/src/app/FloeApp.tsx`
- `packages/core/src/app/FloeRegistryRuntime.tsx`

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

### fullScreen semantics

`sidebar.fullScreen: true` means "this tab is a page":

- Desktop: the sidebar panel is hidden while this tab is active.
- Mobile: selecting the tab **does not** open the sidebar overlay; it only switches the active tab.

Implementation reference:

- `packages/core/src/components/layout/Shell.tsx`

This means the app should render fullScreen pages in the main content area, based on:

- `useLayout().sidebarActiveTab()` (`packages/core/src/context/LayoutContext.tsx`)

Recommended: use `ActivityAppsMain` to render fullScreen pages with keep-alive semantics (pages stay mounted after first activation):

```tsx
import type { FloeComponent } from '@floegence/floe-webapp-core';
import { ActivityAppsMain } from '@floegence/floe-webapp-core/app';

const components: FloeComponent[] = [
  { id: 'home', name: 'Home', icon: HomeIcon, component: HomePage, sidebar: { fullScreen: true } },
  { id: 'settings', name: 'Settings', icon: SettingsIcon, component: SettingsPage, sidebar: { fullScreen: true } },
];

export function AppContent() {
  return <ActivityAppsMain />;
}
```

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
