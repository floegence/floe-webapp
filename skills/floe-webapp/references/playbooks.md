# Floe-Webapp Skill Playbooks

Use this file after reading `../SKILL.md`.

## Playbook A: Choose The Right Workspace Surface

1. Classify the target before editing:

```bash
if [ -d apps ] || [ -d packages ]; then
  printf 'repo workspace\n'
  find apps packages -maxdepth 3 -type f 2>/dev/null | sort | sed -n '1,200p'
fi
if [ -d src ]; then
  printf '\nscaffolded app\n'
  find src -maxdepth 3 -type f | sort | sed -n '1,200p'
fi
```

2. Use repo-workspace searches for this monorepo:

```bash
rg "FloeApp|FloeRegistryRuntime|const components|FloeComponent\[]|useCommandContributions" apps packages packages/init/templates --hidden
```

3. Use generated-app searches for scaffolded projects:

```bash
rg "FloeApp|FloeRegistryRuntime|const components|FloeComponent\[]|useCommandContributions" src --hidden
```

## Playbook B: Add Or Update Registry-Driven Navigation

1. Find the registration flow in the correct workspace surface.
2. Keep every component contribution aligned:
- Stable `id` string.
- `sidebar` metadata (`order`, `renderIn`, `fullScreen`, `hiddenOnMobile`, optional `badge`, optional `collapseBehavior`).
- `commands` targets using the same registered ids.
- `statusBar` ordering and placement when applicable.
3. Validate the shell wiring still renders through the intended runtime:
- `FloeApp` for the standard shell.
- `FloeRegistryRuntime` for custom shell assembly.
- `ActivityAppsMain` or `KeepAliveStack` for main-view keep-alive flows.
4. If you touch manual registry lifecycle, keep `ComponentRegistry.registerAll()` cleanup symmetry intact.

## Playbook C: Add Commands And Lifecycle Hooks

1. Search contribution points:

```bash
for dir in apps packages src; do
  [ -d "$dir" ] || continue
  rg "commands|useCommandContributions|CommandPalette|setSidebarActiveTab|registerAll|onMount|onUnmount" "$dir" --hidden
done
```

2. Use the right command pattern:
- `FloeComponent.commands[].execute(ctx)` for component-owned commands.
- `useCommandContributions()` for app-level command groups that are not tied to a `FloeComponent`.
3. Ensure command labels, ids, categories, keybinds, and navigation targets remain consistent.
4. If protocol/config context is involved, trace it through `wrapAfterTheme`, `getProtocol`, and component context docs before editing.

## Playbook D: Select Public Exports Deliberately

1. Treat `packages/core/package.json` `exports` as the source of truth.
2. Prefer the most specific public subpath that matches the feature:
- `@floegence/floe-webapp-core/app`
- `@floegence/floe-webapp-core/layout`
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
- `@floegence/floe-webapp-core/deck`
- `@floegence/floe-webapp-core/full`
- `@floegence/floe-webapp-core/styles`
- `@floegence/floe-webapp-core/tailwind`
3. Do not import `@floegence/floe-webapp-core/src/...`.
4. Prefer `@floegence/floe-webapp-core/tailwind` for Tailwind v4 apps; use `@floegence/floe-webapp-core/styles` only as the no-Tailwind fallback.

## Playbook E: Interaction Architecture And Responsive QA

1. Search for interaction-sensitive code paths:

```bash
for dir in apps packages src; do
  [ -d "$dir" ] || continue
  rg "useOverlayMask|startHotInteraction|deferAfterPaint|deferNonBlocking|data-floe-geometry-surface|hiddenOnMobile|renderIn|fullScreen|collapseBehavior" "$dir" --hidden
done
```

2. Apply the current guardrails from `docs/interaction-architecture.md`:
- UI first for click/open/selection flows.
- `useOverlayMask()` for overlays and drawers.
- `startHotInteraction()` plus preview/commit separation for drag or resize flows.
- No hot-path `transition-all` or geometry-following animation regressions.
3. Validate responsive behavior manually in browser devtools at:
- `390x844`
- `430x932`
- `768x1024`
- `>=1280px`
4. Verify interaction behavior on touch-like flows:
- Navigation still reachable without hover.
- Buttons, menus, and toggles remain usable on small screens.
- No clipped text or horizontal overflow in primary views.

## Playbook F: Verify, Sync, And Diagnose

1. Prefer the repo-local CI entrypoint when available:

```bash
make check
```

2. If `make check` is unavailable, run deterministic fallback commands:

```bash
pnpm lint
pnpm typecheck
pnpm test -- --run
pnpm build
```

3. When editing this repository's skill package, sync mirrors first:

```bash
pnpm sync:skills
pnpm verify
```

4. If a command fails:
- Capture the first actionable error.
- Fix the nearest root cause.
- Re-run from the failed command onward.
- Do a final review of the changed files for consistency and completeness before committing.
