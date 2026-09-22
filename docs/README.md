# Floe Webapp Docs

This folder contains **public, version-controlled** documentation for downstream users.

- Skill Package (import first): `skills/floe-webapp/SKILL.md`
- Getting Started: `docs/getting-started.md`
- Configuration (FloeConfig): `docs/configuration.md`
- Surface Styles: `docs/surface-style.md`
- Accessibility Contract: `docs/accessibility.md`
- Component Registry & Contributions: `docs/component-registry.md`
- Interaction Architecture & Guardrails: `docs/interaction-architecture.md`
- Picker Path Semantics: `docs/picker-paths.md`
- Protocol Layer (Flowersec): `docs/protocol.md`
- E2EE Boot Utilities & Flowersec Proxy Integration: `docs/runtime.md`

Note: local design/dev notes live in dotfile markdown (e.g. `.develop.md`, `.design.md`) and are intentionally ignored by git.

- [Surface component coverage](./surface-components.md) — component-by-component material and state contracts.

- [Document reload presentation](reload-placeholder.md): preserve anonymous layout before application scripts and hand off after authorized restoration.

- [Mobile application viewport](mobile-viewport.md): retain application geometry and input through browser chrome and soft-keyboard changes.
