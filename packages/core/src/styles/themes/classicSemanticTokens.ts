import { createProgressTokens } from './progressTokens.ts';
import { LIGHT_WINDOW_TOKENS, DARK_WINDOW_TOKENS } from './windowTokens.ts';
import type { FloeThemeTokenMap } from './index';

function resolveTokenReferences(tokens: Readonly<FloeThemeTokenMap>): Readonly<FloeThemeTokenMap> {
  const resolved: FloeThemeTokenMap = {};
  const resolveValue = (name: `--${string}`, seen = new Set<string>()): string | undefined => {
    const value = tokens[name];
    if (!value || seen.has(name)) return value;
    const reference = /^var\((--[\w-]+)\)$/u.exec(value)?.[1] as `--${string}` | undefined;
    if (!reference) return value;
    seen.add(name);
    return resolveValue(reference, seen);
  };
  for (const name of Object.keys(tokens) as Array<`--${string}`>) {
    resolved[name] = resolveValue(name);
  }
  return Object.freeze(resolved);
}

const classicLightPalette = {
  ...LIGHT_WINDOW_TOKENS,
  '--floe-window-background': 'var(--popover)',
  '--floe-window-titlebar-background': 'var(--popover)',
  '--background': '#f8f7f2', '--foreground': '#303a34',
  '--primary': '#465a43', '--primary-foreground': '#f8faf5',
  '--secondary': '#eeefe8', '--secondary-foreground': '#545f56',
  '--muted': '#e9ece3', '--muted-foreground': '#5e695c',
  '--accent': '#e0e7da', '--accent-foreground': '#303a34',
  '--border': '#d4d8cd', '--input': '#858e80',
  '--ring': '#56694f', '--chrome-border': '#dedfd7',
  '--top-bar-border': 'var(--chrome-border)', '--activity-bar-border': 'var(--chrome-border)',
  '--bottom-bar-border': 'var(--chrome-border)', '--terminal-panel-border': 'var(--chrome-border)',
  '--card': '#fcfbf7', '--card-foreground': '#303a34',
  '--popover': '#fffefa', '--popover-foreground': '#303a34',
  '--success': '#496744', '--success-foreground': '#f8faf5',
  '--warning': '#856828', '--warning-foreground': '#fffefa',
  '--error': '#b74744', '--error-foreground': '#fffefa',
  '--info': '#2671d9', '--info-foreground': '#fffefa',
  '--highlight-block-info-accent': 'oklch(0.52 0.14 245)',
  '--highlight-block-warning-accent': 'oklch(0.62 0.16 65)',
  '--highlight-block-success-accent': 'oklch(0.55 0.14 155)',
  '--highlight-block-error-accent': 'oklch(0.55 0.16 25)',
  '--highlight-block-note-accent': 'oklch(0.52 0.16 285)',
  '--highlight-block-tip-accent': 'oklch(0.52 0.12 175)',
  '--sidebar': '#efeee7', '--sidebar-foreground': '#303a34',
  '--sidebar-primary': '#465a43', '--sidebar-primary-foreground': '#f8faf5',
  '--sidebar-accent': '#e0e7da', '--sidebar-accent-foreground': '#303a34',
  '--sidebar-border': '#dedfd7', '--sidebar-ring': '#56694f',
  '--activity-bar': '#eeede6', '--activity-bar-foreground': '#5e695c',
  '--activity-bar-foreground-active': '#303a34',
  '--activity-bar-badge': '#465a43',
  '--activity-bar-badge-foreground': '#f8faf5',
  '--terminal-background': 'hsl(214 26% 17%)', '--terminal-foreground': 'hsl(0 0% 92%)',
  '--chart-1': 'hsl(214 26% 17%)', '--chart-2': 'hsl(215 16% 42%)',
  '--chart-3': 'hsl(217 91% 60%)', '--chart-4': 'oklch(0.68 0.16 150)',
  '--chart-5': 'hsl(38 92% 50%)', '--selection-bg': 'hsl(217 91% 60%)',
  '--selection-fg': 'hsl(0 0% 100%)', '--selection-on-primary-bg': 'hsl(38 92% 50%)',
  '--selection-on-primary-fg': 'hsl(214 26% 17%)',
  '--selection-code-bg': 'hsl(212 100% 67%)', '--selection-code-fg': 'hsl(220 20% 8%)',
  '--glow': '#465a43',
} as const satisfies FloeThemeTokenMap;

