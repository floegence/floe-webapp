# Floe-Webapp Coding Skill

Load the floe-webapp coding skill and apply it to implementation tasks.

## Instructions

1. Read `AGENTS.md` at the project root first.
2. Treat `AGENTS.md` as tool-agnostic framework guidance.
3. Use the current project's `package.json`/lockfile as the version source of truth.
4. Follow hard constraints first:
   - Solid.js patterns (not React)
   - public subpath imports only
   - design-token-first styling
5. Then apply the recommended coding priorities in `AGENTS.md`.

## Quick Start

When implementing a floe-webapp feature:

1. Read `AGENTS.md`.
2. Build with `@floegence/floe-webapp-core` public exports (`/app`, `/ui`, `/layout`, `/icons`, root).
3. Register features as `FloeComponent` and align `sidebar` + `commands` behavior.
4. Keep styles token-based (`text-foreground`, `bg-card`, `border-border`, etc.).
5. Validate API usage against installed dependency versions.
