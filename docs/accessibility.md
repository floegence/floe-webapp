# Accessibility Contract

Floe Webapp targets a reusable WCAG 2.2 AA baseline for shared application chrome and core interaction primitives.

This document describes:

- what the framework guarantees upstream,
- what downstream applications still need to own,
- how to compose custom UI without fighting the accessibility model.

## Shared guarantees

### Shell landmarks and skip navigation

`Shell` reads `config.accessibility` and provides a shared accessibility contract for application chrome:

- a stable skip link that targets the main content region,
- explicit accessible names for the top bar, primary navigation, mobile navigation, sidebar, and main region,
- a consistent main-region `id` and `tabIndex={-1}` target for focus recovery.

Use this shared contract instead of adding page-specific landmark wrappers around Floe shell chrome.

### Keyboard-safe navigation primitives

The shared navigation primitives carry the keyboard behavior that downstream apps should rely on:

- `Tabs` and `MobileTabBar` implement roving `tabIndex` plus arrow/home/end navigation.
- `Dropdown` exposes a semantic trigger wrapper, `aria-haspopup`, `aria-expanded`, and wrapped menu-item traversal rules.
- `SidebarPane` mobile overlays use dialog semantics instead of visually-only drawers.

If a downstream feature needs product-specific behavior, extend it on top of these primitives instead of rebuilding tab or menu semantics locally.

### Disclosure and live-region defaults

Shared chat/file/tooling surfaces now use explicit button/disclosure semantics where interaction is expandable or actionable.

Notifications use role and live-region defaults by severity:

- `status` + polite for informational/success flows,
- `alert` + assertive for warning/error flows.

### Contrast-sensitive defaults

The shared light-theme muted foreground and activity-bar foreground tokens were adjusted to keep common shell text/icon treatments in an AA-safe range.

Downstream apps should continue to prefer semantic tokens instead of hard-coded low-contrast colors.

## Downstream responsibilities

Floe Webapp can guarantee shared structure and primitive behavior, but application teams still own product semantics.

Downstream applications must still:

- label product-specific forms, toggles, dialogs, and empty states,
- connect validation/help text with `aria-describedby` where needed,
- preserve visible focus styling on custom controls,
- avoid pointer-only affordances for product actions,
- write tests for product-specific keyboard flows and error/focus recovery.

## `Dropdown` trigger guidance

`Dropdown` now separates trigger content from trigger interaction:

- `trigger`: presentational content rendered inside the interactive wrapper
- `triggerClass`: classes for the semantic trigger wrapper
- `triggerAriaLabel`: explicit name for icon-only or visually ambiguous triggers

Prefer this pattern:

```tsx
<Dropdown
  trigger={<span>Actions</span>}
  triggerClass="inline-flex items-center rounded-md border px-3 h-8"
  items={items}
  onSelect={handleSelect}
/>
```

Avoid passing a nested `<button>` as `trigger`, because the wrapper already owns the menu-button semantics.

## Suggested downstream checklist

When adopting Floe Webapp in an application shell, verify:

- `config.accessibility` names match the product language and IA,
- skip navigation lands on the correct primary content surface,
- custom widgets do not suppress focus-visible styles,
- custom keyboard flows do not conflict with the shared tab/menu behavior,
- contrast overrides remain token-based and are validated in both light and dark themes.
