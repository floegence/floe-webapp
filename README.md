# Floe Webapp

A professional VSCode-style web application framework built with Solid.js.

## Features

- **VSCode Layout**: Activity bar, sidebar, top bar, bottom bar, and resizable panels
- **Mobile First**: Responsive design with mobile tab bar for small screens
- **Theme System**: Light/dark themes with CSS variables, token overrides, and named token presets
- **Command Palette**: Global command search with keyboard shortcuts
- **Plugin Registry**: Register components to drive navigation and status bar
- **Shell Extensibility**: Stable `slotClassNames` and `data-floe-shell-slot` hooks for chrome styling
- **Accessibility Foundations**: Shell landmarks, skip link targeting, keyboard-safe tabs/menus, live-region defaults, and contrast-safe tokens
- **Protocol Layer**: Flowersec WebSocket integration for secure communication
- **Non-blocking UI**: Smooth animations and async operations
- **Demo Playground**: Component showcase + Monaco source viewer

## Live Demo

https://webapp-demo.floegence.io

## Quick Start (Skill First)

### 0. Import the Floe skill first

Always load the Floe skill before coding:

- Main skill entry: `skills/floe-webapp/SKILL.md`
- Workflow references: `skills/floe-webapp/references/playbooks.md`

If your agent runtime supports repo-local skills, point it to this folder directly.
If your runtime uses a global skills directory, copy `skills/floe-webapp/` into that directory first.

### 1. Create a new project

```bash
# Interactive mode
npx @floegence/floe-webapp-init

# Or specify project name directly
npx @floegence/floe-webapp-init my-app

# Use the full template with sample pages
npx @floegence/floe-webapp-init my-app --template full
```

The generated project includes the same `./skills/floe-webapp/` package at project root.

### 2. Development (this repo)

```bash
# Install dependencies
pnpm install

# Start dev (workspace mode: demo imports packages/* sources directly for instant HMR)
pnpm dev

# Expose the demo to your LAN
pnpm dev -- --host 0.0.0.0 --port 5173

# Optional: dist mode (demo consumes packages via dist outputs + watch rebuild)
pnpm dev:dist

# Dist mode with explicit host/port
pnpm dev:dist -- --host 0.0.0.0 --port 5173

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
- `docs/accessibility.md`
- `docs/component-registry.md`
- `docs/interaction-architecture.md`
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
├── skills/                # Root-level agent skill package (import this first)
│   └── floe-webapp/
│       ├── SKILL.md
│       └── references/
│           └── playbooks.md
│
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
│       ├── templates/     # Project templates (minimal, full)
│       └── skills/        # Skill package copied into new projects as ./skills
│
└── apps/
    └── demo/              # Demo application
```

## Packages

### @floegence/floe-webapp-core

Core UI framework with:

- **Layout Components**: Shell, ActivityBar, Sidebar, TopBar, BottomBar, MobileTabBar
- **UI Components**: Button, Input, Dialog, Dropdown, Tooltip, CommandPalette
- **File Browser Surface**: `@floegence/floe-webapp-core/file-browser` exposes the standard `FileBrowser`, low-level composition primitives, and `FileBrowserDragPreview` for custom-composed browsers that still want the shared drag-preview behavior
- **Terminal Extension Surface**: `@floegence/floe-webapp-core/terminal` exposes session models, suggestion providers, and runtime adapters; `createTerminalWidget(options)` lets apps register customized terminal widgets without forking core UI
- **Loading Components**: SnakeLoader, LoadingOverlay, Skeleton
- **Context Providers**: Theme, Layout, Command, Notification, ComponentRegistry
- **Hooks**: useMediaQuery, useDebounce, useResizeObserver, useKeybind, usePersisted
- **Utilities**: cn (class names), persist (localStorage), keybind (keyboard shortcuts), animations

### @floegence/floe-webapp-protocol

Protocol layer for communication:

- Flowersec WebSocket integration
- Contract-driven RPC SDK (`useRpc()`) via injected `ProtocolContract` (no built-in business contract)
- Connection state management with dynamic `getGrant()` / `getDirectInfo()` reconnect support

Best practice:

- Keep low-level Flowersec building blocks in `@floegence/flowersec-core` (source of truth).
- Keep Floe Webapp packages focused on UI/protocol glue (providers, contracts, typed RPC).
- For proxy runtime mode (Service Worker + HTML injection + WS patch), integrate directly via `@floegence/flowersec-core/proxy`.

### @floegence/floe-webapp-boot

Optional boot utilities for multi-window + sandbox flows:

- Hash/sessionStorage helpers (parse + clear)
- `postMessage` handshake helpers

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

Skill package behavior:

- Every scaffolded project gets `./skills/floe-webapp/` in project root.
- Use this skill package before implementing app features.

## Usage

Create a CSS entry (e.g. `src/index.css`):

```css
@import 'tailwindcss';
@source './**/*.{ts,tsx,html}';
@import '@floegence/floe-webapp-core/tailwind';
```

```tsx
import type { FloeComponent } from '@floegence/floe-webapp-core';
import { FloeApp } from '@floegence/floe-webapp-core/app';
import './index.css';
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
  // Register your Floe components here (sidebar + commands + status bar).
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
      {/* Your main content fallback */}
      <div />
    </FloeApp>
  );
}
```

Notes:

- Recommended: run Tailwind v4 in your app and import `@floegence/floe-webapp-core/tailwind` from your CSS entry.
- Fallback (no Tailwind build): import `@floegence/floe-webapp-core/styles` once at your app entry, and do not rely on arbitrary Tailwind utility classes in your own components.
- Prefer `theme.tokens` for shell chrome colors and `slotClassNames` / `data-floe-shell-slot` for local shell styling.
- Prefer `config.accessibility` to name shell landmarks and skip-link targets instead of patching shell regions downstream.
- For `Dropdown`, keep `trigger` presentational and style the interactive wrapper with `triggerClass`; use `triggerAriaLabel` when the visible trigger content is icon-only or ambiguous.
- When you need token metadata for docs, inspectors, or custom tooling, import `floeDesignTokens`, `floeColorTokenCategories`, `floeThemeColorVariables`, or `floeSharedCssVariables` from `@floegence/floe-webapp-core` instead of duplicating theme values.
- Avoid broad resets such as `* { border-width: 0; }`, which can remove the framework's default shell dividers.

## Tech Stack

- **Framework**: Solid.js 1.8+
- **Styling**: TailwindCSS 4+
- **Build**: Vite 5+
- **Package Manager**: pnpm

## License

MIT
