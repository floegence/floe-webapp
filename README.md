<p align="center">
  <img src="apps/demo/public/logo.svg" alt="Floe Webapp" width="72">
</p>

# Floe Webapp

<p align="center">
  <strong>Build workspace-style web apps with a VS Code-inspired shell, reusable UI primitives, and optional Flowersec protocol wiring.</strong>
</p>

<p align="center">
  <a href="https://webapp-demo.floegence.io">Open Live Demo</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#capabilities">Explore Capabilities</a> |
  <a href="#docs-by-task">Open Docs</a>
</p>

Floe Webapp helps teams ship multi-panel product experiences faster. Instead of rebuilding application chrome from scratch, you start from a shared shell, command palette, theme system, notifications, and extension points for your own pages, commands, and status surfaces.

This repository contains the public Solid.js packages, demo app, scaffolding CLI, and optional Flowersec integration that back those experiences.

## Why teams use Floe

- Start from a familiar app shell with a top bar, activity bar, sidebar, bottom bar, resizable panels, and mobile navigation.
- Add product-specific navigation, commands, and status items through a component registry instead of forking the shell.
- Reuse higher-level building blocks such as file browsing, launchpad flows, deck layouts, workbench canvases, display-mode page shells, chat blocks, editor surfaces, and terminal integration points.
- Keep theming, keyboard behavior, notifications, and shared accessibility patterns consistent across the whole app.
- Connect the same shell to Flowersec-backed sessions and typed RPC contracts when the product needs remote capabilities.

## Capabilities

| Surface              | What teams get                                                                                                                                                                                                                                            | Why it matters                                                                                                                                                                                                                                                                                                                       | Docs                                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `App Shell`          | `Shell`, `FloeApp`, activity bar, sidebar, top bar, bottom bar, command palette, notifications, mobile tab bar, `DisplayModeSwitcher`, `DisplayModePageShell`                                                                                             | Gives workspace-style products one shared navigation and layout model across desktop and mobile breakpoints, including page-mode surfaces such as Deck and Workbench                                                                                                                                                                 | [`docs/getting-started.md`](docs/getting-started.md), [`docs/configuration.md`](docs/configuration.md)                                                                                   |
| `UI Primitives`      | Buttons, inputs, dialogs, dropdowns, tooltips, tabs, loading states, theme tokens                                                                                                                                                                         | Keeps core interactions and visual language consistent while leaving room for product-owned features, including surface-scoped dialogs that stay inside the nearest deck/workbench/floating host when opened from local workspace widgets and mark themselves as local interaction surfaces so outer canvas gestures yield correctly | [`docs/getting-started.md`](docs/getting-started.md)                                                                                                                                     |
| `Workspace Surfaces` | File browser, launchpad, deck layout, chat UI blocks, editor surface, terminal extension helpers, widget hooks, controller-driven Notes overlay primitives with shared overlay/gesture contracts, plus directory-aware context menus with submenu support | Speeds up file-centric, operator-style, and multi-tool experiences without forcing a single product shape, including grid-native Deck drag/resize interactions that stay on one snapped layout truth and always tear down through a shared document-level pointer session fallback                                                                                                   | [`docs/component-registry.md`](docs/component-registry.md), [`docs/interaction-architecture.md`](docs/interaction-architecture.md), [`docs/getting-started.md`](docs/getting-started.md) |
| `Protocol Layer`     | `ProtocolProvider`, `useProtocol()`, `useRpc()`, reconnect-aware typed RPC wiring                                                                                                                                                                         | Lets apps attach connection state and remote capabilities without baking business contracts into the framework                                                                                                                                                                                                                       | [`docs/protocol.md`](docs/protocol.md)                                                                                                                                                   |
| `Boot Helpers`       | Hash/session helpers and `postMessage` handshake utilities                                                                                                                                                                                                | Helps multi-window and sandbox-style launch flows stay consistent                                                                                                                                                                                                                                                                    | [`docs/runtime.md`](docs/runtime.md)                                                                                                                                                     |

### File browser link semantics

The file browser keeps `FileItem.type` focused on interaction (`'file' | 'folder'`) and uses optional `FileItem.link` metadata to represent symbolic links separately. That means symlink-to-folder items can stay navigable while still rendering with dedicated link-aware icons, and downstream apps can distinguish symbolic links without forking the core file-browser behavior.

The same file-browser surface now also accepts a controlled `revealRequest` flow, so downstream apps can clear a blocking filter when needed, scroll a newly created item into view, and reuse the built-in single-selection state instead of wiring product-specific DOM reveal logic.

Selection behavior follows one shared contract across list and grid views: single-click replaces selection, `Shift+click` expands from the current anchor, `Cmd/Ctrl+click` toggles individual items, dragging across empty space performs marquee selection, and right-click keeps an existing selection when the target is already selected.

## What you can build

| Use case                               | Floe fit                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Internal tools and operator consoles   | Combine navigation, command search, settings, notifications, and product pages inside one consistent shell |
| File-centric workspaces                | Pair the shared shell with file browsing, search, editor views, and status surfaces                        |
| Browser-based companion apps           | Add chat, deck, widget, and launchpad-style surfaces without rebuilding base chrome                        |
| Connected products with remote actions | Inject a custom Flowersec contract and typed RPC layer when the UI needs live endpoint or service access   |

## Quick Start

### 1. Create a new app

```bash
npx @floegence/floe-webapp-init my-app

# Or start from the fuller sample app
npx @floegence/floe-webapp-init my-app --template full

cd my-app
pnpm install
pnpm dev
```

