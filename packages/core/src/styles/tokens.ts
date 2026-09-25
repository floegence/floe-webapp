import { CLASSIC_LIGHT_SEMANTIC_TOKENS, CLASSIC_DARK_SEMANTIC_TOKENS } from './themes/classicSemanticTokens';

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
  '--floe-type-caption': '0.6875rem',
  '--floe-type-supporting': '0.75rem',
  '--floe-type-control': '0.75rem',
  '--floe-type-body': '0.75rem',
  '--floe-type-heading': '1rem',
  '--floe-line-control': '1.125rem',
  '--floe-line-body': '1.25rem',
  '--floe-control-height-sm': '1.75rem',
  '--floe-control-height-md': '2rem',
  '--floe-row-height': '1.75rem',
  '--floe-space-1': '0.25rem',
  '--floe-space-2': '0.5rem',
  '--floe-space-3': '0.75rem',
  '--floe-space-4': '1rem',
  '--floe-space-6': '1.5rem',
  '--floe-radius-control': '0.375rem',
  '--floe-radius-group': '0.5rem',
  '--floe-radius-floating': '12px',
} as const satisfies Record<FloeCssVariableName, string>;

export const floeColorTokenCategories = [
  {
    name: 'Base Colors',
    description: 'Primary application surfaces and text colors.',
    tokens: [
      {
        name: 'Background',
        variable: '--background',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--background']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--background']!,
        description: 'Main application background color.',
      },
      {
        name: 'Foreground',
        variable: '--foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--foreground']!,
        description: 'Default foreground color for body text.',
      },
      {
        name: 'Primary',
        variable: '--primary',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--primary']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--primary']!,
        description: 'Primary interactive color used by buttons and emphasis.',
      },
      {
        name: 'Primary Foreground',
        variable: '--primary-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--primary-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--primary-foreground']!,
        description: 'Foreground color used on primary surfaces.',
      },
      {
        name: 'Secondary',
        variable: '--secondary',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--secondary']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--secondary']!,
        description: 'Secondary surface color for lower-emphasis blocks.',
      },
      {
        name: 'Secondary Foreground',
        variable: '--secondary-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--secondary-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--secondary-foreground']!,
        description: 'Foreground color used on secondary surfaces.',
      },
      {
        name: 'Muted',
        variable: '--muted',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--muted']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--muted']!,
        description: 'Muted surface color for subtle containers and fills.',
      },
      {
        name: 'Muted Foreground',
        variable: '--muted-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--muted-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--muted-foreground']!,
        description: 'Secondary text color for supporting copy.',
      },
      {
        name: 'Accent',
        variable: '--accent',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--accent']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--accent']!,
        description: 'Accent surface for hover states and light emphasis.',
      },
      {
        name: 'Accent Foreground',
        variable: '--accent-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--accent-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--accent-foreground']!,
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
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--card']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--card']!,
        description: 'Card background surface.',
      },
      {
        name: 'Card Foreground',
        variable: '--card-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--card-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--card-foreground']!,
        description: 'Foreground color used on card surfaces.',
      },
      {
        name: 'Popover',
        variable: '--popover',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--popover']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--popover']!,
        description: 'Popover and floating panel background.',
      },
      {
        name: 'Popover Foreground',
        variable: '--popover-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--popover-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--popover-foreground']!,
        description: 'Foreground color used on popovers.',
      },
      {
        name: 'Border',
        variable: '--border',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--border']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--border']!,
        description: 'Default border color.',
      },
      {
        name: 'Input',
        variable: '--input',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--input']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--input']!,
        description: 'Input border color.',
      },
      {
        name: 'Ring',
        variable: '--ring',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--ring']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--ring']!,
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
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--success']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--success']!,
        description: 'Success state color.',
      },
      {
        name: 'Success Foreground',
        variable: '--success-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--success-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--success-foreground']!,
        description: 'Foreground color used on success surfaces.',
      },
      {
        name: 'Warning',
        variable: '--warning',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--warning']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--warning']!,
        description: 'Warning state color.',
      },
      {
        name: 'Warning Foreground',
        variable: '--warning-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--warning-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--warning-foreground']!,
        description: 'Foreground color used on warning surfaces.',
      },
      {
        name: 'Error',
        variable: '--error',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--error']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--error']!,
        description: 'Error state color.',
      },
      {
        name: 'Error Foreground',
        variable: '--error-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--error-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--error-foreground']!,
        description: 'Foreground color used on error surfaces.',
      },
      {
        name: 'Info',
        variable: '--info',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--info']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--info']!,
        description: 'Informational state color.',
      },
      {
        name: 'Info Foreground',
        variable: '--info-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--info-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--info-foreground']!,
        description: 'Foreground color used on info surfaces.',
      },
    ],
  },
  {
    name: 'Highlight Blocks',
    description: 'Dedicated accent colors for HighlightBlock variants so callouts can diverge from shared status tokens.',
    tokens: [
      {
        name: 'Highlight Block Info Accent',
        variable: '--highlight-block-info-accent',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--highlight-block-info-accent']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--highlight-block-info-accent']!,
        description: 'Info accent used by HighlightBlock surfaces and borders.',
      },
      {
        name: 'Highlight Block Warning Accent',
        variable: '--highlight-block-warning-accent',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--highlight-block-warning-accent']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--highlight-block-warning-accent']!,
        description: 'Warning accent used by HighlightBlock surfaces and borders.',
      },
      {
        name: 'Highlight Block Success Accent',
        variable: '--highlight-block-success-accent',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--highlight-block-success-accent']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--highlight-block-success-accent']!,
        description: 'Success accent used by HighlightBlock surfaces and borders.',
      },
      {
        name: 'Highlight Block Error Accent',
        variable: '--highlight-block-error-accent',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--highlight-block-error-accent']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--highlight-block-error-accent']!,
        description: 'Error accent used by HighlightBlock surfaces and borders.',
      },
      {
        name: 'Highlight Block Note Accent',
        variable: '--highlight-block-note-accent',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--highlight-block-note-accent']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--highlight-block-note-accent']!,
        description: 'Note accent used by HighlightBlock surfaces and borders.',
      },
      {
        name: 'Highlight Block Tip Accent',
        variable: '--highlight-block-tip-accent',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--highlight-block-tip-accent']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--highlight-block-tip-accent']!,
        description: 'Tip accent used by HighlightBlock surfaces and borders.',
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
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--chrome-border']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--chrome-border']!,
        description: 'Default shared shell divider color.',
      },
      {
        name: 'Top Bar Border',
        variable: '--top-bar-border',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--top-bar-border']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--top-bar-border']!,
        description: 'Top bar divider color.',
      },
      {
        name: 'Activity Bar Border',
        variable: '--activity-bar-border',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--activity-bar-border']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--activity-bar-border']!,
        description: 'Activity bar divider color.',
      },
      {
        name: 'Bottom Bar Border',
        variable: '--bottom-bar-border',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--bottom-bar-border']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--bottom-bar-border']!,
        description: 'Bottom bar divider color.',
      },
      {
        name: 'Terminal Panel Border',
        variable: '--terminal-panel-border',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--terminal-panel-border']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--terminal-panel-border']!,
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
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--sidebar']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--sidebar']!,
        description: 'Sidebar background.',
      },
      {
        name: 'Sidebar Foreground',
        variable: '--sidebar-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--sidebar-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--sidebar-foreground']!,
        description: 'Sidebar foreground color.',
      },
      {
        name: 'Sidebar Primary',
        variable: '--sidebar-primary',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--sidebar-primary']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--sidebar-primary']!,
        description: 'Primary emphasis color inside the sidebar.',
      },
      {
        name: 'Sidebar Primary Foreground',
        variable: '--sidebar-primary-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--sidebar-primary-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--sidebar-primary-foreground']!,
        description: 'Foreground color used on sidebar primary surfaces.',
      },
      {
        name: 'Sidebar Accent',
        variable: '--sidebar-accent',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--sidebar-accent']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--sidebar-accent']!,
        description: 'Accent surface used for sidebar hover and active states.',
      },
      {
        name: 'Sidebar Accent Foreground',
        variable: '--sidebar-accent-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--sidebar-accent-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--sidebar-accent-foreground']!,
        description: 'Foreground color used on sidebar accent surfaces.',
      },
      {
        name: 'Sidebar Border',
        variable: '--sidebar-border',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--sidebar-border']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--sidebar-border']!,
        description: 'Sidebar inner border color.',
      },
      {
        name: 'Sidebar Ring',
        variable: '--sidebar-ring',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--sidebar-ring']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--sidebar-ring']!,
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
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--activity-bar']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--activity-bar']!,
        description: 'Activity bar background.',
      },
      {
        name: 'Activity Bar Foreground',
        variable: '--activity-bar-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--activity-bar-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--activity-bar-foreground']!,
        description: 'Default activity bar icon color.',
      },
      {
        name: 'Activity Bar Foreground Active',
        variable: '--activity-bar-foreground-active',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--activity-bar-foreground-active']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--activity-bar-foreground-active']!,
        description: 'Active activity bar icon color.',
      },
      {
        name: 'Activity Bar Badge',
        variable: '--activity-bar-badge',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--activity-bar-badge']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--activity-bar-badge']!,
        description: 'Activity bar badge background.',
      },
      {
        name: 'Activity Bar Badge Foreground',
        variable: '--activity-bar-badge-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--activity-bar-badge-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--activity-bar-badge-foreground']!,
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
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--terminal-background']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--terminal-background']!,
        description: 'Integrated terminal background.',
      },
      {
        name: 'Terminal Foreground',
        variable: '--terminal-foreground',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--terminal-foreground']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--terminal-foreground']!,
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
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--chart-1']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--chart-1']!,
        description: 'Primary chart series color.',
      },
      {
        name: 'Chart 2',
        variable: '--chart-2',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--chart-2']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--chart-2']!,
        description: 'Secondary chart series color.',
      },
      {
        name: 'Chart 3',
        variable: '--chart-3',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--chart-3']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--chart-3']!,
        description: 'Tertiary chart series color.',
      },
      {
        name: 'Chart 4',
        variable: '--chart-4',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--chart-4']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--chart-4']!,
        description: 'Quaternary chart series color.',
      },
      {
        name: 'Chart 5',
        variable: '--chart-5',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--chart-5']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--chart-5']!,
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
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--selection-bg']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--selection-bg']!,
        description: 'Default text selection background.',
      },
      {
        name: 'Selection Foreground',
        variable: '--selection-fg',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--selection-fg']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--selection-fg']!,
        description: 'Default text selection foreground.',
      },
      {
        name: 'Selection On Primary Background',
        variable: '--selection-on-primary-bg',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--selection-on-primary-bg']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--selection-on-primary-bg']!,
        description: 'Selection background for text rendered on primary surfaces.',
      },
      {
        name: 'Selection On Primary Foreground',
        variable: '--selection-on-primary-fg',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--selection-on-primary-fg']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--selection-on-primary-fg']!,
        description: 'Selection foreground for text rendered on primary surfaces.',
      },
      {
        name: 'Code Selection Background',
        variable: '--selection-code-bg',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--selection-code-bg']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--selection-code-bg']!,
        description: 'Selection background for code surfaces.',
      },
      {
        name: 'Code Selection Foreground',
        variable: '--selection-code-fg',
        lightValue: CLASSIC_LIGHT_SEMANTIC_TOKENS['--selection-code-fg']!,
        darkValue: CLASSIC_DARK_SEMANTIC_TOKENS['--selection-code-fg']!,
        description: 'Selection foreground for code surfaces.',
      },
    ],
  },
] as const satisfies readonly FloeColorTokenCategory[];

