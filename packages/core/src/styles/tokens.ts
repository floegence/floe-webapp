export type FloeCssVariableName = `--${string}`;
export type FloeResolvedTheme = 'light' | 'dark';

export interface FloeColorToken {
  name: string;
  variable: FloeCssVariableName;
  lightValue: string;
  darkValue: string;
  description: string;
}

export interface FloeColorTokenCategory {
  name: string;
  description: string;
  tokens: readonly FloeColorToken[];
}

export interface FloeTypographyToken {
  name: string;
  size: string;
  lineHeight: string;
  className: string;
  description: string;
}

export interface FloeFontFamilyToken {
  name: string;
  variable: FloeCssVariableName;
  value: string;
  description: string;
}

export interface FloeSpacingToken {
  name: string;
  value: string;
  pixels: string;
  className: string;
}

export interface FloeRadiusToken {
  name: string;
  value: string;
  variable: FloeCssVariableName | '-';
  className: string;
}

export interface FloeMotionToken {
  name: string;
  keyframes: string;
  usage: string;
  description: string;
}

export const floeSharedCssVariables = {
  '--radius': '0.375rem',
  '--font-sans': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  '--font-mono': "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Monaco, Consolas, monospace",
} as const satisfies Record<FloeCssVariableName, string>;

export const floeColorTokenCategories = [
  {
    name: 'Base Colors',
    description: 'Primary application surfaces and text colors.',
    tokens: [
      {
        name: 'Background',
        variable: '--background',
        lightValue: 'hsl(36 15% 93%)',
        darkValue: 'hsl(222 30% 8%)',
        description: 'Main application background color.',
      },
      {
        name: 'Foreground',
        variable: '--foreground',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(210 20% 98%)',
        description: 'Default foreground color for body text.',
      },
      {
        name: 'Primary',
        variable: '--primary',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(210 20% 98%)',
        description: 'Primary interactive color used by buttons and emphasis.',
      },
      {
        name: 'Primary Foreground',
        variable: '--primary-foreground',
        lightValue: 'hsl(0 0% 98%)',
        darkValue: 'hsl(222 30% 10%)',
        description: 'Foreground color used on primary surfaces.',
      },
      {
        name: 'Secondary',
        variable: '--secondary',
        lightValue: 'hsl(36 10% 88%)',
        darkValue: 'hsl(220 25% 14%)',
        description: 'Secondary surface color for lower-emphasis blocks.',
      },
      {
        name: 'Secondary Foreground',
        variable: '--secondary-foreground',
        lightValue: 'hsl(215 30% 26%)',
        darkValue: 'hsl(210 20% 98%)',
        description: 'Foreground color used on secondary surfaces.',
      },
      {
        name: 'Muted',
        variable: '--muted',
        lightValue: 'hsl(36 10% 88%)',
        darkValue: 'hsl(220 25% 14%)',
        description: 'Muted surface color for subtle containers and fills.',
      },
      {
        name: 'Muted Foreground',
        variable: '--muted-foreground',
        lightValue: 'hsl(215 20% 46%)',
        darkValue: 'hsl(215 20% 60%)',
        description: 'Secondary text color for supporting copy.',
      },
      {
        name: 'Accent',
        variable: '--accent',
        lightValue: 'hsl(36 10% 88%)',
        darkValue: 'hsl(220 25% 16%)',
        description: 'Accent surface for hover states and light emphasis.',
      },
      {
        name: 'Accent Foreground',
        variable: '--accent-foreground',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(210 20% 98%)',
        description: 'Foreground color used on accent surfaces.',
      },
    ],
  },
  {
    name: 'Surface Colors',
    description: 'Shared UI surfaces, borders, and focus affordances.',
    tokens: [
      {
        name: 'Card',
        variable: '--card',
        lightValue: 'hsl(36 12% 96%)',
        darkValue: 'hsl(222 28% 10%)',
        description: 'Card background surface.',
      },
      {
        name: 'Card Foreground',
        variable: '--card-foreground',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(210 20% 98%)',
        description: 'Foreground color used on card surfaces.',
      },
      {
        name: 'Popover',
        variable: '--popover',
        lightValue: 'hsl(36 12% 96%)',
        darkValue: 'hsl(222 28% 10%)',
        description: 'Popover and floating panel background.',
      },
      {
        name: 'Popover Foreground',
        variable: '--popover-foreground',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(210 20% 98%)',
        description: 'Foreground color used on popovers.',
      },
      {
        name: 'Border',
        variable: '--border',
        lightValue: 'hsl(36 10% 82%)',
        darkValue: 'hsl(220 20% 18%)',
        description: 'Default border color.',
      },
      {
        name: 'Input',
        variable: '--input',
        lightValue: 'hsl(36 10% 82%)',
        darkValue: 'hsl(220 25% 14%)',
        description: 'Input border color.',
      },
      {
        name: 'Ring',
        variable: '--ring',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(215 25% 70%)',
        description: 'Focus ring color.',
      },
    ],
  },
  {
    name: 'Status Colors',
    description: 'Semantic status colors for feedback and callouts.',
    tokens: [
      {
        name: 'Success',
        variable: '--success',
        lightValue: 'oklch(0.68 0.16 150)',
        darkValue: 'oklch(0.72 0.19 150)',
        description: 'Success state color.',
      },
      {
        name: 'Success Foreground',
        variable: '--success-foreground',
        lightValue: 'hsl(0 0% 100%)',
        darkValue: 'hsl(222 30% 10%)',
        description: 'Foreground color used on success surfaces.',
      },
      {
        name: 'Warning',
        variable: '--warning',
        lightValue: 'oklch(0.78 0.14 80)',
        darkValue: 'oklch(0.82 0.16 80)',
        description: 'Warning state color.',
      },
      {
        name: 'Warning Foreground',
        variable: '--warning-foreground',
        lightValue: 'hsl(240 5% 10%)',
        darkValue: 'hsl(222 30% 10%)',
        description: 'Foreground color used on warning surfaces.',
      },
      {
        name: 'Error',
        variable: '--error',
        lightValue: 'oklch(0.65 0.2 25)',
        darkValue: 'oklch(0.7 0.22 25)',
        description: 'Error state color.',
      },
      {
        name: 'Error Foreground',
        variable: '--error-foreground',
        lightValue: 'hsl(0 0% 100%)',
        darkValue: 'hsl(0 0% 100%)',
        description: 'Foreground color used on error surfaces.',
      },
      {
        name: 'Info',
        variable: '--info',
        lightValue: 'oklch(0.65 0.13 250)',
        darkValue: 'oklch(0.7 0.15 250)',
        description: 'Informational state color.',
      },
      {
        name: 'Info Foreground',
        variable: '--info-foreground',
        lightValue: 'hsl(0 0% 100%)',
        darkValue: 'hsl(0 0% 100%)',
        description: 'Foreground color used on info surfaces.',
      },
    ],
  },
  {
    name: 'Shell Chrome',
    description: 'Stable shell chrome borders that can be overridden through theme.tokens.',
    tokens: [
      {
        name: 'Chrome Border',
        variable: '--chrome-border',
        lightValue: 'var(--border)',
        darkValue: 'var(--border)',
        description: 'Default shared shell divider color.',
      },
      {
        name: 'Top Bar Border',
        variable: '--top-bar-border',
        lightValue: 'var(--chrome-border)',
        darkValue: 'var(--chrome-border)',
        description: 'Top bar divider color.',
      },
      {
        name: 'Activity Bar Border',
        variable: '--activity-bar-border',
        lightValue: 'var(--chrome-border)',
        darkValue: 'var(--chrome-border)',
        description: 'Activity bar divider color.',
      },
      {
        name: 'Bottom Bar Border',
        variable: '--bottom-bar-border',
        lightValue: 'var(--chrome-border)',
        darkValue: 'var(--chrome-border)',
        description: 'Bottom bar divider color.',
      },
      {
        name: 'Terminal Panel Border',
        variable: '--terminal-panel-border',
        lightValue: 'var(--chrome-border)',
        darkValue: 'var(--chrome-border)',
        description: 'Terminal panel divider color.',
      },
    ],
  },
  {
    name: 'Sidebar',
    description: 'Sidebar-specific surfaces and emphasis colors.',
    tokens: [
      {
        name: 'Sidebar',
        variable: '--sidebar',
        lightValue: 'hsl(36 12% 91%)',
        darkValue: 'hsl(222 28% 10%)',
        description: 'Sidebar background.',
      },
      {
        name: 'Sidebar Foreground',
        variable: '--sidebar-foreground',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(210 20% 98%)',
        description: 'Sidebar foreground color.',
      },
      {
        name: 'Sidebar Primary',
        variable: '--sidebar-primary',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(217 80% 55%)',
        description: 'Primary emphasis color inside the sidebar.',
      },
      {
        name: 'Sidebar Primary Foreground',
        variable: '--sidebar-primary-foreground',
        lightValue: 'hsl(0 0% 98%)',
        darkValue: 'hsl(0 0% 100%)',
        description: 'Foreground color used on sidebar primary surfaces.',
      },
      {
        name: 'Sidebar Accent',
        variable: '--sidebar-accent',
        lightValue: 'hsl(36 12% 86%)',
        darkValue: 'hsl(220 25% 16%)',
        description: 'Accent surface used for sidebar hover and active states.',
      },
      {
        name: 'Sidebar Accent Foreground',
        variable: '--sidebar-accent-foreground',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(210 20% 98%)',
        description: 'Foreground color used on sidebar accent surfaces.',
      },
      {
        name: 'Sidebar Border',
        variable: '--sidebar-border',
        lightValue: 'hsl(36 8% 84%)',
        darkValue: 'hsl(220 20% 18%)',
        description: 'Sidebar inner border color.',
      },
      {
        name: 'Sidebar Ring',
        variable: '--sidebar-ring',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(217 80% 55%)',
        description: 'Focus ring color for sidebar elements.',
      },
    ],
  },
  {
    name: 'Activity Bar',
    description: 'Dedicated colors for the compact activity bar.',
    tokens: [
      {
        name: 'Activity Bar',
        variable: '--activity-bar',
        lightValue: 'hsl(36 10% 90%)',
        darkValue: 'hsl(222 30% 9%)',
        description: 'Activity bar background.',
      },
      {
        name: 'Activity Bar Foreground',
        variable: '--activity-bar-foreground',
        lightValue: 'hsl(215 20% 46%)',
        darkValue: 'hsl(215 20% 55%)',
        description: 'Default activity bar icon color.',
      },
      {
        name: 'Activity Bar Foreground Active',
        variable: '--activity-bar-foreground-active',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(210 20% 98%)',
        description: 'Active activity bar icon color.',
      },
      {
        name: 'Activity Bar Badge',
        variable: '--activity-bar-badge',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(217 80% 55%)',
        description: 'Activity bar badge background.',
      },
      {
        name: 'Activity Bar Badge Foreground',
        variable: '--activity-bar-badge-foreground',
        lightValue: 'hsl(0 0% 98%)',
        darkValue: 'hsl(0 0% 100%)',
        description: 'Activity bar badge foreground.',
      },
    ],
  },
  {
    name: 'Terminal',
    description: 'Terminal-specific background and text colors.',
    tokens: [
      {
        name: 'Terminal Background',
        variable: '--terminal-background',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(222 32% 7%)',
        description: 'Integrated terminal background.',
      },
      {
        name: 'Terminal Foreground',
        variable: '--terminal-foreground',
        lightValue: 'hsl(0 0% 92%)',
        darkValue: 'hsl(210 15% 92%)',
        description: 'Integrated terminal foreground color.',
      },
    ],
  },
  {
    name: 'Charts',
    description: 'Default chart palette used by data visualization components.',
    tokens: [
      {
        name: 'Chart 1',
        variable: '--chart-1',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(210 20% 98%)',
        description: 'Primary chart series color.',
      },
      {
        name: 'Chart 2',
        variable: '--chart-2',
        lightValue: 'hsl(36 15% 60%)',
        darkValue: 'hsl(215 20% 60%)',
        description: 'Secondary chart series color.',
      },
      {
        name: 'Chart 3',
        variable: '--chart-3',
        lightValue: 'oklch(0.65 0.13 250)',
        darkValue: 'oklch(0.7 0.15 250)',
        description: 'Tertiary chart series color.',
      },
      {
        name: 'Chart 4',
        variable: '--chart-4',
        lightValue: 'oklch(0.68 0.16 150)',
        darkValue: 'oklch(0.72 0.19 150)',
        description: 'Quaternary chart series color.',
      },
      {
        name: 'Chart 5',
        variable: '--chart-5',
        lightValue: 'oklch(0.78 0.14 80)',
        darkValue: 'oklch(0.82 0.16 80)',
        description: 'Quinary chart series color.',
      },
    ],
  },
  {
    name: 'Selection',
    description: 'Text selection colors for general content, primary surfaces, and code.',
    tokens: [
      {
        name: 'Selection Background',
        variable: '--selection-bg',
        lightValue: 'hsl(215 80% 55%)',
        darkValue: 'hsl(215 70% 50%)',
        description: 'Default text selection background.',
      },
      {
        name: 'Selection Foreground',
        variable: '--selection-fg',
        lightValue: 'hsl(0 0% 100%)',
        darkValue: 'hsl(0 0% 100%)',
        description: 'Default text selection foreground.',
      },
      {
        name: 'Selection On Primary Background',
        variable: '--selection-on-primary-bg',
        lightValue: 'hsl(45 100% 55%)',
        darkValue: 'hsl(215 80% 35%)',
        description: 'Selection background for text rendered on primary surfaces.',
      },
      {
        name: 'Selection On Primary Foreground',
        variable: '--selection-on-primary-fg',
        lightValue: 'hsl(0 0% 0%)',
        darkValue: 'hsl(0 0% 100%)',
        description: 'Selection foreground for text rendered on primary surfaces.',
      },
      {
        name: 'Code Selection Background',
        variable: '--selection-code-bg',
        lightValue: 'hsl(212 100% 67%)',
        darkValue: 'hsl(212 100% 67%)',
        description: 'Selection background for code surfaces.',
      },
      {
        name: 'Code Selection Foreground',
        variable: '--selection-code-fg',
        lightValue: 'hsl(220 20% 8%)',
        darkValue: 'hsl(220 20% 8%)',
        description: 'Selection foreground for code surfaces.',
      },
    ],
  },
] as const satisfies readonly FloeColorTokenCategory[];

