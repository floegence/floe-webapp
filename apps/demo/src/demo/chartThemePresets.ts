import type { FloeThemePreset } from '@floegence/floe-webapp-core';

export interface DemoChartThemePreset extends FloeThemePreset {
  category: string;
  traits: readonly string[];
  bestFor: string;
}

type DemoChartThemeScale = readonly [string, string, string, string, string];

interface DemoChartThemePresetDefinition {
  name: string;
  displayName: string;
  description: string;
  category: string;
  traits: readonly string[];
  bestFor: string;
  light?: DemoChartThemeScale;
  dark?: DemoChartThemeScale;
}

function createChartTokenMap(colors: DemoChartThemeScale) {
  const [chart1, chart2, chart3, chart4, chart5] = colors;
  return {
    '--chart-1': chart1,
    '--chart-2': chart2,
    '--chart-3': chart3,
    '--chart-4': chart4,
    '--chart-5': chart5,
  } as const;
}

function createDemoChartThemePreset(
  definition: DemoChartThemePresetDefinition
): DemoChartThemePreset {
  const { light, dark, ...preset } = definition;

  return {
    ...preset,
    tokens:
      light || dark
        ? {
            ...(light ? { light: createChartTokenMap(light) } : {}),
            ...(dark ? { dark: createChartTokenMap(dark) } : {}),
          }
        : undefined,
  };
}

export const demoChartThemePresets = [
  createDemoChartThemePreset({
    name: 'default',
    displayName: 'Default',
    description: 'Balanced product accents that stay closest to the core shell contract.',
    category: 'Core System',
    traits: ['Balanced', 'Neutral', 'Versatile'],
    bestFor: 'Best for mixed product dashboards, admin views, and general-purpose reporting.',
  }),
  createDemoChartThemePreset({
    name: 'nord',
    displayName: 'Nord',
    description: 'Cool, restrained accents for calm analytics and infrastructure monitoring.',
    category: 'Calm Analytics',
    traits: ['Cool', 'Quiet contrast', 'Trustworthy'],
    bestFor:
      'Best for observability, platform metrics, and dashboards that need low visual fatigue.',
    light: ['#5e81ac', '#88c0d0', '#a3be8c', '#ebcb8b', '#b48ead'],
    dark: ['#5e81ac', '#88c0d0', '#a3be8c', '#ebcb8b', '#b48ead'],
  }),
  createDemoChartThemePreset({
    name: 'everforest',
    displayName: 'Everforest',
    description:
      'Natural, low-fatigue accents with the kind of contrast that stays comfortable all day.',
    category: 'Organic Calm',
    traits: ['Natural', 'Muted', 'Relaxed'],
    bestFor: 'Best for operational analytics, sustainability metrics, and long-running dashboards.',
    light: ['#3a94c5', '#35a77c', '#8da101', '#dfa000', '#df69ba'],
    dark: ['#7fbbb3', '#83c092', '#a7c080', '#dbbc7f', '#d699b6'],
  }),
  createDemoChartThemePreset({
    name: 'gruvbox-material',
    displayName: 'Gruvbox Material',
    description:
      'Warm retro tones with softened contrast, tuned to stay expressive without getting harsh.',
    category: 'Warm Retro',
    traits: ['Warm', 'Tactile', 'Comfortable'],
    bestFor:
      'Best for finance, ecommerce, and product dashboards that benefit from earthy color separation.',
    light: ['#45707a', '#4c7a5d', '#6c782e', '#b47109', '#945e80'],
    dark: ['#7daea3', '#89b482', '#a9b665', '#d8a657', '#d3869b'],
  }),
  createDemoChartThemePreset({
    name: 'catppuccin',
    displayName: 'Catppuccin',
    description:
      'Polished pastel accents that stay soft without losing structure or category separation.',
    category: 'Pastel System',
    traits: ['Pastel', 'Balanced', 'Friendly'],
    bestFor:
      'Best for modern SaaS surfaces, customer-facing analytics, and elegant product reporting.',
    light: ['#1e66f5', '#209fb5', '#40a02b', '#df8e1d', '#8839ef'],
    dark: ['#89b4fa', '#74c7ec', '#a6e3a1', '#f9e2af', '#cba6f7'],
  }),
  createDemoChartThemePreset({
    name: 'rose-pine',
    displayName: 'Rose Pine',
    description: 'Soft editorial warmth with gentler contrast and polished highlight colors.',
    category: 'Editorial Warmth',
    traits: ['Warm', 'Refined', 'Narrative'],
    bestFor:
      'Best for planning, portfolio, and storytelling dashboards where tone matters as much as signal.',
    light: ['#286983', '#56949f', '#ea9d34', '#d7827e', '#907aa9'],
    dark: ['#3e8fb0', '#9ccfd8', '#f6c177', '#ea9a97', '#c4a7e7'],
  }),
  createDemoChartThemePreset({
    name: 'kanagawa',
    displayName: 'Kanagawa',
    description: 'Ink, mineral blues, and muted golds adapted from a painterly Japanese palette.',
    category: 'Ink & Gold',
    traits: ['Artful', 'Layered', 'Atmospheric'],
    bestFor:
      'Best for knowledge tools, editorial products, and analytics with a more crafted visual tone.',
    light: ['#4d699b', '#4e8ca2', '#6f894e', '#e98a00', '#624c83'],
    dark: ['#7e9cd8', '#7fb4ca', '#98bb6c', '#e6c384', '#957fb8'],
  }),
  createDemoChartThemePreset({
    name: 'one-dark-pro',
    displayName: 'One Dark Pro',
    description:
      'A dependable developer classic with crisp categorical colors and straightforward contrast.',
    category: 'Developer Classic',
    traits: ['Clear', 'Modern', 'Technical'],
    bestFor: 'Best for engineering metrics, CI dashboards, and high-signal product telemetry.',
    light: ['#118dc3', '#56b6c2', '#1da912', '#eea825', '#9a77cf'],
    dark: ['#61afef', '#56b6c2', '#98c379', '#e5c07b', '#c678dd'],
  }),
  createDemoChartThemePreset({
    name: 'tokyo-night',
    displayName: 'Tokyo Night',
    description: 'Sharper dark-biased accents that keep dense charts crisp without feeling loud.',
    category: 'Dark Telemetry',
    traits: ['High signal', 'Night mode', 'Technical'],
    bestFor: 'Best for command-center, terminal-style, and high-density operations views.',
    light: ['#2959aa', '#0f4b6e', '#33635c', '#8f5e15', '#5a3e8e'],
    dark: ['#7aa2f7', '#7dcfff', '#73daca', '#e0af68', '#bb9af7'],
  }),
] as const satisfies readonly DemoChartThemePreset[];

export function getDemoChartThemePreset(
  name: string | undefined
): DemoChartThemePreset | undefined {
  return demoChartThemePresets.find((preset) => preset.name === name);
}
