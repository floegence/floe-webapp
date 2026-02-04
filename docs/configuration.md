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

## Theme

Configuration: `FloeConfig.theme` (`packages/core/src/context/FloeConfigContext.tsx`)

- `defaultTheme`: `'light' | 'dark' | 'system'`
- `storageKey`: persistence key for theme choice

Implementation references:

- `packages/core/src/context/ThemeContext.tsx`
- `packages/core/src/styles/themes/*`

## Strings

Configuration: `FloeConfig.strings` (`packages/core/src/context/FloeConfigContext.tsx`)

All built-in UI text should be overridden through this object (placeholders, empty states, labels).

Implementation references:

- `packages/core/src/components/layout/TopBar.tsx`
- `packages/core/src/components/ui/CommandPalette.tsx`
