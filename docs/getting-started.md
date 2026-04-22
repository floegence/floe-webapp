# Getting Started

## Prerequisites

- Node.js `>= 20`
- pnpm `>= 9`

## Skill First (required)

Load the Floe skill before coding:

- `skills/floe-webapp/SKILL.md`
- `skills/floe-webapp/references/playbooks.md`

If your agent runtime supports repo-local skills, point it to `./skills/floe-webapp`.
If your runtime uses a global skills directory, copy `skills/floe-webapp` there first.

## Create a new project (recommended)

The fastest way to get started is using the CLI scaffolding tool:

```bash
# Interactive mode - prompts for project name and template
npx @floegence/floe-webapp-init

# Or specify project name directly
npx @floegence/floe-webapp-init my-app

# Use the full template with sample pages
npx @floegence/floe-webapp-init my-app --template full
```

**Available templates:**

- `minimal` (default) - Basic setup with FloeApp and a single page
- `full` - Full setup with multiple pages, settings page, and theme toggle

After scaffolding:

```bash
cd my-app
pnpm install
pnpm dev
```

Each scaffolded project includes `./skills/floe-webapp` at project root.

## Development (this repo)

### Install

```bash
pnpm install
```

## Run the demo

```bash
pnpm dev
```

`pnpm dev` will start the demo dev server in workspace mode:

- The demo imports `packages/*` sources directly (fast startup + proper HMR, no dist rebuild loops)
- Dist rebuilds (e.g. `make check`) won't spam HMR

To expose the dev server to other devices on your LAN, pass the Vite host and port through the root script:

```bash
pnpm dev -- --host 0.0.0.0 --port 5173
```

If you want to emulate downstream consumption (demo imports packages via `dist/` outputs), run:

```bash
pnpm dev:dist
```

The same passthrough works in dist mode:

```bash
pnpm dev:dist -- --host 0.0.0.0 --port 5173
```

The demo uses the VSCode-style Shell layout from `@floegence/floe-webapp-core`:

- Top bar (command/search)
- Activity bar (left)
- Sidebar (left, resizable/collapsible)
- Bottom bar (status)
- Mobile tab bar on small screens
- Shared page-mode primitives for `Activity / Deck / Workbench`

### Demo tour

The demo is intentionally “batteries-included” so downstream apps can copy patterns quickly:

- **Showcase tab**: interactive examples for all core UI components (Button/Input/Dropdown/Dialog/Tooltip/CommandPalette, layout primitives, and loading states).
- **Files tab**: Monaco-powered file viewer for real workspace sources (core components, protocol client, docs).
- **Search tab**: simple workspace search that can jump into the file viewer.
- **Settings tab**: protocol connect/disconnect + shell theme + chart theme presets.
- **Deck / Workbench**: page-mode surfaces that reuse the shared top bar and switcher contract from `@floegence/floe-webapp-core/layout`.

Tips:

- Press <kbd>Mod</kbd>+<kbd>K</kbd> to open the Command Palette and search for `Demo:` commands.
- Use the Showcase sidebar to jump between sections.
- Use “View Source” buttons in Showcase to open the source file in the Monaco viewer.
- `CodeEditor` keeps editable syntax coloring for HTML and CSS-family files by loading Monaco's basic tokenizers together with the rich language-service contributions.

## Use Floe in your own app

Before implementation, import this repo skill package first:

- `skills/floe-webapp/SKILL.md`
- `skills/floe-webapp/references/playbooks.md`

Install the packages:

```bash
pnpm add @floegence/floe-webapp-core @floegence/floe-webapp-protocol solid-js
```

Shared `FileBrowser` menus now emit semantic context (`item` vs `directory-background`) and support nested `children` actions, so downstream apps can add product menus such as `New` without inventing placeholder `FileItem` values or reimplementing submenu rendering.

When a downstream mutation needs to focus a newly created item, prefer the controlled `revealRequest` API on `FileBrowser` / `FileBrowserProvider`; it keeps filter clearing, scrolling, and single-selection behavior inside the shared file-browser implementation instead of pushing DOM-specific reveal code into the product layer.