export const floeTypographyTokens = [
  { name: 'Text XS', size: '11px', lineHeight: '1.5', className: 'text-[11px]', description: 'Smallest text, captions and labels.' },
  { name: 'Text SM', size: '12px', lineHeight: '1.5', className: 'text-xs', description: 'Small text, secondary content.' },
  { name: 'Text Base', size: '14px', lineHeight: '1.5', className: 'text-sm', description: 'Default body text.' },
  { name: 'Text LG', size: '16px', lineHeight: '1.5', className: 'text-base', description: 'Larger body text and card titles.' },
  { name: 'Text XL', size: '18px', lineHeight: '1.4', className: 'text-lg', description: 'Section titles.' },
  { name: 'Text 2XL', size: '20px', lineHeight: '1.3', className: 'text-xl', description: 'Page titles.' },
] as const satisfies readonly FloeTypographyToken[];

export const floeFontFamilyTokens = [
  {
    name: 'Sans',
    variable: '--font-sans',
    value: floeSharedCssVariables['--font-sans'],
    description: 'Default UI font family for application chrome and content.',
  },
  {
    name: 'Mono',
    variable: '--font-mono',
    value: floeSharedCssVariables['--font-mono'],
    description: 'Monospace font family for code, terminal, and diagnostics.',
  },
] as const satisfies readonly FloeFontFamilyToken[];