export const floeTypographyTokens = [
  {
    name: 'Text XS',
    size: '11px',
    lineHeight: '1.5',
    className: 'text-[11px]',
    description: 'Smallest text, captions and labels.',
  },
  {
    name: 'Text SM',
    size: '12px',
    lineHeight: '1.5',
    className: 'text-xs',
    description: 'Small text, secondary content.',
  },
  {
    name: 'Text Base',
    size: '14px',
    lineHeight: '1.5',
    className: 'text-sm',
    description: 'Default body text.',
  },
  {
    name: 'Text LG',
    size: '16px',
    lineHeight: '1.5',
    className: 'text-base',
    description: 'Larger body text and card titles.',
  },
  {
    name: 'Text XL',
    size: '18px',
    lineHeight: '1.4',
    className: 'text-lg',
    description: 'Section titles.',
  },
  {
    name: 'Text 2XL',
    size: '20px',
    lineHeight: '1.3',
    className: 'text-xl',
    description: 'Page titles.',
  },
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
  {
    name: 'Default',
    value: floeSharedCssVariables['--radius'],
    variable: '--radius',
    className: 'rounded',
  },
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

const floeColorTokens: readonly FloeColorToken[] = floeColorTokenCategories.reduce<
  FloeColorToken[]
>((tokens, category) => {
  tokens.push(...category.tokens);
  return tokens;
}, []);

function buildThemeVariableMap(theme: FloeResolvedTheme): Record<FloeCssVariableName, string> {
  return Object.fromEntries(
    floeColorTokens.map((token) => [
      token.variable,
      theme === 'light' ? token.lightValue : token.darkValue,
    ])
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

/** Optional shadow overrides. Defaults resolve at each role so local palettes
 * participate without masking overrides supplied by the theme service. */
export const floeSurfaceTokens = [
  { variable: '--floe-surface-shadow-raised', role: 'raised', fallback: '0 1px 3px -2px var(--floe-surface-shade), inset 0 1px 1px var(--floe-surface-highlight)' },
  { variable: '--floe-surface-shadow-inset', role: 'inset', fallback: 'inset 0 1px 1px var(--floe-surface-shade), inset 0 -1px 1px var(--floe-surface-highlight)' },
  { variable: '--floe-surface-shadow-floating', role: 'floating', fallback: 'var(--floe-window-shadow)' },
  { variable: '--floe-surface-shadow-interacting', role: 'interacting', fallback: '0 1px 2px var(--floe-surface-shade)' },
] as const;

export const floeDesignTokens = {
  colors: floeColorTokenCategories,
  typography: floeTypographyTokens,
  fonts: floeFontFamilyTokens,
  spacing: floeSpacingTokens,
  radius: floeRadiusTokens,
  motion: floeMotionTokens,
  shared: floeSharedCssVariables,
  surface: floeSurfaceTokens,
} as const;
