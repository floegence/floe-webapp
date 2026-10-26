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

/* Paper Light: a warm, low-chroma canvas so white content planes read as
 * separate physical sheets. Ink never reaches black; jade is the only
 * chromatic voice and appears on focus, selection and positive state. */
const classicLightPalette = {
  ...LIGHT_WINDOW_TOKENS,
  '--floe-window-background': 'var(--popover)',
  '--floe-window-titlebar-background': 'var(--popover)',
  '--background': '#f6f4ef', '--foreground': '#1a1b19',
  '--inline-code-foreground': '#1c6b57', '--inline-code-background': '#eeebe4',
  '--primary': '#1c1d1b', '--primary-foreground': '#fbfaf7',
  '--secondary': '#edeae3', '--secondary-foreground': '#4a4b46',
  '--muted': '#efede7', '--muted-foreground': '#6b6a64',
  /* One step below --muted, never two: the choice face also carries the
   * auxiliary ink, so it has to stay above 4.5:1 against it. */
  '--accent': '#eeebe4', '--accent-foreground': '#1a1b19',
  '--border': '#e4e1d9', '--input': '#c9c6bd',
  '--ring': '#2f7d63', '--chrome-border': '#eeebe4',
  '--top-bar-border': 'var(--chrome-border)', '--activity-bar-border': 'var(--chrome-border)',
  '--bottom-bar-border': 'var(--chrome-border)', '--terminal-panel-border': 'var(--chrome-border)',
  '--card': '#fefdfb', '--card-foreground': '#1a1b19',
  '--popover': '#fffefc', '--popover-foreground': '#1a1b19',
  '--success': '#227a50', '--success-foreground': '#ffffff',
  '--warning': '#8f5c0d', '--warning-foreground': '#ffffff',
  '--error': '#b8352c', '--error-foreground': '#ffffff',
  '--info': '#2a5f9e', '--info-foreground': '#ffffff',
  '--highlight-block-info-accent': 'oklch(0.52 0.13 250)',
  '--highlight-block-warning-accent': 'oklch(0.64 0.13 72)',
  '--highlight-block-success-accent': 'oklch(0.55 0.12 160)',
  '--highlight-block-error-accent': 'oklch(0.55 0.17 27)',
  '--highlight-block-note-accent': 'oklch(0.53 0.15 292)',
  '--highlight-block-tip-accent': 'oklch(0.56 0.09 195)',
  '--sidebar': '#f1efe9', '--sidebar-foreground': '#1a1b19',
  '--sidebar-primary': '#1c1d1b', '--sidebar-primary-foreground': '#fbfaf7',
  '--sidebar-accent': '#eeebe4', '--sidebar-accent-foreground': '#1a1b19',
  '--sidebar-border': '#e8e5dd', '--sidebar-ring': '#2f7d63',
  '--activity-bar': '#edeae3', '--activity-bar-foreground': '#5f5f58',
  '--activity-bar-foreground-active': '#1a1b19',
  '--activity-bar-badge': '#1c1d1b',
  '--activity-bar-badge-foreground': '#fbfaf7',
  '--terminal-background': '#16171a', '--terminal-foreground': '#e9e7e2',
  '--chart-1': '#2f7d63', '--chart-2': '#5f5f58', '--chart-3': '#8f5c0d',
  '--chart-4': '#b8352c', '--chart-5': '#2a5f9e',
  '--selection-bg': '#cde7db', '--selection-fg': '#10211b',
  '--selection-on-primary-bg': '#6fd0a8', '--selection-on-primary-fg': '#082016',
  '--selection-code-bg': '#bcded0', '--selection-code-fg': '#0c1f18',
  '--glow': '#2f7d63',
} as const satisfies FloeThemeTokenMap;

/* Ink Dark: the canvas is the deepest step and every plane above it is a thin
 * warm-grey lift. Lines are almost invisible by design; separation comes from
 * fill. Jade brightens to stay legible on near-black. */
