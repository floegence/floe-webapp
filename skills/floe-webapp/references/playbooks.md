# Floe-Webapp Skill Playbooks

Use this file after reading `../SKILL.md`.

## Playbook A: Add Or Update A FloeComponent

1. Find the registration list:

```bash
rg "const components|FloeComponent\\[]" src --hidden
```

2. Keep every component entry aligned:
- Stable `id` string.
- `sidebar` metadata (`order`, `renderIn`, `fullScreen`, optional `badge`).
- `commands` targets using the same `id`.

3. Validate shell wiring still renders through:
- `FloeApp`
- `ActivityAppsMain`

## Playbook B: Add Command Navigation

1. Search command contribution points:

```bash
rg "commands|useCommand|command" src --hidden
```

2. Ensure each command action targets a registered component id.
3. Keep labels, ids, and sidebar destination consistent.

## Playbook C: Implement UI With Public Exports

Allowed imports:
- `@floegence/floe-webapp-core`
- `@floegence/floe-webapp-core/app`
- `@floegence/floe-webapp-core/ui`
- `@floegence/floe-webapp-core/layout`
- `@floegence/floe-webapp-core/icons`

Forbidden:
- `@floegence/floe-webapp-core/src/...`

## Playbook D: Verify And Diagnose

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test -- --run
pnpm build
```

If a command fails:
1. Capture the first actionable error.
2. Fix the nearest root cause.
3. Re-run from the failed command onward.
