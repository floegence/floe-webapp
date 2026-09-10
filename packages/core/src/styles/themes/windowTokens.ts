/** Palette-relative, opaque window material; resolved by CSS only when the theme changes. */
export const LIGHT_WINDOW_TOKENS = {
  '--floe-window-background': 'color-mix(in srgb, var(--card) 35%, white)',
  '--floe-window-foreground': 'var(--foreground)',
  '--floe-window-muted-foreground': 'var(--muted-foreground)',
  '--floe-window-titlebar-background':
    'color-mix(in srgb, var(--floe-window-background) 92%, var(--foreground))',
  '--floe-window-border':
    'color-mix(in srgb, var(--floe-window-background) 88%, var(--foreground))',
  '--floe-window-shadow': '0 1px 3px rgb(0 0 0 / 14%), 0 12px 28px -8px rgb(0 0 0 / 18%)',
} as const;

export const DARK_WINDOW_TOKENS = {
  '--floe-window-background': 'color-mix(in srgb, var(--card) 90%, white)',
  '--floe-window-foreground': 'var(--foreground)',
  '--floe-window-muted-foreground':
    'color-mix(in srgb, var(--muted-foreground) 72%, var(--foreground))',
  '--floe-window-titlebar-background':
    'color-mix(in srgb, var(--floe-window-background) 95%, white)',
  '--floe-window-border':
    'color-mix(in srgb, var(--floe-window-background) 88%, var(--foreground))',
  '--floe-window-shadow': '0 1px 3px rgb(0 0 0 / 30%), 0 12px 28px -8px rgb(0 0 0 / 32%)',
} as const;