### Shared Notes overlay

Floe also ships a controller-driven Notes overlay from the dedicated `@floegence/floe-webapp-core/notes` subpath.

Use this when you want the shared infinite-board UI, card styling, trash/minimap behavior, and mobile affordances, while keeping your own product runtime in charge of persistence and live updates.

```tsx
import { NotesOverlay, type NotesController } from '@floegence/floe-webapp-core/notes';

const controller: NotesController = {
  snapshot: () => snapshot(),
  activeTopicID: () => activeTopicID(),
  setActiveTopicID: (topicID) => setActiveTopicID(topicID),
  viewport: () => viewport(),
  setViewport: (nextViewport) => setViewport(nextViewport),
  loading: () => false,
  connectionState: () => 'live',
  createTopic: async (input) => createTopic(input),
  updateTopic: async (topicID, input) => updateTopic(topicID, input),
  deleteTopic: async (topicID) => deleteTopic(topicID),
  createNote: async (input) => createNote(input),
  updateNote: async (noteID, input) => updateNote(noteID, input),
  bringNoteToFront: async (noteID) => bringNoteToFront(noteID),
  deleteNote: async (noteID) => deleteNote(noteID),
  restoreNote: async (noteID) => restoreNote(noteID),
  deleteTrashedNotePermanently: async (noteID) => deleteTrashedNotePermanently(noteID),
  clearTrashTopic: async (topicID) => clearTrashTopic(topicID),
};

export function ProductNotes() {
  return (
    <NotesOverlay
      open
      controller={controller}
      onClose={() => setNotesOpen(false)}
      interactionMode="floating"
      allowGlobalHotkeys={['mod+.']}
    />
  );
}
```

Notes on the contract:

- The controller owns runtime authority. Floe owns rendering, gesture handling, and shared visual language.
- `interactionMode` defaults to `modal`, which keeps focus trapping, body scroll lock, and global Escape-close semantics for modal surfaces such as demos and settings flows.
- Use `interactionMode="floating"` when Notes should stay above an already-active workspace without stealing the current focus; this keeps the shared Notes UI while switching the overlay shell to non-modal floating semantics.
- Floating Notes keeps the global command-palette keybind available automatically, and `allowGlobalHotkeys` lets product shells preserve their own Notes toggle shortcut without reopening the rest of the global hotkey surface.
- Floating Notes now dismiss on outside click and on `Escape` pressed outside the Notes surface; nested Notes-owned portals such as trash, editor, manual paste, and context menus still count as inside the same logical surface.
- Active-topic live notes render continuous numeric badges in creation order. The numbering is a shared projection, so deleting or moving a middle note causes the remaining live notes in that topic to renumber to a continuous `1..n` sequence automatically.
- Digit-to-copy is a shared overlay-wide affordance: whenever Notes is open, pressing a note number copies that note body, flashes the copied state, and shows a toast. Exact prefix matches such as `1` vs `12` stay pending briefly so multi-digit note numbers remain usable.
- Digit shortcuts are intentionally disabled while the user is typing or while editor/manual-paste/context-menu/trash surfaces are open. Title-only notes keep click-to-edit behavior, while digit-copy shows an informational toast instead of unexpectedly opening the editor.
- Canvas pan/zoom, minimap navigation, and note drag keep preview state local inside the shared surface and only commit through `setViewport()` / `updateNote()` at the end of the gesture. Downstream controllers should stay authoritative, but they do not need per-frame drag state.
- `deleteTrashedNotePermanently` is optional; implement it when you want the shared trash flyout to expose a `Delete now` action in addition to timed retention.
- Keep your snapshot shape aligned with the exported canonical notes types so multiple products can share the same card DSL (`style_version`, `color_token`, `size_bucket`) and projection helpers.
- The shared minimap intentionally reserves extra navigation runway around sparse boards, so products should not clamp the notes viewport externally unless they are also replacing the overview semantics.
- Import `@floegence/floe-webapp-core/tailwind` or `@floegence/floe-webapp-core/styles` so the Notes surface CSS is present in your app bundle.

