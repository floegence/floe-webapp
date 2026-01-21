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

The demo uses the VSCode-style Shell layout from `@floe/core`:

- Top bar (command/search)
- Activity bar (left)
- Sidebar (left, resizable/collapsible)
- Bottom bar (status)
- Mobile tab bar on small screens

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

Run local CI (lint + typecheck + test + build):

```bash
make check
```

