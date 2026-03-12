# Configuration (FloeConfig)

Floe is configured via `FloeConfig` (deep-partial merge on top of defaults).

You can pass it through:

- `FloeApp` (`packages/core/src/app/FloeApp.tsx`)
- or `FloeProvider` (`packages/core/src/app/FloeProvider.tsx`)

The source of truth for the schema + defaults is:

- `packages/core/src/context/FloeConfigContext.tsx`

## Example

```tsx
import { FloeApp } from '@floegence/floe-webapp-core/app';

export function App() {
  return (
    <FloeApp
      config={{
        storage: { namespace: 'myapp' },
        layout: {
          mobileQuery: '(max-width: 900px)',
          sidebar: { defaultActiveTab: 'home' },
        },
        commands: {
          palette: { keybind: 'mod+p' },
          save: { enabled: false },
        },
        theme: {
          tokens: {
            dark: {
              '--chrome-border': 'hsl(220 16% 24%)',
            },
          },
        },
        strings: {
          topBar: { searchPlaceholder: 'Search...' },
        },
      }}
    >
      <div />
    </FloeApp>
  );
}
```

## Storage

Configuration: `FloeConfig.storage` (`packages/core/src/context/FloeConfigContext.tsx`)

- `namespace`: prefix for persisted keys (default: `floe`)
- `enabled`: disable all persistence when `false`
- `adapter`: custom adapter (defaults to `localStorage` when available)

Custom adapter example:

```ts
import type { FloeStorageAdapter } from '@floegence/floe-webapp-core';

export const memoryStorage: FloeStorageAdapter = {
  getItem: (k) => cache.get(k) ?? null,
  setItem: (k, v) => void cache.set(k, v),
  removeItem: (k) => void cache.delete(k),
  keys: () => Array.from(cache.keys()),
};

const cache = new Map<string, string>();
```

## Commands & Keybinds

Configuration: `FloeConfig.commands` (`packages/core/src/context/FloeConfigContext.tsx`)

- `enableGlobalKeybinds`: install a global `keydown` listener
- `ignoreWhenTyping`: ignore global hotkeys while typing in inputs/textareas/contenteditable
- `allowWhenTypingWithin`: selector to opt-in hotkeys while typing (default: `[data-floe-hotkeys="allow"]`)
- `palette`: command palette enable + keybind
- `save`: intercept `Cmd/Ctrl+S` and optionally run a command (default command id: `file.save`)

Implementation reference:

- `packages/core/src/context/CommandContext.tsx`

## Layout

Configuration: `FloeConfig.layout` (`packages/core/src/context/FloeConfigContext.tsx`)

- `mobileQuery`: controls the mobile breakpoint (default: `(max-width: 767px)`)
- `sidebar`: width clamp, default tab, collapsed default
- `terminal`: opened default, height clamp

Implementation references:

- `packages/core/src/components/layout/Shell.tsx` reads `layout.mobileQuery`
- `packages/core/src/context/LayoutContext.tsx` persists sidebar + terminal state

### Shell chrome styling

`Shell` also exposes stable chrome styling hooks through `slotClassNames` and `data-floe-shell-slot`.

```tsx
import { Shell } from '@floegence/floe-webapp-core/layout';

<Shell
  slotClassNames={{
    topBar: 'backdrop-blur-md',
    bottomBar: 'text-[11px]',
  }}
>
  <div />
</Shell>
```

Stable selectors:

- `[data-floe-shell]`
- `[data-floe-shell-slot="top-bar"]`
- `[data-floe-shell-slot="activity-bar"]`
- `[data-floe-shell-slot="sidebar"]`
- `[data-floe-shell-slot="content-area"]`
- `[data-floe-shell-slot="main"]`
- `[data-floe-shell-slot="terminal-panel"]`
- `[data-floe-shell-slot="bottom-bar"]`
- `[data-floe-shell-slot="mobile-tab-bar"]`

## Theme

Configuration: `FloeConfig.theme` (`packages/core/src/context/FloeConfigContext.tsx`)

- `defaultTheme`: `'light' | 'dark' | 'system'`
- `storageKey`: persistence key for theme choice
- `tokens.shared`: applied in both themes
- `tokens.light`: applied only when the resolved theme is `light`
- `tokens.dark`: applied only when the resolved theme is `dark`

Example:

```tsx
config={{
  theme: {
    tokens: {
      shared: {
        '--chrome-border': 'color-mix(in srgb, var(--border) 85%, var(--foreground) 15%)',
      },
      dark: {
        '--bottom-bar-border': 'hsl(220 18% 26%)',
      },
    },
  },
}}
```

Recommended token-first shell chrome variables:

- `--chrome-border`
- `--top-bar-border`
- `--activity-bar-border`
- `--bottom-bar-border`
- `--terminal-panel-border`

Implementation references:

- `packages/core/src/context/ThemeContext.tsx`
- `packages/core/src/styles/themes/*`

Guidance:

- Prefer `theme.tokens` for chrome colors and `slotClassNames` for local layout styling.
- Avoid global resets such as `* { border-width: 0; }`, which can silently break shell chrome defaults.

## Strings

Configuration: `FloeConfig.strings` (`packages/core/src/context/FloeConfigContext.tsx`)

All built-in UI text should be overridden through this object (placeholders, empty states, labels).

Implementation references:

- `packages/core/src/components/layout/TopBar.tsx`
- `packages/core/src/components/ui/CommandPalette.tsx`
