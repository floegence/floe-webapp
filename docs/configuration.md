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
        accessibility: {
          mainContentId: 'workspace-main',
          skipLinkLabel: 'Skip to workspace',
          topBarLabel: 'Workspace toolbar',
          primaryNavigationLabel: 'Workspace navigation',
          mobileNavigationLabel: 'Workspace navigation',
          sidebarLabel: 'Workspace sidebar',
          mainLabel: 'Workspace content',
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
</Shell>;
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

## Accessibility

Configuration: `FloeConfig.accessibility` (`packages/core/src/context/FloeConfigContext.tsx`)

- `mainContentId`: stable `id` for the primary `<main>` target (default: `floe-main-content`)
- `skipLinkLabel`: visible-on-focus label for the shell skip link
- `topBarLabel`: accessible name for the top bar landmark
- `primaryNavigationLabel`: accessible name for the desktop activity/navigation landmark
- `mobileNavigationLabel`: accessible name for the mobile tab navigation landmark
- `sidebarLabel`: accessible name for the sidebar/complementary region
- `mainLabel`: accessible name for the primary application content region

Implementation references:

- `packages/core/src/components/layout/Shell.tsx`
- `packages/core/src/components/layout/TopBar.tsx`
- `packages/core/src/components/layout/ActivityBar.tsx`
- `packages/core/src/components/layout/MobileTabBar.tsx`
- `packages/core/src/components/layout/Sidebar.tsx`
- `packages/core/src/components/layout/SidebarPane.tsx`

Guidance:

- Localize these labels at the app boundary instead of hard-coding page-specific ARIA labels inside feature components.
- Keep the main-content id stable so skip links and focus restoration remain deterministic.
- For broader guidance on keyboard behavior, live regions, and downstream responsibilities, see `docs/accessibility.md`.

## Theme

Configuration: `FloeConfig.theme` (`packages/core/src/context/FloeConfigContext.tsx`)

- `defaultTheme`: `'light' | 'dark' | 'system'`
- `storageKey`: persistence key for theme choice
- `presetStorageKey`: persistence key for the active named token preset (defaults to `${storageKey}-preset`)
- `defaultPreset`: default named token preset
- `presets`: named token presets for switching palettes without changing light/dark mode
- `tokens.shared`: applied in both themes
- `tokens.light`: applied only when the resolved theme is `light`
- `tokens.dark`: applied only when the resolved theme is `dark`

Example:

```tsx
config={{
  theme: {
    defaultPreset: 'default',
    presets: [
      { name: 'default', displayName: 'Default' },
      {
        name: 'nord',
        displayName: 'Nord',
        tokens: {
          dark: {
            '--chart-1': 'oklch(0.88 0.06 235)',
            '--chart-2': 'oklch(0.76 0.12 210)',
          },
        },
      },
    ],
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
- Prefer `theme.presets` when you want the app to switch between named visual palettes such as chart themes or brand accents.
- Avoid global resets such as `* { border-width: 0; }`, which can silently break shell chrome defaults.

Runtime access:

```ts
const theme = useTheme();

theme.themePresets(); // readonly preset list
theme.themePreset(); // active preset
theme.setThemePreset('nord');
```

### Built-in design token contract

If you need read-only token metadata for a token inspector, docs page, or external tooling, consume the public contract from `@floegence/floe-webapp-core` instead of copying values into app code.

```ts
import {
  floeColorTokenCategories,
  floeDesignTokens,
  floeSharedCssVariables,
  floeThemeColorVariables,
} from '@floegence/floe-webapp-core';
```

- `floeColorTokenCategories`: semantic color groups with light/dark values
- `floeThemeColorVariables`: flattened `light` / `dark` CSS variable maps
- `floeSharedCssVariables`: shared variables such as `--radius`, `--font-sans`, `--font-mono`
- `floeDesignTokens`: combined color, typography, spacing, radius, motion, and shared token metadata

## Strings

Configuration: `FloeConfig.strings` (`packages/core/src/context/FloeConfigContext.tsx`)

All built-in UI text should be overridden through this object (placeholders, empty states, labels).

Implementation references:

- `packages/core/src/components/layout/TopBar.tsx`
- `packages/core/src/components/ui/CommandPalette.tsx`
