---
name: floe-webapp-development
description: Build and modify Floe-Webapp Solid.js applications with @floegence/floe-webapp-core public exports, component registration, and token-based styling.
---

# Floe-Webapp Development Skill

## When To Use

- Implementing or changing Floe-Webapp pages/components.
- Registering features with `FloeComponent` (sidebar, commands, lifecycle).
- Troubleshooting framework usage in Solid.js + floe-webapp-core projects.

## Steps

1. Read project-root `AGENTS.md` first for complete framework guidance.
2. Locate existing app structure and match changes to `FloeApp` + `FloeComponent` patterns.
3. Implement with public exports from `@floegence/floe-webapp-core` (`/app`, `/ui`, `/layout`, `/icons`, root).
4. Keep styling on design tokens (`text-foreground`, `bg-card`, `border-border`, etc.).
5. Validate API usage against installed versions in `package.json` and lockfile.

## Constraints

- Solid.js only: do not use React hooks/patterns.
- Use `class=` in JSX, not `className=`.
- Do not import `@floegence/floe-webapp-core/src/...` internal paths.
- Keep command navigation ids aligned with registered component ids.
- Prefer Solid control flow in JSX (`<For>`, `<Show>`, `<Switch>/<Match>`) for consistency.

## Output Format

- Briefly summarize intent and implementation.
- List changed files and key behavior impact.
- Include verification status (lint/typecheck/test/build if executed).