export const floeSpacingTokens = [
  { name: '0.5', value: '0.125rem', pixels: '2px', className: 'gap-0.5, p-0.5' },
  { name: '1', value: '0.25rem', pixels: '4px', className: 'gap-1, p-1' },
  { name: '1.5', value: '0.375rem', pixels: '6px', className: 'gap-1.5, p-1.5' },
  { name: '2', value: '0.5rem', pixels: '8px', className: 'gap-2, p-2' },
  { name: '2.5', value: '0.625rem', pixels: '10px', className: 'gap-2.5, p-2.5' },
  { name: '3', value: '0.75rem', pixels: '12px', className: 'gap-3, p-3' },
  { name: '4', value: '1rem', pixels: '16px', className: 'gap-4, p-4' },
  { name: '5', value: '1.25rem', pixels: '20px', className: 'gap-5, p-5' },
  { name: '6', value: '1.5rem', pixels: '24px', className: 'gap-6, p-6' },
  { name: '8', value: '2rem', pixels: '32px', className: 'gap-8, p-8' },
] as const satisfies readonly FloeSpacingToken[];

export const floeRadiusTokens = [
  { name: 'None', value: '0', variable: '-', className: 'rounded-none' },
  { name: 'SM', value: '0.125rem', variable: '-', className: 'rounded-sm' },
  { name: 'Default', value: floeSharedCssVariables['--radius'], variable: '--radius', className: 'rounded' },
  { name: 'MD', value: '0.5rem', variable: '-', className: 'rounded-md' },
  { name: 'LG', value: '0.75rem', variable: '-', className: 'rounded-lg' },
  { name: 'XL', value: '1rem', variable: '-', className: 'rounded-xl' },
  { name: '2XL', value: '1.5rem', variable: '-', className: 'rounded-2xl' },
  { name: 'Full', value: '9999px', variable: '-', className: 'rounded-full' },
] as const satisfies readonly FloeRadiusToken[];

