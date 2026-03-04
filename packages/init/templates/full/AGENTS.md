# Floe-Webapp AI Coding Skill

> Tool-agnostic framework guidance for AI coding tools
> to generate maintainable floe-webapp applications.

---

## 0. Open Agent Skill Package

This template includes a portable skill package at:

- `skills/floe-webapp/SKILL.md`

The `SKILL.md` format follows the open Agent Skills shape (frontmatter + structured sections).
Agent runtimes may use different discovery paths, but this project stores the skill in a neutral location for reuse.

---

## 1. Identity & Stack

**Floe-Webapp** is a VSCode-style web application framework built on **Solid.js**.

Core stack (version source of truth):

- Solid.js
- TypeScript
- Vite
- Tailwind CSS v4
- pnpm
- `@floegence/floe-webapp-core`

Version rule:

- **Always** follow versions declared in the target project's `package.json` (and lockfile), not assumptions in generated text.

---

## 2. Hard Constraints (Must Follow)

### Solid.js, not React

- Use `createSignal`, `createEffect`, `createMemo` (no React hooks)
- Use `class=` (no `className=`)
- Read signals as function calls: `value()`
- Write signals via setters: `setValue(next)`

### Import boundaries

- Use public package exports only, such as:
  - `@floegence/floe-webapp-core`
  - `@floegence/floe-webapp-core/app`
  - `@floegence/floe-webapp-core/ui`
  - `@floegence/floe-webapp-core/layout`
  - `@floegence/floe-webapp-core/icons`
- **Never** import internal source paths like `@floegence/floe-webapp-core/src/...`

### Theme consistency

- Prefer design-token classes (`text-foreground`, `bg-card`, `border-border`, etc.)
- Avoid hardcoded colors unless there is a clear product requirement

---

## 3. App Architecture Essentials

### FloeApp shell

```tsx
import type { FloeComponent } from '@floegence/floe-webapp-core';
import { FloeApp, ActivityAppsMain } from '@floegence/floe-webapp-core/app';

const components: FloeComponent[] = [/* ... */];

export default function App() {
  return (
    <FloeApp components={components} config={{ layout: { sidebar: { defaultActiveTab: 'home' } } }}>
      <ActivityAppsMain />
    </FloeApp>
  );
}
```

### FloeComponent registration

Key fields (current core API):

- `id`, `name`, `component`
- `sidebar.order`
- `sidebar.badge`
- `sidebar.fullScreen`
- `sidebar.renderIn: 'sidebar' | 'main'`
- `sidebar.hiddenOnMobile`
- `commands`, `statusBar`
- `onMount`, `onUnmount`

Design note:

- `fullScreen: true` implies main-area behavior.
- Use `renderIn: 'main'` when you want main-content rendering semantics without relying only on `fullScreen`.

---

## 4. Coding Guidelines (Priority, Not Absolute Bans)

- In JSX lists/branches, **prefer** Solid control flow (`<For>`, `<Show>`, `<Switch>/<Match>`) for consistency.
- `.map()` / ternary are still valid for pure data transforms outside JSX rendering decisions.
- For reactive component props, **prefer** `splitProps()` or `props.x` access patterns.
- Keep commands and sidebar behavior aligned: command navigation should target registered component ids.

---

## 5. Practical Import Map

```ts
import { FloeApp, ActivityAppsMain } from '@floegence/floe-webapp-core/app';
import { Button, Card, Dialog, Input, Tabs } from '@floegence/floe-webapp-core/ui';
import { Shell, Sidebar, Panel, KeepAliveStack } from '@floegence/floe-webapp-core/layout';
import { Files, Settings, Sun, Moon } from '@floegence/floe-webapp-core/icons';
import { useTheme, useFloeConfig, cn, type FloeComponent } from '@floegence/floe-webapp-core';
import '@floegence/floe-webapp-core/tailwind';
```

---

## 6. Delivery Checklist

Before finalizing generated code:

1. Confirm imports use only public subpath exports.
2. Confirm Solid patterns are used (`class`, signals, control flow where appropriate).
3. Confirm theme tokens are used for color/background/border.
4. Confirm `FloeComponent` ids, sidebar behavior, and command navigation are consistent.
5. Confirm any API usage matches the installed package versions in `package.json`.
