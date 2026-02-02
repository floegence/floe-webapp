export interface ColorToken {
  name: string;
  variable: string;
  lightValue: string;
  darkValue?: string;
  description?: string;
}

export interface TokenCategory {
  name: string;
  description: string;
  tokens: ColorToken[];
}

// ===========================
// Color Tokens
// ===========================
export const colorTokens: TokenCategory[] = [
  {
    name: 'Base Colors',
    description: 'Primary background and foreground colors for the application.',
    tokens: [
      {
        name: 'Background',
        variable: '--background',
        lightValue: 'hsl(38 20% 98%)',
        darkValue: 'hsl(222 30% 8%)',
        description: 'Main application background color.',
      },
      {
        name: 'Foreground',
        variable: '--foreground',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(210 20% 98%)',
        description: 'Main text color.',
      },
      {
        name: 'Primary',
        variable: '--primary',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(210 20% 98%)',
        description: 'Primary brand color for buttons and accents.',
      },
      {
        name: 'Primary Foreground',
        variable: '--primary-foreground',
        lightValue: 'hsl(0 0% 98%)',
        darkValue: 'hsl(222 30% 10%)',
        description: 'Text color on primary backgrounds.',
      },
      {
        name: 'Secondary',
        variable: '--secondary',
        lightValue: 'hsl(38 10% 94%)',
        darkValue: 'hsl(220 25% 14%)',
        description: 'Secondary background color.',
      },
      {
        name: 'Muted',
        variable: '--muted',
        lightValue: 'hsl(38 10% 94%)',
        darkValue: 'hsl(220 25% 14%)',
        description: 'Muted background for subtle elements.',
      },
      {
        name: 'Muted Foreground',
        variable: '--muted-foreground',
        lightValue: 'hsl(215 20% 46%)',
        darkValue: 'hsl(215 20% 60%)',
        description: 'Text color for secondary content.',
      },
      {
        name: 'Accent',
        variable: '--accent',
        lightValue: 'hsl(38 15% 94%)',
        darkValue: 'hsl(220 25% 16%)',
        description: 'Accent color for highlights.',
      },
    ],
  },
  {
    name: 'Component Colors',
    description: 'Colors specific to UI components like cards, popovers, and borders.',
    tokens: [
      {
        name: 'Card',
        variable: '--card',
        lightValue: 'hsl(38 15% 99%)',
        darkValue: 'hsl(222 28% 10%)',
        description: 'Card background color.',
      },
      {
        name: 'Popover',
        variable: '--popover',
        lightValue: 'hsl(38 15% 99%)',
        darkValue: 'hsl(222 28% 10%)',
        description: 'Popover and dropdown background.',
      },
      {
        name: 'Border',
        variable: '--border',
        lightValue: 'hsl(38 8% 88%)',
        darkValue: 'hsl(220 20% 18%)',
        description: 'Default border color.',
      },
      {
        name: 'Input',
        variable: '--input',
        lightValue: 'hsl(38 8% 88%)',
        darkValue: 'hsl(220 25% 14%)',
        description: 'Input field border color.',
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
    description: 'Semantic colors for success, warning, error, and info states.',
    tokens: [
      {
        name: 'Success',
        variable: '--success',
        lightValue: 'oklch(0.68 0.16 150)',
        darkValue: 'oklch(0.72 0.19 150)',
        description: 'Success state color.',
      },
      {
        name: 'Warning',
        variable: '--warning',
        lightValue: 'oklch(0.78 0.14 80)',
        darkValue: 'oklch(0.82 0.16 80)',
        description: 'Warning state color.',
      },
      {
        name: 'Error',
        variable: '--error',
        lightValue: 'oklch(0.65 0.2 25)',
        darkValue: 'oklch(0.7 0.22 25)',
        description: 'Error state color.',
      },
      {
        name: 'Info',
        variable: '--info',
        lightValue: 'oklch(0.65 0.13 250)',
        darkValue: 'oklch(0.7 0.15 250)',
        description: 'Informational state color.',
      },
    ],
  },
  {
    name: 'Sidebar Colors',
    description: 'Colors for the sidebar and activity bar regions.',
    tokens: [
      {
        name: 'Sidebar',
        variable: '--sidebar',
        lightValue: 'hsl(38 15% 97.5%)',
        darkValue: 'hsl(222 28% 10%)',
        description: 'Sidebar background color.',
      },
      {
        name: 'Sidebar Foreground',
        variable: '--sidebar-foreground',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(210 20% 98%)',
        description: 'Sidebar text color.',
      },
      {
        name: 'Activity Bar',
        variable: '--activity-bar',
        lightValue: 'hsl(38 10% 96%)',
        darkValue: 'hsl(222 30% 9%)',
        description: 'Activity bar background.',
      },
      {
        name: 'Activity Bar Badge',
        variable: '--activity-bar-badge',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(217 80% 55%)',
        description: 'Badge color in activity bar.',
      },
    ],
  },
  {
    name: 'Terminal Colors',
    description: 'Colors for the integrated terminal.',
    tokens: [
      {
        name: 'Terminal Background',
        variable: '--terminal-background',
        lightValue: 'hsl(215 40% 13%)',
        darkValue: 'hsl(222 32% 7%)',
        description: 'Terminal background (always dark).',
      },
      {
        name: 'Terminal Foreground',
        variable: '--terminal-foreground',
        lightValue: 'hsl(0 0% 92%)',
        darkValue: 'hsl(210 15% 92%)',
        description: 'Terminal text color.',
      },
    ],
  },
  {
    name: 'Chart Colors',
    description: 'Colors for data visualization and charts.',
    tokens: [
      { name: 'Chart 1', variable: '--chart-1', lightValue: 'hsl(215 40% 13%)', darkValue: 'hsl(210 20% 98%)' },
      { name: 'Chart 2', variable: '--chart-2', lightValue: 'hsl(38 15% 60%)', darkValue: 'hsl(215 20% 60%)' },
      { name: 'Chart 3', variable: '--chart-3', lightValue: 'oklch(0.65 0.13 250)', darkValue: 'oklch(0.7 0.15 250)' },
      { name: 'Chart 4', variable: '--chart-4', lightValue: 'oklch(0.68 0.16 150)', darkValue: 'oklch(0.72 0.19 150)' },
      { name: 'Chart 5', variable: '--chart-5', lightValue: 'oklch(0.78 0.14 80)', darkValue: 'oklch(0.82 0.16 80)' },
    ],
  },
];

// ===========================
// Typography Tokens
// ===========================
export interface TypographyToken {
  name: string;
  size: string;
  lineHeight: string;
  className: string;
  description: string;
}

export const typographyTokens: TypographyToken[] = [
  { name: 'Text XS', size: '11px', lineHeight: '1.5', className: 'text-[11px]', description: 'Smallest text, captions and labels.' },
  { name: 'Text SM', size: '12px', lineHeight: '1.5', className: 'text-xs', description: 'Small text, secondary content.' },
  { name: 'Text Base', size: '14px', lineHeight: '1.5', className: 'text-sm', description: 'Default body text.' },
  { name: 'Text LG', size: '16px', lineHeight: '1.5', className: 'text-base', description: 'Larger body text, card titles.' },
  { name: 'Text XL', size: '18px', lineHeight: '1.4', className: 'text-lg', description: 'Section titles.' },
  { name: 'Text 2XL', size: '20px', lineHeight: '1.3', className: 'text-xl', description: 'Page titles.' },
];

export const fontFamilies = [
  { name: 'Sans', value: 'ui-sans-serif, system-ui, sans-serif', description: 'Default UI font.' },
  { name: 'Mono', value: 'ui-monospace, SFMono-Regular, Consolas, monospace', description: 'Code and technical content.' },
];

// ===========================
// Spacing Tokens
// ===========================
export interface SpacingToken {
  name: string;
  value: string;
  pixels: string;
  className: string;
}

export const spacingTokens: SpacingToken[] = [
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
];

// ===========================
// Radius Tokens
// ===========================
export interface RadiusToken {
  name: string;
  value: string;
  variable: string;
  className: string;
}

export const radiusTokens: RadiusToken[] = [
  { name: 'None', value: '0', variable: '-', className: 'rounded-none' },
  { name: 'SM', value: '0.125rem', variable: '-', className: 'rounded-sm' },
  { name: 'Default', value: '0.375rem', variable: '--radius', className: 'rounded' },
  { name: 'MD', value: '0.5rem', variable: '-', className: 'rounded-md' },
  { name: 'LG', value: '0.75rem', variable: '-', className: 'rounded-lg' },
  { name: 'XL', value: '1rem', variable: '-', className: 'rounded-xl' },
  { name: '2XL', value: '1.5rem', variable: '-', className: 'rounded-2xl' },
  { name: 'Full', value: '9999px', variable: '-', className: 'rounded-full' },
];

// ===========================
// Animation Tokens
// ===========================
export interface AnimationToken {
  name: string;
  keyframes: string;
  usage: string;
  description: string;
}

export const animationTokens: AnimationToken[] = [
  {
    name: 'Fade In',
    keyframes: 'fade-in',
    usage: 'animate-in fade-in',
    description: 'Smooth opacity transition for appearing elements.',
  },
  {
    name: 'Zoom In',
    keyframes: 'zoom-in-95',
    usage: 'animate-in zoom-in-95',
    description: 'Scale up from 95% with opacity for modals.',
  },
  {
    name: 'Slide In',
    keyframes: 'slide-in-from-top-2',
    usage: 'animate-in slide-in-from-top-2',
    description: 'Slide down from above for dropdowns.',
  },
  {
    name: 'Spin',
    keyframes: 'spin',
    usage: 'animate-spin',
    description: '360° rotation for loading spinners.',
  },
  {
    name: 'Pulse',
    keyframes: 'pulse',
    usage: 'animate-pulse',
    description: 'Subtle pulsing for skeleton loaders.',
  },
  {
    name: 'Shimmer',
    keyframes: 'shimmer',
    usage: 'animate-[shimmer_2s_infinite]',
    description: 'Sweeping light effect for loading states.',
  },
  {
    name: 'Morph',
    keyframes: 'morph',
    usage: 'animate-[morph_8s_infinite]',
    description: 'Organic blob morphing for backgrounds.',
  },
];
