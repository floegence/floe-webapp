# Floe Webapp

A professional VSCode-style web application framework built with Solid.js.

## Features

- **VSCode Layout**: Activity bar, sidebar, top bar, bottom bar, and resizable panels
- **Mobile First**: Responsive design with mobile tab bar for small screens
- **Theme System**: Light and dark themes with CSS variables
- **Command Palette**: Global command search with keyboard shortcuts
- **Plugin Registry**: Register components to drive navigation and status bar
- **Protocol Layer**: Flowersec WebSocket integration for secure communication
- **Non-blocking UI**: Smooth animations and async operations

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run local CI (lint + typecheck + test + build)
make check
```

## Docs

- `docs/getting-started.md`

## Demo protocol config (optional)

The demo can connect to a Flowersec tunnel if you provide a controlplane URL and endpoint id:

```bash
cp apps/demo/.env.example apps/demo/.env.local
```

Then edit `apps/demo/.env.local`:

```env
VITE_FLOE_CONTROLPLANE_BASE_URL=...
VITE_FLOE_ENDPOINT_ID=...
```

## Project Structure

```
floe-webapp/
├── packages/
│   ├── core/              # Core UI components and utilities
│   │   ├── components/    # Layout, UI, and loading components
│   │   ├── context/       # Theme, Layout, Command, Notification providers
│   │   ├── hooks/         # Reactive hooks
│   │   ├── styles/        # Global CSS and themes
│   │   └── utils/         # Utility functions
│   │
│   └── protocol/          # Flowersec protocol integration
│       ├── client.ts      # Protocol context provider
│       ├── rpc.ts         # RPC wrapper
│       └── types/         # Type definitions
│
└── apps/
    └── demo/              # Demo application
```

## Packages

### @floe/core

Core UI framework with:

- **Layout Components**: Shell, ActivityBar, Sidebar, TopBar, BottomBar, MobileTabBar
- **UI Components**: Button, Input, Dialog, Dropdown, Tooltip, CommandPalette
- **Loading Components**: SnakeLoader, LoadingOverlay, Skeleton
- **Context Providers**: Theme, Layout, Command, Notification, ComponentRegistry
- **Hooks**: useMediaQuery, useDebounce, useResizeObserver, useKeybind, usePersisted
- **Utilities**: cn (class names), persist (localStorage), keybind (keyboard shortcuts), animations

### @floe/protocol

Protocol layer for communication:

- Flowersec WebSocket integration
- RPC wrapper for type-safe calls
- Connection state management

## Usage

```tsx
import {
  FloeProvider,
  useComponentRegistry,
  useComponentContextFactory,
  Shell,
  CommandPalette,
  NotificationContainer,
} from '@floe/core';
import '@floe/core/styles';
import { ProtocolProvider } from '@floe/protocol';
import { onMount } from 'solid-js';

function AppContent() {
  const registry = useComponentRegistry();
  const createCtx = useComponentContextFactory();

  onMount(() => {
    registry.registerAll([
      // Register your Floe components here (sidebar + commands + status bar).
    ]);
    void registry.mountAll((id) => createCtx(id));
  });

  return (
    <>
      {/* When `activityItems`/`sidebarContent` are not provided, Shell can be driven by ComponentRegistry. */}
      <Shell>{/* Main content fallback */}</Shell>
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

## Tech Stack

- **Framework**: Solid.js 1.8+
- **Styling**: TailwindCSS 4+
- **Build**: Vite 5+
- **Package Manager**: pnpm

## License

MIT
