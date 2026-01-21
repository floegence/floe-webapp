# Getting Started

## Prerequisites

- Node.js `>= 20`
- pnpm `>= 9`

## Install

```bash
pnpm install
```

## Run the demo

```bash
pnpm dev
```

`pnpm dev` will:

- Build `@floe/core` and `@floe/protocol` into `dist/`
- Start them in watch mode
- Start the demo app dev server (`apps/demo`)

The demo uses the VSCode-style Shell layout from `@floe/core`:

- Top bar (command/search)
- Activity bar (left)
- Sidebar (left, resizable/collapsible)
- Bottom bar (status)
- Mobile tab bar on small screens

## Use Floe in your own app

Install the packages:

```bash
pnpm add @floe/core @floe/protocol solid-js
```

Import Floe styles once at your app entry:

```ts
import '@floe/core/styles';
```

Then wire up the providers and the Shell:

```tsx
import {
  FloeProvider,
  Shell,
  CommandPalette,
  NotificationContainer,
  useComponentRegistry,
  useComponentContextFactory,
  type FloeComponent,
} from '@floe/core';
import { ProtocolProvider } from '@floe/protocol';
import { onMount } from 'solid-js';

function AppContent() {
  const registry = useComponentRegistry();
  const createCtx = useComponentContextFactory();

  const components: FloeComponent[] = [
    // Register your sidebar/commands/status contributions here.
  ];

  onMount(() => {
    registry.registerAll(components);
    void registry.mountAll((id) => createCtx(id));
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
    <FloeProvider wrapAfterTheme={(children) => <ProtocolProvider>{children}</ProtocolProvider>}>
      <AppContent />
    </FloeProvider>
  );
}
```

Notes:

- `Shell` can be driven by `ComponentRegistry` (sidebar + status bar) without passing `activityItems`/`sidebarContent`.
- `@floe/protocol` is optional. Keep it outside `@floe/core` and inject it into component context when you need it.

### Example: a minimal sidebar component

```tsx
import { Files, type FloeComponent } from '@floe/core';

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
