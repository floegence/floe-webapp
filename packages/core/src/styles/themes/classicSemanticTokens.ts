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

/* Refined Light: quiet paper canvas, near-white cards and ink controls.
 * Surfaces step by a few percent only, so grouping comes from radius and space
 * rather than from heavy borders. Mint is reserved for positive emphasis. */
const classicLightPalette = {
  ...LIGHT_WINDOW_TOKENS,
  '--floe-window-background': 'var(--popover)',
  '--floe-window-titlebar-background': 'var(--popover)',
  '--background': '#fafaf8', '--foreground': '#191a1b',
  '--inline-code-foreground': '#0a67c2', '--inline-code-background': '#edede8',
  '--primary': '#17181a', '--primary-foreground': '#fdfdfb',
  '--secondary': '#f3f3ee', '--secondary-foreground': '#4e4f4b',
  '--muted': '#f1f1ec', '--muted-foreground': '#676862',
  '--accent': '#ecece6', '--accent-foreground': '#191a1b',
  '--border': '#e5e5de', '--input': '#b7b8b0',
  '--ring': '#2f302e', '--chrome-border': '#ecece6',
  '--top-bar-border': 'var(--chrome-border)', '--activity-bar-border': 'var(--chrome-border)',
  '--bottom-bar-border': 'var(--chrome-border)', '--terminal-panel-border': 'var(--chrome-border)',
  '--card': '#ffffff', '--card-foreground': '#191a1b',
  '--popover': '#ffffff', '--popover-foreground': '#191a1b',
  '--success': '#1f9d55', '--success-foreground': '#ffffff',
  '--warning': '#b7791f', '--warning-foreground': '#ffffff',
  '--error': '#c4342b', '--error-foreground': '#ffffff',
  '--info': '#2563eb', '--info-foreground': '#ffffff',
  '--highlight-block-info-accent': 'oklch(0.55 0.15 255)',
  '--highlight-block-warning-accent': 'oklch(0.68 0.14 70)',
  '--highlight-block-success-accent': 'oklch(0.62 0.14 155)',
  '--highlight-block-error-accent': 'oklch(0.58 0.18 25)',
  '--highlight-block-note-accent': 'oklch(0.55 0.16 290)',
  '--highlight-block-tip-accent': 'oklch(0.6 0.11 190)',
  '--sidebar': '#f4f4ef', '--sidebar-foreground': '#191a1b',
  '--sidebar-primary': '#17181a', '--sidebar-primary-foreground': '#fdfdfb',
  '--sidebar-accent': '#ecece6', '--sidebar-accent-foreground': '#191a1b',
  '--sidebar-border': '#ecece6', '--sidebar-ring': '#2f302e',
  '--activity-bar': '#f0f0ea', '--activity-bar-foreground': '#6c6d68',
  '--activity-bar-foreground-active': '#191a1b',
  '--activity-bar-badge': '#17181a',
  '--activity-bar-badge-foreground': '#fdfdfb',
  '--terminal-background': '#17181a', '--terminal-foreground': '#ecece8',
  '--chart-1': '#191a1b', '--chart-2': '#6c6d68', '--chart-3': '#2563eb',
  '--chart-4': '#1f9d55', '--chart-5': '#c98a12',
  '--selection-bg': '#cfe0ff', '--selection-fg': '#101723',
  '--selection-on-primary-bg': '#4ade80', '--selection-on-primary-fg': '#08210f',
  '--selection-code-bg': '#bcd7ff', '--selection-code-fg': '#0d1726',
  '--glow': '#17181a',
} as const satisfies FloeThemeTokenMap;

/* Refined Dark: a near-black canvas with surfaces that step up in one thin
 * layer at a time. Borders stay hairline; mint carries positive state and
 * selection, so the palette reads calm until something needs attention. */
const classicDarkPalette = {
  ...DARK_WINDOW_TOKENS,
  '--floe-window-background': 'var(--popover)',
  '--floe-window-titlebar-background': 'var(--popover)',
  '--background': '#0b0b0c', '--foreground': '#ececee',
  '--inline-code-foreground': '#7dd3fc', '--inline-code-background': '#151b1e',
  '--primary': '#f2f2f3', '--primary-foreground': '#0e0e10',
  '--secondary': '#1f1f22', '--secondary-foreground': '#c8c8cc',
  '--muted': '#1c1c1f', '--muted-foreground': '#8b8b90',
  '--accent': '#232326', '--accent-foreground': '#ececee',
  '--border': '#26262a', '--input': '#4a4a50',
  '--ring': '#c9c9ce', '--chrome-border': '#1a1a1d',
  '--top-bar-border': 'var(--chrome-border)', '--activity-bar-border': 'var(--chrome-border)',
  '--bottom-bar-border': 'var(--chrome-border)', '--terminal-panel-border': 'var(--chrome-border)',
  '--card': '#141416', '--card-foreground': '#ececee',
  '--popover': '#17171a', '--popover-foreground': '#ececee',
  '--success': '#4ade80', '--success-foreground': '#08210f',
  '--warning': '#e0b155', '--warning-foreground': '#1c1608',
  '--error': '#f2555a', '--error-foreground': '#1b0a0b',
  '--info': '#6aa8ff', '--info-foreground': '#08131f',
  '--highlight-block-info-accent': 'oklch(0.68 0.13 245)',
  '--highlight-block-warning-accent': 'oklch(0.78 0.13 75)',
  '--highlight-block-success-accent': 'oklch(0.74 0.16 155)',
  '--highlight-block-error-accent': 'oklch(0.68 0.18 22)',
  '--highlight-block-note-accent': 'oklch(0.7 0.15 290)',
  '--highlight-block-tip-accent': 'oklch(0.7 0.1 185)',
  '--sidebar': '#0e0e10', '--sidebar-foreground': '#ececee',
  '--sidebar-primary': '#f2f2f3', '--sidebar-primary-foreground': '#0e0e10',
  '--sidebar-accent': '#1f1f22', '--sidebar-accent-foreground': '#ececee',
  '--sidebar-border': '#1c1c1f', '--sidebar-ring': '#c9c9ce',
  '--activity-bar': '#0a0a0b', '--activity-bar-foreground': '#8b8b90',
  '--activity-bar-foreground-active': '#ececee',
  '--activity-bar-badge': '#4ade80',
  '--activity-bar-badge-foreground': '#08210f',
  '--terminal-background': '#08080a', '--terminal-foreground': '#e4e4e6',
  '--chart-1': '#f2f2f3', '--chart-2': '#8b8b90', '--chart-3': '#6aa8ff',
  '--chart-4': '#4ade80', '--chart-5': '#e0b155',
  '--selection-bg': '#2f5fa8', '--selection-fg': '#f7fbff',
  '--selection-on-primary-bg': '#4ade80', '--selection-on-primary-fg': '#08210f',
  '--selection-code-bg': '#3f7ad6', '--selection-code-fg': '#06121f',
  '--glow': 'hsl(160 70% 45%)',
} as const satisfies FloeThemeTokenMap;

export const CLASSIC_LIGHT_CSS_TOKENS = { ...classicLightPalette, ...createProgressTokens('light', classicLightPalette) };
export const CLASSIC_DARK_CSS_TOKENS = { ...classicDarkPalette, ...createProgressTokens('dark', classicDarkPalette) };

export const CLASSIC_LIGHT_SEMANTIC_TOKENS = resolveTokenReferences(CLASSIC_LIGHT_CSS_TOKENS);
export const CLASSIC_DARK_SEMANTIC_TOKENS = resolveTokenReferences(CLASSIC_DARK_CSS_TOKENS);