const classicDarkPalette = {
  ...DARK_WINDOW_TOKENS,
  '--floe-window-background': 'var(--popover)',
  '--floe-window-titlebar-background': 'var(--popover)',
  '--background': '#202223', '--foreground': '#e5e6e2',
  '--primary': '#bccbb8', '--primary-foreground': '#20291f',
  '--secondary': '#303435', '--secondary-foreground': '#b8bdb8',
  '--muted': '#343738', '--muted-foreground': '#9da4a0',
  '--accent': '#353a38', '--accent-foreground': '#e5e6e2',
  '--border': '#3e4142', '--input': '#6d7571',
  '--ring': '#acbdb3', '--chrome-border': '#292c2b',
  '--top-bar-border': 'var(--chrome-border)', '--activity-bar-border': 'var(--chrome-border)',
  '--bottom-bar-border': 'var(--chrome-border)', '--terminal-panel-border': 'var(--chrome-border)',
  '--card': '#282b2c', '--card-foreground': '#e5e6e2',
  '--popover': '#2b2e2f', '--popover-foreground': '#e5e6e2',
  '--success': '#a1b69e', '--success-foreground': '#20291f',
  '--warning': '#c8af84', '--warning-foreground': '#20291f',
  '--error': 'oklch(0.7 0.22 25)', '--error-foreground': '#202223',
  '--info': 'oklch(0.7 0.15 250)', '--info-foreground': '#202223',
  '--highlight-block-info-accent': 'oklch(0.62 0.12 240)',
  '--highlight-block-warning-accent': 'oklch(0.7 0.14 65)',
  '--highlight-block-success-accent': 'oklch(0.62 0.12 155)',
  '--highlight-block-error-accent': 'oklch(0.6 0.14 25)',
  '--highlight-block-note-accent': 'oklch(0.62 0.14 285)',
  '--highlight-block-tip-accent': 'oklch(0.6 0.1 175)',
  '--sidebar': '#1b1d1e', '--sidebar-foreground': '#e5e6e2',
  '--sidebar-primary': '#bccbb8', '--sidebar-primary-foreground': '#20291f',
  '--sidebar-accent': '#353a38', '--sidebar-accent-foreground': '#e5e6e2',
  '--sidebar-border': '#292c2b', '--sidebar-ring': '#acbdb3',
  '--activity-bar': '#17191a', '--activity-bar-foreground': '#9da4a0',
  '--activity-bar-foreground-active': '#e5e6e2',
  '--activity-bar-badge': '#bccbb8',
  '--activity-bar-badge-foreground': '#20291f',
  '--terminal-background': 'hsl(222 32% 7%)', '--terminal-foreground': 'hsl(210 15% 92%)',
  '--chart-1': 'hsl(210 20% 98%)', '--chart-2': 'hsl(215 20% 60%)',
  '--chart-3': 'oklch(0.7 0.15 250)', '--chart-4': 'oklch(0.72 0.19 150)',
  '--chart-5': 'oklch(0.82 0.16 80)', '--selection-bg': 'hsl(215 70% 50%)',
  '--selection-fg': 'hsl(0 0% 100%)', '--selection-on-primary-bg': 'hsl(215 80% 35%)',
  '--selection-on-primary-fg': 'hsl(0 0% 100%)',
  '--selection-code-bg': 'hsl(212 100% 67%)', '--selection-code-fg': 'hsl(220 20% 8%)',
  '--glow': 'hsl(217 65% 52%)',
} as const satisfies FloeThemeTokenMap;

export const CLASSIC_LIGHT_CSS_TOKENS = { ...classicLightPalette, ...createProgressTokens('light', classicLightPalette) };
export const CLASSIC_DARK_CSS_TOKENS = { ...classicDarkPalette, ...createProgressTokens('dark', classicDarkPalette) };

export const CLASSIC_LIGHT_SEMANTIC_TOKENS = resolveTokenReferences(CLASSIC_LIGHT_CSS_TOKENS);
export const CLASSIC_DARK_SEMANTIC_TOKENS = resolveTokenReferences(CLASSIC_DARK_CSS_TOKENS);