Template guide:

- `minimal` gives you `FloeApp` with a single page.
- `full` adds sample pages, settings, and theme toggling.

### 2. Explore this repository's demo

```bash
pnpm install
pnpm dev
```

The demo shows how Floe can host multiple product surfaces in one shell:

- `Showcase`: core UI components, layout primitives, and loading states
- `Files`: Monaco-powered source viewing over demo workspace files
- `Search`: workspace search that jumps into the file view
- `Settings`: protocol connect/disconnect plus shell and chart theme controls
- `Chat`, `Deck`, `Workbench`, `Notes`, and `Design Tokens`: reference surfaces for richer app experiences

The shared `layout` package now also owns the demo's page-mode shell primitives:

- `DisplayModeSwitcher` for the top-bar activity/deck/workbench mode contract
- `DisplayModePageShell` for full-page surfaces that reuse the shared top bar without rendering the activity bar or sidebar

The shared `workbench` package owns the infinite-canvas chrome plus widget registry contract. Downstream apps can inject custom widget definitions into the same workbench shell instead of forking its canvas, dock, widget chrome, or context menu behavior. Within a mounted workbench session, the widget lifecycle boundary is the stable `widget.id`: fronting, focus, and geometry updates mutate the visible snapshot without remounting the business widget subtree. Starting with `v0.36.7`, workbench viewport centering also depends on a live canvas-frame measurement contract, so arrow-key navigation, `focusWidget(...)`, and `ensureWidget(...)` continue centering the target widget correctly after mount-time zero-size layouts or later container resizes.

Starting with `v0.36.8`, workbench widgets can also opt into `renderMode: 'projected_surface'`. Projected widgets keep their world-space position, persistence, and z-order semantics, but their business DOM no longer lives inside the canvas scale transform ancestor. Instead, the canvas exposes a live viewport overlay layer and the widget body receives `surfaceMetrics` with projected screen geometry. This is the preferred path for rich surfaces such as Monaco, terminals, embedded previews, and other widgets that need a stable pixel-space host while the surrounding workbench still pans and zooms.

`CodeEditor` now also accepts `runtimeOptions.standaloneFeatures` so downstream preview surfaces can disable optional Monaco standalone services. Lightweight preview panes should pass only the features they actually need, while full editors can keep the default richer runtime.

Optional local variations:

- `pnpm dev -- --host 0.0.0.0 --port 5173` to expose the demo on your LAN
- `pnpm dev:dist` to run the demo against built package outputs instead of source imports

## Docs By Task

| I want to...                                             | Read                                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Start a new app and understand the demo                  | [`docs/getting-started.md`](docs/getting-started.md)                   |
| Configure shell defaults, strings, storage, and keybinds | [`docs/configuration.md`](docs/configuration.md)                       |
| Add sidebar views, commands, and status contributions    | [`docs/component-registry.md`](docs/component-registry.md)             |
| Understand shared interaction and layout guardrails      | [`docs/interaction-architecture.md`](docs/interaction-architecture.md) |
| Adopt the shared accessibility contract                  | [`docs/accessibility.md`](docs/accessibility.md)                       |
| Connect Flowersec sessions and typed RPC contracts       | [`docs/protocol.md`](docs/protocol.md)                                 |
| Wire multi-window or sandbox boot flows                  | [`docs/runtime.md`](docs/runtime.md)                                   |

## Accessibility And Integration At A Glance

- Floe Webapp targets a reusable WCAG 2.2 AA baseline for shared shell chrome and core interaction primitives.
- Shared navigation patterns such as tabs, mobile tabs, dropdowns, skip links, and shell landmarks are built into the framework so product teams can extend them instead of reimplementing them.
- Theming is token-driven, with local shell customization hooks such as `theme.tokens`, `slotClassNames`, and `data-floe-shell-slot`.
- The protocol package is optional and contract-driven: Floe ships the UI glue and reconnect behavior, while the host app owns the business RPC contract.

## For Developers

<details>
<summary>Local development</summary>

### Prerequisites

- Node.js `>= 20`
- pnpm `>= 9`

### Main commands

```bash
pnpm install
pnpm dev
pnpm dev:dist
make check
```

`make check` runs the local CI entrypoint: lint, typecheck, test, build, and dist verification.

### Workspace packages

| Package                           | Purpose                                                              |
| --------------------------------- | -------------------------------------------------------------------- |
| `@floegence/floe-webapp-core`     | Shared shell, UI primitives, workspace surfaces, and theme utilities |
| `@floegence/floe-webapp-protocol` | Flowersec-aware connection state and typed RPC wiring                |
| `@floegence/floe-webapp-boot`     | Boot helpers for multi-window and sandbox flows                      |
| `@floegence/floe-webapp-init`     | CLI scaffolding for new Floe apps                                    |

</details>

<details>
<summary>AI coding agents and repo-local skills</summary>

If your workflow uses coding agents, load the Floe skill package before implementation:

- `skills/floe-webapp/SKILL.md`
- `skills/floe-webapp/references/playbooks.md`

Scaffolded projects include the same `./skills/floe-webapp/` package at project root.

</details>

<details>
<summary>Cloudflare Pages demo deploy</summary>

- Recommended: Cloudflare Pages with Git integration
- Build command: `pnpm build:demo`
- Build output directory: `apps/demo/dist`
- Root directory: leave empty so the monorepo builds from repo root
- `wrangler.toml` is only for Wrangler Direct Upload, not the Git-integrated Pages flow

</details>
