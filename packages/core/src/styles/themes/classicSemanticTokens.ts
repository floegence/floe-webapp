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

const CLASSIC_LIGHT_CSS_TOKENS = {
  '--background': 'hsl(34 24% 94%)', '--foreground': 'hsl(214 26% 17%)',
  '--primary': 'hsl(214 26% 17%)', '--primary-foreground': 'hsl(36 100% 99%)',
  '--secondary': 'hsl(36 15% 94%)', '--secondary-foreground': 'hsl(214 25% 25%)',
  '--muted': 'hsl(36 15% 94%)', '--muted-foreground': 'hsl(215 16% 42%)',
  '--accent': 'hsl(34 11% 88%)', '--accent-foreground': 'hsl(214 26% 17%)',
  '--border': 'hsl(35 13% 82%)', '--input': 'hsl(37 15% 76%)',
  '--ring': 'hsl(214 26% 17%)', '--chrome-border': 'hsl(33 11% 84%)',
  '--top-bar-border': 'var(--chrome-border)', '--activity-bar-border': 'var(--chrome-border)',
  '--bottom-bar-border': 'var(--chrome-border)', '--terminal-panel-border': 'var(--chrome-border)',
  '--card': 'hsl(36 100% 99%)', '--card-foreground': 'hsl(214 26% 17%)',
  '--popover': 'hsl(36 100% 99%)', '--popover-foreground': 'hsl(214 26% 17%)',
  '--success': 'oklch(0.68 0.16 150)', '--success-foreground': 'hsl(0 0% 100%)',
  '--warning': 'hsl(38 92% 50%)', '--warning-foreground': 'hsl(214 26% 17%)',
  '--error': 'oklch(0.65 0.2 25)', '--error-foreground': 'hsl(0 0% 100%)',
  '--info': 'hsl(217 91% 60%)', '--info-foreground': 'hsl(0 0% 100%)',
  '--highlight-block-info-accent': 'oklch(0.52 0.14 245)',
  '--highlight-block-warning-accent': 'oklch(0.62 0.16 65)',
  '--highlight-block-success-accent': 'oklch(0.55 0.14 155)',
  '--highlight-block-error-accent': 'oklch(0.55 0.16 25)',
  '--highlight-block-note-accent': 'oklch(0.52 0.16 285)',
  '--highlight-block-tip-accent': 'oklch(0.52 0.12 175)',
  '--sidebar': 'hsl(36 13% 92%)', '--sidebar-foreground': 'hsl(214 26% 17%)',
  '--sidebar-primary': 'hsl(214 26% 17%)', '--sidebar-primary-foreground': 'hsl(36 100% 99%)',
  '--sidebar-accent': 'hsl(34 11% 88%)', '--sidebar-accent-foreground': 'hsl(214 26% 17%)',
  '--sidebar-border': 'hsl(33 11% 84%)', '--sidebar-ring': 'hsl(214 26% 17%)',
  '--activity-bar': 'hsl(36 13% 92%)', '--activity-bar-foreground': 'hsl(215 16% 42%)',
  '--activity-bar-foreground-active': 'hsl(214 26% 17%)',
  '--activity-bar-badge': 'hsl(214 26% 17%)',
  '--activity-bar-badge-foreground': 'hsl(36 100% 99%)',
  '--terminal-background': 'hsl(214 26% 17%)', '--terminal-foreground': 'hsl(0 0% 92%)',
  '--chart-1': 'hsl(214 26% 17%)', '--chart-2': 'hsl(215 16% 42%)',
  '--chart-3': 'hsl(217 91% 60%)', '--chart-4': 'oklch(0.68 0.16 150)',
  '--chart-5': 'hsl(38 92% 50%)', '--selection-bg': 'hsl(217 91% 60%)',
  '--selection-fg': 'hsl(0 0% 100%)', '--selection-on-primary-bg': 'hsl(38 92% 50%)',
  '--selection-on-primary-fg': 'hsl(214 26% 17%)',
  '--selection-code-bg': 'hsl(212 100% 67%)', '--selection-code-fg': 'hsl(220 20% 8%)',
} as const satisfies FloeThemeTokenMap;

