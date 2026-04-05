---
name: floe-webapp
description: Implement, refactor, and debug Floe-Webapp apps and this monorepo using only public @floegence/floe-webapp-core exports. Use for FloeApp or FloeRegistryRuntime wiring, component registry flows, interaction-architecture guardrails, design-token-first styling, and local CI or verify failures.
---

# Floe-Webapp Skill

## Scope

- Implement or refactor repo workspace packages/apps and scaffolded Floe-Webapp apps.
- Add or update registry-driven navigation (`FloeComponent`, `commands`, `statusBar`, lifecycle hooks, app-level command contributions).
- Diagnose framework-usage issues and local lint/typecheck/test/build/verify failures.

## Required Inputs

- Read project-root `AGENTS.md` first when available.
- If `AGENTS.md` is absent, read `README.md` and `docs/getting-started.md`.
- Read the closest source-of-truth docs for the task:
  - `docs/component-registry.md` for registry/runtime/commands/lifecycle guidance.
  - `docs/interaction-architecture.md` for UI-first, overlay, drag/resize, and hot-path rules.
  - `docs/configuration.md`, `docs/protocol.md`, and `docs/runtime.md` when config, protocol, or boot behavior is involved.
- Load [references/playbooks.md](references/playbooks.md) and pick the closest playbook for the task.

## Execution Protocol

1. Verify package versions in `package.json` and the lockfile before using any API surface.
2. Classify the target shape before editing:
   - Repo workspace: `apps/*/src/App.tsx`, `apps/*/src/**/*`, `packages/*/src/**/*`, `packages/init/templates/**/*`.
   - Scaffolded app: `src/App.tsx`, `src/**/*`.
3. Use only public exports declared by `@floegence/floe-webapp-core` package exports. Current official surfaces:
   - `@floegence/floe-webapp-core`
   - `@floegence/floe-webapp-core/app`
   - `@floegence/floe-webapp-core/full`
   - `@floegence/floe-webapp-core/layout`
   - `@floegence/floe-webapp-core/deck`
   - `@floegence/floe-webapp-core/ui`
   - `@floegence/floe-webapp-core/icons`
   - `@floegence/floe-webapp-core/loading`
   - `@floegence/floe-webapp-core/launchpad`
   - `@floegence/floe-webapp-core/file-browser`
   - `@floegence/floe-webapp-core/chat`
   - `@floegence/floe-webapp-core/notes`
   - `@floegence/floe-webapp-core/editor`
   - `@floegence/floe-webapp-core/widgets`
   - `@floegence/floe-webapp-core/terminal`
   - `@floegence/floe-webapp-core/styles`
   - `@floegence/floe-webapp-core/tailwind`
4. Align registry behavior end-to-end:
   - Keep `FloeComponent.id`, sidebar items, command targets, and layout navigation consistent.
   - Use `ActivityAppsMain` for `sidebar.fullScreen` or `sidebar.renderIn === 'main'` page flows when appropriate.
   - Use `FloeRegistryRuntime` when a custom shell is required but registry lifecycle still needs symmetric register/mount/cleanup behavior.
5. Follow current interaction guardrails:
   - UI first: let the visual state update before heavier work.
   - Reuse `deferAfterPaint()` or `deferNonBlocking()` for deferred host logic.
   - Reuse `useOverlayMask()` for overlays.
   - Reuse `startHotInteraction()` and preview/commit separation for drag or resize flows.
6. Keep styling on design tokens and official CSS entrypoints:
   - Preferred: `@floegence/floe-webapp-core/tailwind`
   - Fallback: `@floegence/floe-webapp-core/styles`
7. When editing this repo's skill package, treat `skills/floe-webapp/*` as the source of truth and sync these mirrors before finishing:
   - `packages/init/skills/floe-webapp/*`
   - `packages/init/templates/full/skills/floe-webapp/*`
   - `packages/init/templates/minimal/skills/floe-webapp/*`
8. Run deterministic checks before finishing:

```bash
make check
```

If `make check` is unavailable in a downstream app, run:

```bash
pnpm lint
pnpm typecheck
pnpm test -- --run
pnpm build
```

When editing this repository, `make check` already includes `pnpm verify`; if you run commands individually, include `pnpm verify` before finishing.

## Constraints

- Solid.js only: do not use React hooks or React component patterns.
- Use `class=` in JSX, not `className=`.
- Do not import `@floegence/floe-webapp-core/src/...` internal paths.
- Keep command navigation ids aligned with registered component ids.
- Prefer Solid control flow in JSX (`<For>`, `<Show>`, `<Switch>/<Match>`) when it improves clarity.
- Respect component-registry lifecycle symmetry (`registerAll()` cleanup, `onMount`, `onUnmount`) and use `useCommandContributions()` for app-level command groups not tied to a `FloeComponent`.
- If API behavior is unclear, inspect installed type declarations and the relevant public docs before guessing.

## Mobile Compatibility

- Treat mobile as first-class behavior, not a fallback.
- For sidebar components that should not appear on small screens, set `sidebar.hiddenOnMobile: true`.
- Keep `sidebar.fullScreen`, `sidebar.renderIn`, and `sidebar.collapseBehavior` aligned with the intended mobile/desktop navigation behavior.
- Ensure primary navigation actions remain reachable on small screens (top bar or mobile tab bar paths).
- Avoid hover-only interactions; provide click or tap equivalents.
- Avoid fixed-width layouts that can overflow narrow viewports.
- Keep interactive targets comfortably tappable (buttons, menu items, toggles).
- Validate behavior at common widths before finishing:
  - Small phone: `390x844`
  - Large phone: `430x932`
  - Tablet: `768x1024`
  - Desktop: `>=1280px`

## Styling And Interaction Guidelines

- Use design tokens for color, border, and background (`text-*`, `bg-*`, `border-*` token classes).
- Avoid raw hex colors and ad-hoc opacity values unless product requirements explicitly demand them.
- Keep spacing and sizing on a consistent scale (`gap-*`, `p-*`, `m-*`, `rounded-*`).
- Ensure readable contrast in both light and dark themes.
- Define clear interactive states for controls (default, hover, active, focus, disabled).
- Keep motion subtle and optional; do not reintroduce hot-path geometry transitions that violate `docs/interaction-architecture.md`.
- When introducing new visual patterns, keep them consistent across pages and components.

## Failure Handling

- If checks fail, report the exact failing command and the first actionable error.
- Fix root causes instead of adding compatibility shims for old code paths.
- If `pnpm verify` fails on skill drift, sync the root skill package and mirrors instead of patching only one copy.
- If the task requires a risky incompatible behavior change, stop and ask for confirmation.

## Output Format

1. Brief summary of intent and implementation.
2. Changed files with behavior impact.
3. Verification result for each executed command.