export const floeMotionTokens = [
  {
    name: 'Fade In',
    keyframes: 'animate-in',
    usage: 'animate-in fade-in',
    description: 'Smooth opacity transition for appearing elements.',
  },
  {
    name: 'Zoom In',
    keyframes: 'animate-in',
    usage: 'animate-in zoom-in-95',
    description: 'Scale up from 95% with opacity for dialogs and popovers.',
  },
  {
    name: 'Slide In',
    keyframes: 'animate-in',
    usage: 'animate-in slide-in-from-top-2',
    description: 'Slide down motion for menus and lightweight surfaces.',
  },
  {
    name: 'Gradient Shift',
    keyframes: 'gradient-shift',
    usage: 'AnimatedBorderCard',
    description: 'Rotating gradient animation used by rich card treatments.',
  },
  {
    name: 'Shimmer',
    keyframes: 'shimmer',
    usage: 'Card shimmer / skeleton-like highlights',
    description: 'Linear sweeping highlight animation.',
  },
  {
    name: 'Glow Pulse',
    keyframes: 'glow-pulse',
    usage: 'Neon and emphasis effects',
    description: 'Pulsing glow animation for elevated emphasis.',
  },
] as const satisfies readonly FloeMotionToken[];

const floeColorTokens: readonly FloeColorToken[] = floeColorTokenCategories.reduce<FloeColorToken[]>(
  (tokens, category) => {
    tokens.push(...category.tokens);
    return tokens;
  },
  []
);

function buildThemeVariableMap(theme: FloeResolvedTheme): Record<FloeCssVariableName, string> {
  return Object.fromEntries(
    floeColorTokens.map((token) => [token.variable, theme === 'light' ? token.lightValue : token.darkValue])
  ) as Record<FloeCssVariableName, string>;
}

export const floeThemeColorVariables = {
  light: buildThemeVariableMap('light'),
  dark: buildThemeVariableMap('dark'),
} as const satisfies Record<FloeResolvedTheme, Record<FloeCssVariableName, string>>;

export function getFloeColorTokenValue(
  variable: FloeCssVariableName,
  theme: FloeResolvedTheme
): string | undefined {
  return floeThemeColorVariables[theme][variable];
}

export const floeDesignTokens = {
  colors: floeColorTokenCategories,
  typography: floeTypographyTokens,
  fonts: floeFontFamilyTokens,
  spacing: floeSpacingTokens,
  radius: floeRadiusTokens,
  motion: floeMotionTokens,
  shared: floeSharedCssVariables,
} as const;