### Styling (Tailwind v4)

Recommended: run Tailwind v4 in your app and import the Floe Tailwind entry from your CSS entry file.

1. Install Tailwind v4 + the Vite plugin:

```bash
pnpm add -D tailwindcss @tailwindcss/vite
```

2. Enable the plugin in `vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [solid(), tailwindcss()],
});
```

3. In your CSS entry (e.g. `src/index.css`):

```css
@import 'tailwindcss';
@source './**/*.{ts,tsx,html}';
@import '@floegence/floe-webapp-core/tailwind';
```

Notes:

- In this mode, do not also import `@floegence/floe-webapp-core/styles` (it would duplicate Tailwind output).

#### Fallback: no Tailwind build

If you don't want to run Tailwind in your app, import the precompiled stylesheet once at your app entry:

```ts
import '@floegence/floe-webapp-core/styles';
```

### Recommended: `FloeApp` (all-in-one)

`FloeApp` wires up:

- `FloeProvider`
- `ComponentRegistry` registration + mount/unmount lifecycle
- `<Shell />` + `<CommandPalette />` + `<NotificationContainer />`

```tsx
import type { FloeComponent } from '@floegence/floe-webapp-core';
import { ActivityAppsMain, FloeApp } from '@floegence/floe-webapp-core/app';

const components: FloeComponent[] = [
  // Register your sidebar/commands/status contributions here.
  // For page-style tabs, set: sidebar: { fullScreen: true }
];

export function App() {
  return (
    <FloeApp components={components}>
      <ActivityAppsMain />
    </FloeApp>
  );
}
```

Notes:

- `ActivityAppsMain` renders fullScreen pages based on `useLayout().sidebarActiveTab()` and keeps visited pages mounted.
- For heavy pages, use `useViewActivation()` to detect active/inactive and pause expensive rendering while the view is hidden.

### Optional: inject protocol into `ComponentContext.protocol`

If you want `commands.execute(ctx)` / `onMount(ctx)` to receive your protocol object, use:

- `wrapAfterTheme` to place `ProtocolProvider` outside core
- `getProtocol` to inject `useProtocol()` result into `ctx.protocol`

```tsx
import type { FloeComponent } from '@floegence/floe-webapp-core';
import { FloeApp } from '@floegence/floe-webapp-core/app';
import {
  ProtocolProvider,
  useProtocol,
  type ProtocolContract,
} from '@floegence/floe-webapp-protocol';

const appContract: ProtocolContract = {
  id: 'app_v1',
  createRpc: () => ({}),
};

const components: FloeComponent<ReturnType<typeof useProtocol>>[] = [
  // Your Floe components.
];

export function App() {
  return (
    <FloeApp
      wrapAfterTheme={(renderChildren) => (
        <ProtocolProvider contract={appContract}>{renderChildren()}</ProtocolProvider>
      )}
      getProtocol={useProtocol}
      components={components}
    >
      <div>Your main content</div>
    </FloeApp>
  );
}
```

### Optional: customize `FloeConfig`

Use `config` to override defaults (storage namespace, keybinds, strings, layout defaults, etc):

```tsx
import { FloeApp } from '@floegence/floe-webapp-core/app';

export function App() {
  return (
    <FloeApp
      config={{
        storage: { namespace: 'myapp' },
        commands: {
          palette: { keybind: 'mod+p' },
          save: { enabled: false },
        },
        strings: {
          commandPalette: { placeholder: 'Search...', empty: 'No results', esc: 'Esc' },
        },
      }}
    >
      <div>Your main content</div>
    </FloeApp>
  );
}
```

Notes:

- By default, global hotkeys are ignored while typing in form fields/contenteditable (except save).
- To allow global hotkeys inside an editor, add `data-floe-hotkeys="allow"` on an ancestor element.
- Individual registered commands may opt into `allowWhileTyping` when a specific global overlay shortcut should remain available even during typing.

