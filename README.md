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
- **Demo Playground**: Component showcase + Monaco source viewer

## Live Demo

https://webapp-demo.floegence.io

## Quick Start

### Create a new project

```bash
# Interactive mode
npx @floegence/floe-webapp-init

# Or specify project name directly
npx @floegence/floe-webapp-init my-app

# Use the full template with sample pages
npx @floegence/floe-webapp-init my-app --template full
```

### Development (this repo)

```bash
# Install dependencies
pnpm install

# Start dev (builds core/protocol first, then starts watchers + demo)
pnpm dev

# Run local CI (lint + typecheck + test + build + verify)
make check
```

## Deploy Demo (Cloudflare Pages)

- Recommended: Cloudflare Pages + Git integration (no Wrangler, no API token)
- Create: Workers & Pages → Create application → Pages → Connect to Git → select this repo
- Production branch: `main`
- Build command: `pnpm build:demo`
- Build output directory: `apps/demo/dist` (no leading slash)
- Root directory (advanced): leave empty (repo root). Do not point to `apps/demo/dist` (it's a build output) or `apps/demo` (this is a pnpm workspace/monorepo).
- Deploy command: leave empty (Git integration deploys automatically). If your UI asks for a deploy command, you're configuring a Workers project or Direct Upload.
- Custom domain (optional): `webapp-demo.floegence.io`
- Note: `wrangler.toml` is only for Wrangler Direct Upload (manual `wrangler pages deploy`), not for Git integration.

## Docs

- `docs/README.md`
- `docs/getting-started.md`
- `docs/configuration.md`
- `docs/component-registry.md`
- `docs/protocol.md`

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
│   ├── protocol/          # Flowersec protocol integration
│   │   ├── client.ts      # Protocol context provider
│   │   ├── rpc.ts         # RPC wrapper
│   │   └── types/         # Type definitions
│   │
│   └── init/              # CLI scaffolding tool
│       ├── src/           # CLI entry point
│       └── templates/     # Project templates (minimal, full)
│
└── apps/
    └── demo/              # Demo application
```

## Packages

### @floegence/floe-webapp-core

Core UI framework with:

- **Layout Components**: Shell, ActivityBar, Sidebar, TopBar, BottomBar, MobileTabBar
- **UI Components**: Button, Input, Dialog, Dropdown, Tooltip, CommandPalette
- **Loading Components**: SnakeLoader, LoadingOverlay, Skeleton
- **Context Providers**: Theme, Layout, Command, Notification, ComponentRegistry
- **Hooks**: useMediaQuery, useDebounce, useResizeObserver, useKeybind, usePersisted
- **Utilities**: cn (class names), persist (localStorage), keybind (keyboard shortcuts), animations

### @floegence/floe-webapp-protocol

Protocol layer for communication:

- Flowersec WebSocket integration
- RPC wrapper for type-safe calls
- Connection state management

### @floegence/floe-webapp-init

CLI scaffolding tool for creating new Floe Webapp projects:

```bash
npx @floegence/floe-webapp-init [project-name] [options]
```

**Options:**

- `--template <name>` - Use a specific template (`minimal` or `full`)
- `--help` - Show help message

**Templates:**

- `minimal` (default) - Basic setup with FloeApp and a single page
- `full` - Full setup with multiple pages, settings, and theme toggle

## Usage

Create a CSS entry (e.g. `src/index.css`):

```css
@import 'tailwindcss';
@source './**/*.{ts,tsx,html}';
@import '@floegence/floe-webapp-core/tailwind';
```

```tsx
import {
  FloeApp,
  type FloeComponent,
} from '@floegence/floe-webapp-core';
import './index.css';
import { ProtocolProvider, useProtocol } from '@floegence/floe-webapp-protocol';

const components: FloeComponent<ReturnType<typeof useProtocol>>[] = [
  // Register your Floe components here (sidebar + commands + status bar).
];

export function App() {
  return (
    <FloeApp
      wrapAfterTheme={(renderChildren) => <ProtocolProvider>{renderChildren()}</ProtocolProvider>}
      getProtocol={useProtocol}
      components={components}
    >
      {/* Your main content fallback */}
      <div />
    </FloeApp>
  );
}
```

Notes:

- Recommended: run Tailwind v4 in your app and import `@floegence/floe-webapp-core/tailwind` from your CSS entry.
- Fallback (no Tailwind build): import `@floegence/floe-webapp-core/styles` once at your app entry, and do not rely on arbitrary Tailwind utility classes in your own components.

## Tech Stack

- **Framework**: Solid.js 1.8+
- **Styling**: TailwindCSS 4+
- **Build**: Vite 5+
- **Package Manager**: pnpm

## License

MIT
