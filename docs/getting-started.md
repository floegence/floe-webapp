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

### Demo tour

The demo is intentionally “batteries-included” so downstream apps can copy patterns quickly:

- **Showcase tab**: interactive examples for all core UI components (Button/Input/Dropdown/Dialog/Tooltip/CommandPalette, layout primitives, and loading states).
- **Files tab**: Monaco-powered file viewer for real workspace sources (core components, protocol client, docs).
- **Search tab**: simple workspace search that can jump into the file viewer.
- **Settings tab**: protocol connect/disconnect + shell theme + chart theme presets.

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
  return <NotesOverlay open controller={controller} onClose={() => setNotesOpen(false)} />;
}
```

Notes on the contract:

- The controller owns runtime authority. Floe owns rendering, gesture handling, and shared visual language.
- `deleteTrashedNotePermanently` is optional; implement it when you want the shared trash flyout to expose a `Delete now` action in addition to timed retention.
- Keep your snapshot shape aligned with the exported canonical notes types so multiple products can share the same card DSL (`style_version`, `color_token`, `size_bucket`) and projection helpers.
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