### Optional: customize shell chrome without global CSS hacks

Prefer `theme.tokens` for border colors and `slotClassNames` for local shell container classes:

```tsx
import { Shell } from '@floegence/floe-webapp-core/layout';

<Shell
  slotClassNames={{
    topBar: 'backdrop-blur-md',
    bottomBar: 'text-[11px]',
  }}
/>;
```

```tsx
config={{
  theme: {
    defaultPreset: 'default',
    presets: [
      { name: 'default', displayName: 'Default' },
      {
        name: 'nord',
        displayName: 'Nord',
        tokens: {
          dark: {
            '--chart-1': 'oklch(0.88 0.06 235)',
            '--chart-2': 'oklch(0.76 0.12 210)',
          },
        },
      },
    ],
    tokens: {
      dark: {
        '--chrome-border': 'hsl(220 16% 24%)',
      },
    },
  },
}}
```

If you need scoped CSS, target the stable shell anchors instead of framework implementation classes:

```css
[data-floe-shell-slot='top-bar'] {
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--top-bar-border) 100%, transparent);
}
```

Avoid broad resets such as `* { border-width: 0; }`, which can remove the default shell dividers entirely.

Named theme presets are a good fit for chart palettes and brand accents because they can switch token groups without forcing the whole app between light and dark mode.

If you are building a token viewer or docs surface, import the public token contract from `@floegence/floe-webapp-core` (`floeDesignTokens`, `floeColorTokenCategories`, `floeThemeColorVariables`, `floeSharedCssVariables`) instead of duplicating theme values in your app.

### Optional: use page-mode shells for deck/workbench-style views

Use the shared `layout` exports when you want a surface to own the full viewport while still keeping the same top-bar contract:

```tsx
import { DisplayModePageShell, DisplayModeSwitcher } from '@floegence/floe-webapp-core/layout';

<DisplayModePageShell
  logo={<Logo />}
  actions={<DisplayModeSwitcher mode={mode()} onChange={setMode} />}
>
  <WorkbenchSurface state={state} setState={setState} widgetDefinitions={widgetDefinitions} />
</DisplayModePageShell>;
```

Use the shared `workbench` exports when the host app needs custom widgets but should still inherit the same canvas, dock, HUD, widget chrome, and context menu behavior:

```tsx
import type {
  WorkbenchSurfaceApi,
  WorkbenchWidgetDefinition,
} from '@floegence/floe-webapp-core/workbench';

const widgetDefinitions: readonly WorkbenchWidgetDefinition[] = [
  {
    type: 'ops.logs',
    label: 'Logs',
    icon: LogsIcon,
    body: LogsWidget,
    defaultTitle: 'Logs',
    defaultSize: { width: 720, height: 420 },
    singleton: true,
  },
];

let workbenchApi: WorkbenchSurfaceApi | undefined;

<WorkbenchSurface
  state={state}
  setState={setState}
  widgetDefinitions={widgetDefinitions}
  launcherWidgetTypes={['ops.logs']}
  interactionAdapter={appWorkbenchInteractionAdapter}
  onApiReady={(api) => {
    workbenchApi = api;
  }}
/>;

// Center without changing zoom for activation flows.
workbenchApi?.focusWidget(widget);

// Center and scale the widget fully into the current viewport.
workbenchApi?.fitWidget(widget);

// Center the widget while returning the canvas to its minimum scale.
workbenchApi?.overviewWidget(widget);

// Clear selection when the host surface treats a pointer event as blank-canvas intent.
workbenchApi?.clearSelection();

// Create a new widget instance at a specific world-space location.
workbenchApi?.createWidget('ops.logs', { worldX: 480, worldY: 220 });

// Resolve/update multi-instance widgets without forking the surface shell.
const logsWidget = workbenchApi?.findWidgetById('widget-logs-1');
workbenchApi?.updateWidgetTitle('widget-logs-1', 'Errors');
```