const CLASSIC_DARK_CSS_TOKENS = {
  '--background': 'hsl(222 30% 8%)', '--foreground': 'hsl(210 20% 98%)',
  '--primary': 'hsl(210 20% 98%)', '--primary-foreground': 'hsl(222 30% 10%)',
  '--secondary': 'hsl(220 25% 14%)', '--secondary-foreground': 'hsl(210 20% 98%)',
  '--muted': 'hsl(220 25% 14%)', '--muted-foreground': 'hsl(215 20% 60%)',
  '--accent': 'hsl(220 25% 16%)', '--accent-foreground': 'hsl(210 20% 98%)',
  '--border': 'hsl(220 20% 18%)', '--input': 'hsl(220 25% 14%)',
  '--ring': 'hsl(215 25% 70%)', '--chrome-border': 'var(--border)',
  '--top-bar-border': 'var(--chrome-border)', '--activity-bar-border': 'var(--chrome-border)',
  '--bottom-bar-border': 'var(--chrome-border)', '--terminal-panel-border': 'var(--chrome-border)',
  '--card': 'hsl(222 28% 10%)', '--card-foreground': 'hsl(210 20% 98%)',
  '--popover': 'hsl(222 28% 10%)', '--popover-foreground': 'hsl(210 20% 98%)',
  '--success': 'oklch(0.72 0.19 150)', '--success-foreground': 'hsl(222 30% 10%)',
  '--warning': 'oklch(0.82 0.16 80)', '--warning-foreground': 'hsl(222 30% 10%)',
  '--error': 'oklch(0.7 0.22 25)', '--error-foreground': 'hsl(0 0% 100%)',
  '--info': 'oklch(0.7 0.15 250)', '--info-foreground': 'hsl(0 0% 100%)',
  '--highlight-block-info-accent': 'oklch(0.62 0.12 240)',
  '--highlight-block-warning-accent': 'oklch(0.7 0.14 65)',
  '--highlight-block-success-accent': 'oklch(0.62 0.12 155)',
  '--highlight-block-error-accent': 'oklch(0.6 0.14 25)',
  '--highlight-block-note-accent': 'oklch(0.62 0.14 285)',
  '--highlight-block-tip-accent': 'oklch(0.6 0.1 175)',
  '--sidebar': 'hsl(222 28% 10%)', '--sidebar-foreground': 'hsl(210 20% 98%)',
  '--sidebar-primary': 'hsl(217 80% 55%)', '--sidebar-primary-foreground': 'hsl(0 0% 100%)',
  '--sidebar-accent': 'hsl(220 25% 16%)', '--sidebar-accent-foreground': 'hsl(210 20% 98%)',
  '--sidebar-border': 'hsl(220 20% 18%)', '--sidebar-ring': 'hsl(217 80% 55%)',
  '--activity-bar': 'hsl(222 30% 9%)', '--activity-bar-foreground': 'hsl(215 20% 55%)',
  '--activity-bar-foreground-active': 'hsl(210 20% 98%)',
  '--activity-bar-badge': 'hsl(217 80% 55%)',
  '--activity-bar-badge-foreground': 'hsl(0 0% 100%)',
  '--terminal-background': 'hsl(222 32% 7%)', '--terminal-foreground': 'hsl(210 15% 92%)',
  '--chart-1': 'hsl(210 20% 98%)', '--chart-2': 'hsl(215 20% 60%)',
  '--chart-3': 'oklch(0.7 0.15 250)', '--chart-4': 'oklch(0.72 0.19 150)',
  '--chart-5': 'oklch(0.82 0.16 80)', '--selection-bg': 'hsl(215 70% 50%)',
  '--selection-fg': 'hsl(0 0% 100%)', '--selection-on-primary-bg': 'hsl(215 80% 35%)',
  '--selection-on-primary-fg': 'hsl(0 0% 100%)',
  '--selection-code-bg': 'hsl(212 100% 67%)', '--selection-code-fg': 'hsl(220 20% 8%)',
} as const satisfies FloeThemeTokenMap;

export const CLASSIC_LIGHT_SEMANTIC_TOKENS = resolveTokenReferences(CLASSIC_LIGHT_CSS_TOKENS);
export const CLASSIC_DARK_SEMANTIC_TOKENS = resolveTokenReferences(CLASSIC_DARK_CSS_TOKENS);
