# Getting Started

## Prerequisites

- Node.js `>= 20`
- pnpm `>= 9`

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

## Development (this repo)

### Install

```bash
pnpm install
```

## Run the demo

```bash
pnpm dev
```

`pnpm dev` will:

- Build `@floegence/floe-webapp-core` and `@floegence/floe-webapp-protocol` into `dist/`
- Start them in watch mode
- Start the demo app dev server (`apps/demo`)

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
- **Settings tab**: protocol connect/disconnect + theme controls.

Tips:

- Press <kbd>Mod</kbd>+<kbd>K</kbd> to open the Command Palette and search for `Demo:` commands.
- Use the Showcase sidebar to jump between sections.
- Use “View Source” buttons in Showcase to open the source file in the Monaco viewer.

## Use Floe in your own app

Install the packages:

```bash
pnpm add @floegence/floe-webapp-core @floegence/floe-webapp-protocol solid-js
```

Import Floe styles once at your app entry:

```ts
import '@floegence/floe-webapp-core/styles';
```

### Recommended: `FloeApp` (all-in-one)

`FloeApp` wires up:

- `FloeProvider`
- `ComponentRegistry` registration + mount/unmount lifecycle
- `<Shell />` + `<CommandPalette />` + `<NotificationContainer />`

```tsx
import { FloeApp, type FloeComponent } from '@floegence/floe-webapp-core';

const components: FloeComponent[] = [
  // Register your sidebar/commands/status contributions here.
];

export function App() {
  return (
    <FloeApp components={components}>
      <div>Your main content</div>
    </FloeApp>
  );
}
```

### Optional: inject protocol into `ComponentContext.protocol`

If you want `commands.execute(ctx)` / `onMount(ctx)` to receive your protocol object, use:

- `wrapAfterTheme` to place `ProtocolProvider` outside core
- `getProtocol` to inject `useProtocol()` result into `ctx.protocol`

```tsx
import { FloeApp, type FloeComponent } from '@floegence/floe-webapp-core';
import { ProtocolProvider, useProtocol } from '@floegence/floe-webapp-protocol';

const components: FloeComponent<ReturnType<typeof useProtocol>>[] = [
  // Your Floe components.
];

export function App() {
  return (
    <FloeApp
      wrapAfterTheme={(renderChildren) => <ProtocolProvider>{renderChildren()}</ProtocolProvider>}
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
import { FloeApp } from '@floegence/floe-webapp-core';

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

---

## Next docs

- Configuration (FloeConfig): `docs/configuration.md`
- Component Registry & Contributions: `docs/component-registry.md`
- Protocol Layer (Flowersec): `docs/protocol.md`

### Advanced: manual assembly (Provider + Registry + Shell)

If you want full control, you can still wire providers and the registry manually:

```tsx
import {
  FloeProvider,
  Shell,
  CommandPalette,
  NotificationContainer,
  useComponentRegistry,
  useComponentContextFactory,
  type FloeComponent,
} from '@floegence/floe-webapp-core';
import { ProtocolProvider, useProtocol } from '@floegence/floe-webapp-protocol';
import { onCleanup, onMount } from 'solid-js';

function AppContent() {
  const registry = useComponentRegistry();
  const createCtx = useComponentContextFactory();
  const protocol = useProtocol();

  const components: FloeComponent[] = [
    // Register your sidebar/commands/status contributions here.
  ];

  onMount(() => {
    registry.registerAll(components);
    void registry.mountAll((id) => createCtx(id, { protocol }));
  });
  onCleanup(() => {
    void registry.unmountAll();
  });

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
    <FloeProvider wrapAfterTheme={(renderChildren) => <ProtocolProvider>{renderChildren()}</ProtocolProvider>}>
      <AppContent />
    </FloeProvider>
  );
}
```

Notes:

- `Shell` can be driven by `ComponentRegistry` (sidebar + status bar) without passing `activityItems`/`sidebarContent`.
- `@floegence/floe-webapp-protocol` is optional. Keep it outside `@floegence/floe-webapp-core` and inject it into component context when you need it.

### Example: a minimal sidebar component

```tsx
import { Files, type FloeComponent } from '@floegence/floe-webapp-core';

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