`launcherWidgetTypes` lets a product hide programmatic widget types from the dock/context-menu create affordances, while `interactionAdapter` is the thin extension point for product-specific wheel/focus/hotkey ownership without forking the shared canvas/widget/surface stack.

Custom widget bodies also receive shared host-state hints through `WorkbenchWidgetBodyProps`: `activation` for local-pointer activation pulses, `surfaceMetrics` as an accessor for projected overlays, `selected` / `filtered` for shell state, `lifecycle` (`hot` / `warm` / `cold`) for lightweight pause/resume strategies, and `requestActivate()` when a body wants to re-enter the active shell path without reaching around the surface internals.

When a widget opts into `renderMode: 'projected_surface'`, the recommended contract is:

- keep the widget body mounted by `widget.id` and let the shared shell own geometry / z-order updates;
- read `surfaceMetrics?.()` only in the few business widgets that truly need projected rect data;
- avoid rebuilding projected subtrees on every viewport tick — the shared `InfiniteCanvas` / workbench host now keeps the projected layer stably mounted and updates viewport through accessors instead.

---

## Next docs

- Configuration (FloeConfig): `docs/configuration.md`
- Component Registry & Contributions: `docs/component-registry.md`
- Protocol Layer (Flowersec): `docs/protocol.md`
- E2EE Boot Utilities & Flowersec Proxy Integration: `docs/runtime.md`

### Advanced: manual assembly (Provider + Registry + Shell)

If you want full control, you can still wire providers and the registry manually:

```tsx
import {
  FloeProvider,
  NotificationContainer,
  type FloeComponent,
} from '@floegence/floe-webapp-core';
import { FloeRegistryRuntime } from '@floegence/floe-webapp-core/app';
import { Shell } from '@floegence/floe-webapp-core/layout';
import { CommandPalette } from '@floegence/floe-webapp-core/ui';
import {
  ProtocolProvider,
  useProtocol,
  type ProtocolContract,
} from '@floegence/floe-webapp-protocol';

const appContract: ProtocolContract = {
  id: 'app_v1',
  createRpc: () => ({}),
};

const components: FloeComponent<ReturnType<typeof useProtocol>>[] = [
  // Register your sidebar/commands/status contributions here.
];

function AppContent() {
  return (
    <>
      <Shell>{/* Your main content fallback */}</Shell>
      <CommandPalette />
      <NotificationContainer />
    </>
  );
}

export function App() {
  return (
    <FloeProvider
      wrapAfterTheme={(renderChildren) => (
        <ProtocolProvider contract={appContract}>{renderChildren()}</ProtocolProvider>
      )}
    >
      <FloeRegistryRuntime components={components} getProtocol={useProtocol}>
        <AppContent />
      </FloeRegistryRuntime>
    </FloeProvider>
  );
}
```

Notes:

- `Shell` can be driven by `ComponentRegistry` (sidebar + status bar) without passing `activityItems`/`sidebarContent`.
- `@floegence/floe-webapp-protocol` is optional. Keep it outside `@floegence/floe-webapp-core` and inject it into component context when you need it.

### Example: a minimal sidebar component

```tsx
import type { FloeComponent } from '@floegence/floe-webapp-core';
import { Files } from '@floegence/floe-webapp-core/icons';

export const filesComponent: FloeComponent = {
  id: 'files',
  name: 'Files',
  icon: Files,
  description: 'Browse files',
  component: () => <div style={{ padding: '12px' }}>Files view</div>,
  sidebar: { order: 1 },
};
```

## Optional: enable protocol connection

The demo can connect to a Flowersec tunnel if you provide a controlplane URL and endpoint id.

```bash
cp apps/demo/.env.example apps/demo/.env.local
```

Then edit `apps/demo/.env.local`:

```env
VITE_FLOE_CONTROLPLANE_BASE_URL=...
VITE_FLOE_ENDPOINT_ID=...
```

## Quality checks

Run local CI (lint + typecheck + test + build + verify):

```bash
make check
```