const classicDarkPalette = {
  ...DARK_WINDOW_TOKENS,
  '--floe-window-background': 'var(--popover)',
  '--floe-window-titlebar-background': 'var(--popover)',
  '--background': '#0d0e0d', '--foreground': '#e9e8e3',
  '--inline-code-foreground': '#5fd6a8', '--inline-code-background': '#17201c',
  '--primary': '#e9e8e3', '--primary-foreground': '#101110',
  '--secondary': '#1e1f1e', '--secondary-foreground': '#c3c4be',
  '--muted': '#1b1c1b', '--muted-foreground': '#93948d',
  '--accent': '#242524', '--accent-foreground': '#e9e8e3',
  '--border': '#262726', '--input': '#3b3c3a',
  '--ring': '#62b898', '--chrome-border': '#1a1b1a',
  '--top-bar-border': 'var(--chrome-border)', '--activity-bar-border': 'var(--chrome-border)',
  '--bottom-bar-border': 'var(--chrome-border)', '--terminal-panel-border': 'var(--chrome-border)',
  '--card': '#161716', '--card-foreground': '#e9e8e3',
  '--popover': '#1a1b1a', '--popover-foreground': '#e9e8e3',
  '--success': '#62bf93', '--success-foreground': '#07200f',
  '--warning': '#d9ac5f', '--warning-foreground': '#1d1607',
  '--error': '#e8756b', '--error-foreground': '#210907',
  '--info': '#79a9e6', '--info-foreground': '#061322',
  '--highlight-block-info-accent': 'oklch(0.7 0.12 248)',
  '--highlight-block-warning-accent': 'oklch(0.78 0.12 76)',
  '--highlight-block-success-accent': 'oklch(0.74 0.12 160)',
  '--highlight-block-error-accent': 'oklch(0.68 0.17 25)',
  '--highlight-block-note-accent': 'oklch(0.7 0.14 292)',
  '--highlight-block-tip-accent': 'oklch(0.7 0.09 192)',
  '--sidebar': '#111211', '--sidebar-foreground': '#e9e8e3',
  '--sidebar-primary': '#e9e8e3', '--sidebar-primary-foreground': '#101110',
  '--sidebar-accent': '#242524', '--sidebar-accent-foreground': '#e9e8e3',
  '--sidebar-border': '#202120', '--sidebar-ring': '#62b898',
  '--activity-bar': '#0a0b0a', '--activity-bar-foreground': '#8c8d86',
  '--activity-bar-foreground-active': '#e9e8e3',
  '--activity-bar-badge': '#62b898',
  '--activity-bar-badge-foreground': '#07200f',
  '--terminal-background': '#080908', '--terminal-foreground': '#e2e1dc',
  '--chart-1': '#62b898', '--chart-2': '#93948d', '--chart-3': '#d9ac5f',
  '--chart-4': '#e8756b', '--chart-5': '#79a9e6',
  '--selection-bg': '#1f4a3a', '--selection-fg': '#eafaf2',
  '--selection-on-primary-bg': '#62b898', '--selection-on-primary-fg': '#07200f',
  '--selection-code-bg': '#2c6350', '--selection-code-fg': '#eafaf2',
  '--glow': '#62b898',
} as const satisfies FloeThemeTokenMap;

export const CLASSIC_LIGHT_CSS_TOKENS = { ...classicLightPalette, ...createProgressTokens('light', classicLightPalette) };
export const CLASSIC_DARK_CSS_TOKENS = { ...classicDarkPalette, ...createProgressTokens('dark', classicDarkPalette) };

export const CLASSIC_LIGHT_SEMANTIC_TOKENS = resolveTokenReferences(CLASSIC_LIGHT_CSS_TOKENS);
export const CLASSIC_DARK_SEMANTIC_TOKENS = resolveTokenReferences(CLASSIC_DARK_CSS_TOKENS);
