---
name: floe-webapp
description: Implement, refactor, and debug Floe-Webapp Solid.js applications with @floegence/floe-webapp-core public exports. Use for FloeApp shell wiring, FloeComponent sidebar or command registration, lifecycle hooks, design-token-first styling, and build or typecheck failures in Floe-Webapp projects.
---

# Floe-Webapp Skill

## Scope

- Implement or refactor pages/components in a Floe-Webapp app.
- Add or update `FloeComponent` registration (`sidebar`, `commands`, lifecycle hooks).
- Diagnose framework-usage issues and local build/lint/typecheck/test failures.

## Required Inputs

- Read project-root `AGENTS.md` before editing code.
- Load [references/playbooks.md](references/playbooks.md) and pick the closest playbook for the task.

## Execution Protocol

1. Verify package versions in `package.json` and lockfile before using any API surface.
2. Locate entry points and registration flow (`src/App.tsx`, component modules, command handlers).
3. Implement using only public exports from `@floegence/floe-webapp-core` (`/app`, `/ui`, `/layout`, `/icons`, root).
4. Align `FloeComponent.id`, sidebar items, and command navigation targets.
5. Keep styling on design tokens (`text-foreground`, `bg-card`, `border-border`, etc.).
6. Run deterministic checks before finishing:

```bash
pnpm lint
pnpm typecheck
pnpm test -- --run
pnpm build
```

## Constraints

- Solid.js only: do not use React hooks/patterns.
- Use `class=` in JSX, not `className=`.
- Do not import `@floegence/floe-webapp-core/src/...` internal paths.
- Keep command navigation ids aligned with registered component ids.
- Prefer Solid control flow in JSX (`<For>`, `<Show>`, `<Switch>/<Match>`).
- If API behavior is unclear, inspect installed type declarations before guessing.

## Failure Handling

- If checks fail, report the exact failing command and first actionable error.
- Fix root causes instead of adding compatibility shims for old code paths.
- If task requires risky incompatible behavior change, stop and ask for confirmation.

## Output Format

1. Brief summary of intent and implementation.
2. Changed files with behavior impact.
3. Verification result for each executed command.
