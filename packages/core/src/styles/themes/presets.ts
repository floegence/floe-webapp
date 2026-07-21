import type { FloeThemePreset, FloeThemePresetMode, FloeThemeTokenMap } from './index';

export type FloeShellThemeMode = 'light' | 'dark';

export interface FloeShellThemeSelection {
  version: 1;
  light?: string;
  dark?: string;
}

export type FloeShellThemeDefaults = Partial<Record<FloeShellThemeMode, string>>;

type ShellThemeTokenName =
  | '--background'
  | '--foreground'
  | '--primary'
  | '--primary-foreground'
  | '--secondary'
  | '--secondary-foreground'
  | '--muted'
  | '--muted-foreground'
  | '--accent'
  | '--accent-foreground'
  | '--border'
  | '--input'
  | '--ring'
  | '--chrome-border'
  | '--top-bar-border'
  | '--activity-bar-border'
  | '--bottom-bar-border'
  | '--terminal-panel-border'
  | '--card'
  | '--card-foreground'
  | '--popover'
  | '--popover-foreground'
  | '--success'
  | '--success-foreground'
  | '--warning'
  | '--warning-foreground'
  | '--error'
  | '--error-foreground'
  | '--info'
  | '--info-foreground'
  | '--highlight-block-info-accent'
  | '--highlight-block-warning-accent'
  | '--highlight-block-success-accent'
  | '--highlight-block-error-accent'
  | '--highlight-block-note-accent'
  | '--highlight-block-tip-accent'
  | '--sidebar'
  | '--sidebar-foreground'
  | '--sidebar-primary'
  | '--sidebar-primary-foreground'
  | '--sidebar-accent'
  | '--sidebar-accent-foreground'
  | '--sidebar-border'
  | '--sidebar-ring'
  | '--activity-bar'
  | '--activity-bar-foreground'
  | '--activity-bar-foreground-active'
  | '--activity-bar-badge'
  | '--activity-bar-badge-foreground'
  | '--terminal-background'
  | '--terminal-foreground'
  | '--chart-1'
  | '--chart-2'
  | '--chart-3'
  | '--chart-4'
  | '--chart-5'
  | '--selection-bg'
  | '--selection-fg'
  | '--selection-on-primary-bg'
  | '--selection-on-primary-fg'
  | '--selection-code-bg'
  | '--selection-code-fg';

export const REQUIRED_SHELL_THEME_TOKENS: readonly ShellThemeTokenName[] = [
  '--background',
  '--foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--border',
  '--input',
  '--ring',
  '--chrome-border',
  '--top-bar-border',
  '--activity-bar-border',
  '--bottom-bar-border',
  '--terminal-panel-border',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--success',
  '--success-foreground',
  '--warning',
  '--warning-foreground',
  '--error',
  '--error-foreground',
  '--info',
  '--info-foreground',
  '--highlight-block-info-accent',
  '--highlight-block-warning-accent',
  '--highlight-block-success-accent',
  '--highlight-block-error-accent',
  '--highlight-block-note-accent',
  '--highlight-block-tip-accent',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
  '--activity-bar',
  '--activity-bar-foreground',
  '--activity-bar-foreground-active',
  '--activity-bar-badge',
  '--activity-bar-badge-foreground',
  '--terminal-background',
  '--terminal-foreground',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--selection-bg',
  '--selection-fg',
  '--selection-on-primary-bg',
  '--selection-on-primary-fg',
  '--selection-code-bg',
  '--selection-code-fg',
];

interface ShellThemePaletteDefinition {
  name: string;
  displayName: string;
  description: string;
  mode: FloeShellThemeMode;
  background: string;
  foreground: string;
  card: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  border: string;
  input: string;
  sidebar: string;
  terminalBackground: string;
  terminalForeground: string;
  selectionBackground: string;
  selectionForeground: string;
  chart: readonly [string, string, string, string, string];
  syntax?: {
    comment: string;
    keyword: string;
    string: string;
    number: string;
    type: string;
    function: string;
    constant: string;
  };
}

const LIGHT_STATUS = {
  success: '#287A4B',
  successForeground: '#FFFFFF',
  warning: '#835800',
  warningForeground: '#FFFFFF',
  error: '#B42318',
  errorForeground: '#FFFFFF',
  info: '#245B9B',
  infoForeground: '#FFFFFF',
  note: '#6847A0',
  tip: '#1E6F73',
} as const;

const DARK_STATUS = {
  success: '#72D39C',
  successForeground: '#07160E',
  warning: '#F0C36A',
  warningForeground: '#1B1405',
  error: '#FF8A82',
  errorForeground: '#210706',
  info: '#79B8FF',
  infoForeground: '#061321',
  note: '#C19BE8',
  tip: '#71C8C0',
} as const;

export function createShellThemePreset(definition: ShellThemePaletteDefinition): FloeThemePreset {
  const status = definition.mode === 'light' ? LIGHT_STATUS : DARK_STATUS;
  const selectionOnPrimary =
    definition.mode === 'light'
      ? { background: '#F4C95D', foreground: '#243447' }
      : {
          background: definition.background,
          foreground: definition.foreground,
        };
  const [chart1, chart2, chart3, chart4, chart5] = definition.chart;
  const syntax = definition.syntax ?? {
    comment: definition.mutedForeground,
    keyword: chart1,
    string: chart2,
    number: chart4,
    type: chart3,
    function: chart5,
    constant: chart4,
  };

  const tokenMap: Record<ShellThemeTokenName, string> = {
    '--background': definition.background,
    '--foreground': definition.foreground,
    '--primary': definition.primary,
    '--primary-foreground': definition.primaryForeground,
    '--secondary': definition.muted,
    '--secondary-foreground': definition.foreground,
    '--muted': definition.muted,
    '--muted-foreground': definition.mutedForeground,
    '--accent': definition.muted,
    '--accent-foreground': definition.foreground,
    '--border': definition.border,
    '--input': definition.input,
    '--ring': definition.primary,
    '--chrome-border': definition.border,
    '--top-bar-border': definition.border,
    '--activity-bar-border': definition.border,
    '--bottom-bar-border': definition.border,
    '--terminal-panel-border': definition.border,
    '--card': definition.card,
    '--card-foreground': definition.foreground,
    '--popover': definition.card,
    '--popover-foreground': definition.foreground,
    '--success': status.success,
    '--success-foreground': status.successForeground,
    '--warning': status.warning,
    '--warning-foreground': status.warningForeground,
    '--error': status.error,
    '--error-foreground': status.errorForeground,
    '--info': status.info,
    '--info-foreground': status.infoForeground,
    '--highlight-block-info-accent': status.info,
    '--highlight-block-warning-accent': status.warning,
    '--highlight-block-success-accent': status.success,
    '--highlight-block-error-accent': status.error,
    '--highlight-block-note-accent': status.note,
    '--highlight-block-tip-accent': status.tip,
    '--sidebar': definition.sidebar,
    '--sidebar-foreground': definition.foreground,
    '--sidebar-primary': definition.primary,
    '--sidebar-primary-foreground': definition.primaryForeground,
    '--sidebar-accent': definition.muted,
    '--sidebar-accent-foreground': definition.foreground,
    '--sidebar-border': definition.border,
    '--sidebar-ring': definition.primary,
    '--activity-bar': definition.sidebar,
    '--activity-bar-foreground': definition.mutedForeground,
    '--activity-bar-foreground-active': definition.foreground,
    '--activity-bar-badge': definition.primary,
    '--activity-bar-badge-foreground': definition.primaryForeground,
    '--terminal-background': definition.terminalBackground,
    '--terminal-foreground': definition.terminalForeground,
    '--chart-1': chart1,
    '--chart-2': chart2,
    '--chart-3': chart3,
    '--chart-4': chart4,
    '--chart-5': chart5,
    '--selection-bg': definition.selectionBackground,
    '--selection-fg': definition.selectionForeground,
    '--selection-on-primary-bg': selectionOnPrimary.background,
    '--selection-on-primary-fg': selectionOnPrimary.foreground,
    '--selection-code-bg': '#58A6FF',
    '--selection-code-fg': '#08111D',
  };

  return {
    name: definition.name,
    displayName: definition.displayName,
    description: definition.description,
    mode: definition.mode,
    preview: {
      background: definition.background,
      surface: definition.card,
      primary: definition.primary,
      sidebar: definition.sidebar,
      border: definition.border,
      colors: definition.chart,
    },
    monaco: {
      [definition.mode]: {
        base: definition.mode === 'light' ? 'vs' : 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: syntax.comment, fontStyle: 'italic' },
          { token: 'comment.doc', foreground: syntax.comment, fontStyle: 'italic' },
          { token: 'keyword', foreground: syntax.keyword },
          { token: 'keyword.control', foreground: syntax.keyword },
          { token: 'storage', foreground: syntax.keyword },
          { token: 'string', foreground: syntax.string },
          { token: 'string.escape', foreground: syntax.constant },
          { token: 'number', foreground: syntax.number },
          { token: 'constant.numeric', foreground: syntax.number },
          { token: 'type', foreground: syntax.type },
          { token: 'type.identifier', foreground: syntax.type },
          { token: 'entity.name.type', foreground: syntax.type },
          { token: 'function', foreground: syntax.function },
          { token: 'entity.name.function', foreground: syntax.function },
          { token: 'support.function', foreground: syntax.function },
          { token: 'constant.language', foreground: syntax.constant },
          { token: 'variable.predefined', foreground: syntax.constant },
        ],
        colors: {
          'editor.background': definition.background,
          'editor.foreground': definition.foreground,
          'editorCursor.foreground': definition.primary,
          'editor.selectionBackground': definition.selectionBackground,
          'editor.selectionForeground': definition.selectionForeground,
          'editor.inactiveSelectionBackground': `${definition.selectionBackground}99`,
          'editor.selectionHighlightBackground': `${definition.selectionBackground}66`,
          'editor.lineHighlightBackground': definition.muted,
          'editor.lineHighlightBorder': definition.border,
          'editorLineNumber.foreground': definition.mutedForeground,
          'editorLineNumber.activeForeground': definition.foreground,
          'editorGutter.background': definition.background,
          'editorWhitespace.foreground': definition.border,
          'editorIndentGuide.background1': definition.border,
          'editorIndentGuide.activeBackground1': definition.input,
          'editor.findMatchBackground': definition.selectionBackground,
          'editor.findMatchHighlightBackground': `${definition.selectionBackground}66`,
          'editorBracketMatch.background': definition.muted,
          'editorBracketMatch.border': definition.primary,
          'editorWidget.background': definition.card,
          'editorWidget.border': definition.input,
          'editorSuggestWidget.background': definition.card,
          'editorSuggestWidget.border': definition.border,
          'editorSuggestWidget.selectedBackground': definition.muted,
          'editorHoverWidget.background': definition.card,
          'editorHoverWidget.border': definition.border,
          'editorError.foreground': status.error,
          'editorWarning.foreground': status.warning,
          'editorInfo.foreground': status.info,
          'scrollbarSlider.background': `${definition.input}66`,
          'scrollbarSlider.hoverBackground': `${definition.input}99`,
          'scrollbarSlider.activeBackground': `${definition.input}CC`,
        },
      },
    },
    tokens:
      definition.mode === 'light'
        ? { light: tokenMap as FloeThemeTokenMap }
        : { dark: tokenMap as FloeThemeTokenMap },
  };
}

const classicLightPreset = {
  ...createShellThemePreset({
    name: 'classic-light',
    displayName: 'Classic Light',
    description: 'The original Floe warm-paper light theme.',
    mode: 'light',
    background: '#F3F0EC',
    foreground: '#202A37',
    card: '#FFFDFA',
    muted: '#F2F0ED',
    mutedForeground: '#5A687C',
    primary: '#202A37',
    primaryForeground: '#FFFDFA',
    border: '#D7D2CB',
    input: '#CBC4B9',
    sidebar: '#EDEBE8',
    terminalBackground: '#202A37',
    terminalForeground: '#EBEBEB',
    selectionBackground: '#2671D9',
    selectionForeground: '#FFFFFF',
    chart: ['#202A37', '#5A687C', '#2671D9', '#287A4B', '#835800'],
    syntax: {
      comment: '#5A687C',
      keyword: '#005FB8',
      string: '#26736F',
      number: '#8A5A00',
      type: '#245B9B',
      function: '#6847A0',
      constant: '#9C225E',
    },
  }),
  inheritsBaseTokens: true,
  tokens: undefined,
} satisfies FloeThemePreset;

const classicDarkPreset = {
  ...createShellThemePreset({
    name: 'classic-dark',
    displayName: 'Classic Dark',
    description: 'The original Floe blue-black dark theme.',
    mode: 'dark',
    background: '#0E121B',
    foreground: '#F9FAFB',
    card: '#121721',
    muted: '#1B212D',
    mutedForeground: '#8596AD',
    primary: '#F9FAFB',
    primaryForeground: '#121621',
    border: '#252B37',
    input: '#52627A',
    sidebar: '#121721',
    terminalBackground: '#0C1018',
    terminalForeground: '#E8EBEE',
    selectionBackground: '#2671D9',
    selectionForeground: '#FFFFFF',
    chart: ['#F9FAFB', '#8596AD', '#79B8FF', '#72D39C', '#F0C36A'],
    syntax: {
      comment: '#8596AD',
      keyword: '#C19BE8',
      string: '#91C980',
      number: '#F0C36A',
      type: '#79B8FF',
      function: '#72D39C',
      constant: '#FF8A82',
    },
  }),
  inheritsBaseTokens: true,
  tokens: undefined,
} satisfies FloeThemePreset;

export const builtInShellThemePresets = [
  classicLightPreset,
  createShellThemePreset({
    name: 'paper',
    displayName: 'Paper',
    description: 'Warm paper and deep ink for focused reading.',
    mode: 'light',
    background: '#F5F1E8',
    foreground: '#243447',
    card: '#FFFDF8',
    muted: '#EAE4D8',
    mutedForeground: '#5B6470',
    primary: '#243447',
    primaryForeground: '#FFFDF8',
    border: '#CEC6B8',
    input: '#7D7468',
    sidebar: '#EDE7DC',
    terminalBackground: '#18202B',
    terminalForeground: '#EDF2F7',
    selectionBackground: '#245B8A',
    selectionForeground: '#FFFFFF',
    chart: ['#245B8A', '#26736F', '#567832', '#8A5A00', '#7A4F78'],
  }),
  createShellThemePreset({
    name: 'mist',
    displayName: 'Mist',
    description: 'Cool, quiet layers for monitoring and dense data.',
    mode: 'light',
    background: '#EEF3F7',
    foreground: '#1F3442',
    card: '#FFFFFF',
    muted: '#E2EAF0',
    mutedForeground: '#536574',
    primary: '#234E63',
    primaryForeground: '#FFFFFF',
    border: '#C5D0D8',
    input: '#768895',
    sidebar: '#E7EDF2',
    terminalBackground: '#111D26',
    terminalForeground: '#ECF4F8',
    selectionBackground: '#245B9B',
    selectionForeground: '#FFFFFF',
    chart: ['#245B9B', '#1E6F73', '#3E6B46', '#8A5A00', '#6847A0'],
  }),
  createShellThemePreset({
    name: 'meadow',
    displayName: 'Meadow',
    description: 'Natural greens for collaborative daily work.',
    mode: 'light',
    background: '#EEF4EC',
    foreground: '#20372D',
    card: '#FBFDF9',
    muted: '#E2EBDF',
    mutedForeground: '#52635A',
    primary: '#24523D',
    primaryForeground: '#FFFFFF',
    border: '#C3D0BE',
    input: '#7C8C77',
    sidebar: '#E5EDE2',
    terminalBackground: '#10221B',
    terminalForeground: '#EEF6F0',
    selectionBackground: '#26734D',
    selectionForeground: '#FFFFFF',
    chart: ['#26734D', '#245B9B', '#8A5A00', '#A13F17', '#6847A0'],
  }),
  createShellThemePreset({
    name: 'citrus',
    displayName: 'Citrus',
    description: 'Warm cream and amber for lively commercial work.',
    mode: 'light',
    background: '#FFF5E1',
    foreground: '#3F2D1C',
    card: '#FFFEFA',
    muted: '#F3E7D0',
    mutedForeground: '#675B4B',
    primary: '#874000',
    primaryForeground: '#FFFFFF',
    border: '#DBC9AA',
    input: '#9F8C6C',
    sidebar: '#F7EBD3',
    terminalBackground: '#261A11',
    terminalForeground: '#FFF5E1',
    selectionBackground: '#874000',
    selectionForeground: '#FFFFFF',
    chart: ['#A13F17', '#245B9B', '#26734D', '#6E45A3', '#9C225E'],
  }),
  createShellThemePreset({
    name: 'lilac',
    displayName: 'Lilac',
    description: 'Soft violet structure for creative and client work.',
    mode: 'light',
    background: '#F5F0FA',
    foreground: '#30253D',
    card: '#FFFDFF',
    muted: '#EAE1F2',
    mutedForeground: '#62566E',
    primary: '#51407E',
    primaryForeground: '#FFFFFF',
    border: '#D4C5DF',
    input: '#9584A2',
    sidebar: '#EEE6F4',
    terminalBackground: '#201827',
    terminalForeground: '#F7F0FB',
    selectionBackground: '#51407E',
    selectionForeground: '#FFFFFF',
    chart: ['#3E3F9F', '#245B9B', '#26734D', '#A13F17', '#9C225E'],
  }),
  createShellThemePreset({
    name: 'light-plus',
    displayName: 'Light+',
    description: 'VS Code clarity with crisp blue actions and neutral chrome.',
    mode: 'light',
    background: '#FFFFFF',
    foreground: '#1F1F1F',
    card: '#F7F7F7',
    muted: '#EDEDED',
    mutedForeground: '#616161',
    primary: '#005FB8',
    primaryForeground: '#FFFFFF',
    border: '#D4D4D4',
    input: '#767676',
    sidebar: '#F3F3F3',
    terminalBackground: '#181818',
    terminalForeground: '#CCCCCC',
    selectionBackground: '#005FB8',
    selectionForeground: '#FFFFFF',
    chart: ['#005FB8', '#007A69', '#527A00', '#9A5D00', '#7A3E9D'],
    syntax: {
      comment: '#008000',
      keyword: '#0000FF',
      string: '#A31515',
      number: '#098658',
      type: '#267F99',
      function: '#795E26',
      constant: '#811F3F',
    },
  }),
  createShellThemePreset({
    name: 'quiet-light',
    displayName: 'Quiet Light',
    description: 'Soft gray surfaces and calm indigo for long coding sessions.',
    mode: 'light',
    background: '#F5F5F5',
    foreground: '#333333',
    card: '#FFFFFF',
    muted: '#E8E8E8',
    mutedForeground: '#626262',
    primary: '#4B61B9',
    primaryForeground: '#FFFFFF',
    border: '#D2D2D2',
    input: '#777777',
    sidebar: '#EBEBEB',
    terminalBackground: '#202020',
    terminalForeground: '#DADADA',
    selectionBackground: '#455FA0',
    selectionForeground: '#FFFFFF',
    chart: ['#4B5FBF', '#26736F', '#567832', '#9A5D00', '#8A427A'],
    syntax: {
      comment: '#777777',
      keyword: '#7A3E9D',
      string: '#A31515',
      number: '#098658',
      type: '#267F99',
      function: '#795E26',
      constant: '#4B5FBF',
    },
  }),
  createShellThemePreset({
    name: 'solarized-light',
    displayName: 'Solarized Light',
    description: 'Solarized warmth with measured cyan, green, and amber syntax.',
    mode: 'light',
    background: '#FDF6E3',
    foreground: '#586E75',
    card: '#FFFDF4',
    muted: '#EEE8D5',
    mutedForeground: '#536970',
    primary: '#075E73',
    primaryForeground: '#FFFFFF',
    border: '#D9D1BA',
    input: '#7B7464',
    sidebar: '#F3ECD8',
    terminalBackground: '#002B36',
    terminalForeground: '#EEE8D5',
    selectionBackground: '#075E73',
    selectionForeground: '#FFFFFF',
    chart: ['#006F8A', '#2C6E49', '#7A6A00', '#B04A00', '#6C4A9E'],
    syntax: {
      comment: '#657B83',
      keyword: '#6C4A9E',
      string: '#2C6E49',
      number: '#B04A00',
      type: '#006F8A',
      function: '#7A6A00',
      constant: '#B04A00',
    },
  }),
  createShellThemePreset({
    name: 'github-light',
    displayName: 'GitHub Light',
    description: 'Clean repository neutrals with familiar blue and green accents.',
    mode: 'light',
    background: '#F6F8FA',
    foreground: '#24292F',
    card: '#FFFFFF',
    muted: '#EAEEF2',
    mutedForeground: '#57606A',
    primary: '#0969DA',
    primaryForeground: '#FFFFFF',
    border: '#D0D7DE',
    input: '#6E7781',
    sidebar: '#F0F3F6',
    terminalBackground: '#0D1117',
    terminalForeground: '#C9D1D9',
    selectionBackground: '#0969DA',
    selectionForeground: '#FFFFFF',
    chart: ['#0969DA', '#1A7F37', '#9A6700', '#CF222E', '#8250DF'],
    syntax: {
      comment: '#57606A',
      keyword: '#CF222E',
      string: '#0A3069',
      number: '#0550AE',
      type: '#953800',
      function: '#8250DF',
      constant: '#0550AE',
    },
  }),
  createShellThemePreset({
    name: 'hc-light',
    displayName: 'High Contrast Light',
    description: 'Maximum edge definition for bright environments and low vision.',
    mode: 'light',
    background: '#FFFFFF',
    foreground: '#000000',
    card: '#F2F2F2',
    muted: '#E0E0E0',
    mutedForeground: '#333333',
    primary: '#0000A8',
    primaryForeground: '#FFFFFF',
    border: '#000000',
    input: '#000000',
    sidebar: '#FFFFFF',
    terminalBackground: '#000000',
    terminalForeground: '#FFFFFF',
    selectionBackground: '#0000A8',
    selectionForeground: '#FFFFFF',
    chart: ['#0000A8', '#006B3C', '#745500', '#B00020', '#6A1B9A'],
    syntax: {
      comment: '#005A00',
      keyword: '#0000A8',
      string: '#A00000',
      number: '#006B3C',
      type: '#005B70',
      function: '#6A1B9A',
      constant: '#745500',
    },
  }),
  classicDarkPreset,
  createShellThemePreset({
    name: 'ink',
    displayName: 'Ink',
    description: 'Blue-black focus with a restrained engineering blue.',
    mode: 'dark',
    background: '#0B1420',
    foreground: '#EAF2F7',
    card: '#121F2D',
    muted: '#1A2938',
    mutedForeground: '#AAB8C7',
    primary: '#86A6E7',
    primaryForeground: '#0B1420',
    border: '#2B3D50',
    input: '#58708A',
    sidebar: '#0F1B28',
    terminalBackground: '#070D14',
    terminalForeground: '#DFEAF1',
    selectionBackground: '#395C9F',
    selectionForeground: '#FFFFFF',
    chart: ['#86A6E7', '#62B8C7', '#91C980', '#F1C86D', '#C19BE8'],
  }),
  createShellThemePreset({
    name: 'slate',
    displayName: 'Slate',
    description: 'Neutral graphite layers for enterprise operations.',
    mode: 'dark',
    background: '#171B22',
    foreground: '#EEF1F5',
    card: '#202832',
    muted: '#29323D',
    mutedForeground: '#AAB3BF',
    primary: '#A8B7C8',
    primaryForeground: '#171B22',
    border: '#38434F',
    input: '#68798C',
    sidebar: '#1C222B',
    terminalBackground: '#0F1217',
    terminalForeground: '#E7EBEF',
    selectionBackground: '#52677E',
    selectionForeground: '#FFFFFF',
    chart: ['#A8B7C8', '#71C8C0', '#A9C77A', '#E0B96D', '#C2A6E7'],
  }),
  createShellThemePreset({
    name: 'forest',
    displayName: 'Forest',
    description: 'Deep greens and copper for calm live monitoring.',
    mode: 'dark',
    background: '#0B1A17',
    foreground: '#EDF6F1',
    card: '#132621',
    muted: '#1B312B',
    mutedForeground: '#A7BDB3',
    primary: '#71D0B1',
    primaryForeground: '#0B1A17',
    border: '#2A453C',
    input: '#587C6C',
    sidebar: '#10211D',
    terminalBackground: '#06100E',
    terminalForeground: '#E5F1EB',
    selectionBackground: '#2D7D67',
    selectionForeground: '#FFFFFF',
    chart: ['#71D0B1', '#8FCB81', '#E5C07B', '#F08C78', '#C7A6E8'],
  }),
  createShellThemePreset({
    name: 'ember',
    displayName: 'Ember',
    description: 'Charcoal warmth for releases and high-attention work.',
    mode: 'dark',
    background: '#1D1115',
    foreground: '#FFF1F1',
    card: '#291A20',
    muted: '#352329',
    mutedForeground: '#C4A9B0',
    primary: '#FF9B7A',
    primaryForeground: '#1D1115',
    border: '#4B3038',
    input: '#8C6270',
    sidebar: '#24171B',
    terminalBackground: '#11090B',
    terminalForeground: '#FBEAED',
    selectionBackground: '#A94632',
    selectionForeground: '#FFFFFF',
    chart: ['#FF9B7A', '#7BC8FF', '#8ED081', '#F4CC75', '#D7A4F9'],
  }),
  createShellThemePreset({
    name: 'ocean',
    displayName: 'Ocean',
    description: 'High-clarity cyan for streams, terminals, and tools.',
    mode: 'dark',
    background: '#071A25',
    foreground: '#E9F7FC',
    card: '#0E2938',
    muted: '#153544',
    mutedForeground: '#A1BECA',
    primary: '#69D4FF',
    primaryForeground: '#071A25',
    border: '#254657',
    input: '#47788E',
    sidebar: '#0A2230',
    terminalBackground: '#030E14',
    terminalForeground: '#E0F3FA',
    selectionBackground: '#176C8E',
    selectionForeground: '#FFFFFF',
    chart: ['#69D4FF', '#83E1C1', '#B6D86C', '#F2C879', '#D2AEFF'],
  }),
  createShellThemePreset({
    name: 'dark-plus',
    displayName: 'Dark+',
    description: 'The familiar VS Code dark workbench with balanced syntax color.',
    mode: 'dark',
    background: '#1E1E1E',
    foreground: '#D4D4D4',
    card: '#252526',
    muted: '#2D2D30',
    mutedForeground: '#B4B4B4',
    primary: '#3794FF',
    primaryForeground: '#101010',
    border: '#3F3F46',
    input: '#737379',
    sidebar: '#181818',
    terminalBackground: '#181818',
    terminalForeground: '#CCCCCC',
    selectionBackground: '#264F78',
    selectionForeground: '#FFFFFF',
    chart: ['#569CD6', '#4EC9B0', '#B5CEA8', '#DCDCAA', '#C586C0'],
    syntax: {
      comment: '#6A9955',
      keyword: '#C586C0',
      string: '#CE9178',
      number: '#B5CEA8',
      type: '#4EC9B0',
      function: '#DCDCAA',
      constant: '#569CD6',
    },
  }),
  createShellThemePreset({
    name: 'monokai',
    displayName: 'Monokai',
    description: 'Warm charcoal with vivid pink, green, cyan, and yellow code.',
    mode: 'dark',
    background: '#272822',
    foreground: '#F8F8F2',
    card: '#30312B',
    muted: '#3A3B34',
    mutedForeground: '#C5C8B5',
    primary: '#F92672',
    primaryForeground: '#11120F',
    border: '#494A42',
    input: '#7B7D6E',
    sidebar: '#20211C',
    terminalBackground: '#1D1E19',
    terminalForeground: '#F8F8F2',
    selectionBackground: '#5A594E',
    selectionForeground: '#FFFFFF',
    chart: ['#F92672', '#A6E22E', '#66D9EF', '#E6DB74', '#AE81FF'],
    syntax: {
      comment: '#A6A28C',
      keyword: '#F92672',
      string: '#A6E22E',
      number: '#AE81FF',
      type: '#66D9EF',
      function: '#E6DB74',
      constant: '#AE81FF',
    },
  }),
  createShellThemePreset({
    name: 'nord',
    displayName: 'Nord',
    description: 'Arctic blue-gray surfaces with restrained frost accents.',
    mode: 'dark',
    background: '#2E3440',
    foreground: '#ECEFF4',
    card: '#3B4252',
    muted: '#434C5E',
    mutedForeground: '#D8DEE9',
    primary: '#88C0D0',
    primaryForeground: '#1B222C',
    border: '#4C566A',
    input: '#8B9AAF',
    sidebar: '#262C36',
    terminalBackground: '#242933',
    terminalForeground: '#D8DEE9',
    selectionBackground: '#4C668A',
    selectionForeground: '#FFFFFF',
    chart: ['#88C0D0', '#A3BE8C', '#EBCB8B', '#D08770', '#B48EAD'],
    syntax: {
      comment: '#A7B0C0',
      keyword: '#B48EAD',
      string: '#A3BE8C',
      number: '#B48EAD',
      type: '#8FBCBB',
      function: '#88C0D0',
      constant: '#D08770',
    },
  }),
  createShellThemePreset({
    name: 'dracula',
    displayName: 'Dracula',
    description: 'Deep violet charcoal with bright pink, green, and cyan syntax.',
    mode: 'dark',
    background: '#282A36',
    foreground: '#F8F8F2',
    card: '#303341',
    muted: '#3B3F51',
    mutedForeground: '#C9CCD6',
    primary: '#BD93F9',
    primaryForeground: '#1D1E26',
    border: '#44475A',
    input: '#78809C',
    sidebar: '#21222C',
    terminalBackground: '#191A21',
    terminalForeground: '#F8F8F2',
    selectionBackground: '#52566D',
    selectionForeground: '#FFFFFF',
    chart: ['#BD93F9', '#50FA7B', '#8BE9FD', '#F1FA8C', '#FF79C6'],
    syntax: {
      comment: '#A7AAC0',
      keyword: '#FF79C6',
      string: '#F1FA8C',
      number: '#BD93F9',
      type: '#8BE9FD',
      function: '#50FA7B',
      constant: '#BD93F9',
    },
  }),
  createShellThemePreset({
    name: 'abyss',
    displayName: 'Abyss',
    description: 'Near-black ocean depth with electric cyan tool highlights.',
    mode: 'dark',
    background: '#000C18',
    foreground: '#DDEEFF',
    card: '#051A28',
    muted: '#0B2536',
    mutedForeground: '#A7C4D8',
    primary: '#00A4EF',
    primaryForeground: '#00111D',
    border: '#12374D',
    input: '#39758F',
    sidebar: '#00111D',
    terminalBackground: '#00070D',
    terminalForeground: '#D7E9F5',
    selectionBackground: '#005A8D',
    selectionForeground: '#FFFFFF',
    chart: ['#00A4EF', '#22C7A9', '#A6D957', '#FFCC66', '#C792EA'],
    syntax: {
      comment: '#77A4BC',
      keyword: '#C792EA',
      string: '#A6D957',
      number: '#FFCC66',
      type: '#22C7A9',
      function: '#00A4EF',
      constant: '#FFCC66',
    },
  }),
] as const satisfies readonly FloeThemePreset[];

export const BUILT_IN_SHELL_THEME_DEFAULTS = {
  light: 'classic-light',
  dark: 'classic-dark',
} as const satisfies FloeShellThemeDefaults;

export function presetSupportsMode(preset: FloeThemePreset, mode: FloeShellThemeMode): boolean {
  const presetMode: FloeThemePresetMode = preset.mode ?? 'both';
  return presetMode === 'both' || presetMode === mode;
}

export function getShellThemePresetsForMode(
  presets: readonly FloeThemePreset[],
  mode: FloeShellThemeMode
): readonly FloeThemePreset[] {
  return presets.filter((preset) => presetSupportsMode(preset, mode));
}

export function assertUniqueThemePresetNames(presets: readonly FloeThemePreset[]): void {
  const names = new Set<string>();
  for (const preset of presets) {
    if (names.has(preset.name)) {
      throw new Error(`Duplicate shell theme preset name: ${preset.name}`);
    }
    names.add(preset.name);
  }
}

export function resolveShellThemePresetName(
  presets: readonly FloeThemePreset[],
  mode: FloeShellThemeMode,
  preferredName?: string,
  defaultName?: string
): string | undefined {
  const compatible = getShellThemePresetsForMode(presets, mode);
  if (preferredName && compatible.some((preset) => preset.name === preferredName)) {
    return preferredName;
  }
  if (defaultName && compatible.some((preset) => preset.name === defaultName)) {
    return defaultName;
  }
  return compatible[0]?.name;
}

export function normalizeShellThemeSelection(
  value: unknown,
  presets: readonly FloeThemePreset[],
  defaults: FloeShellThemeDefaults = {}
): FloeShellThemeSelection {
  const stored =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  const isVersionOne = stored?.version === 1;
  const requestedLight =
    isVersionOne && typeof stored.light === 'string' ? stored.light : undefined;
  const requestedDark = isVersionOne && typeof stored.dark === 'string' ? stored.dark : undefined;

  return {
    version: 1,
    light: resolveShellThemePresetName(presets, 'light', requestedLight, defaults.light),
    dark: resolveShellThemePresetName(presets, 'dark', requestedDark, defaults.dark),
  };
}

assertUniqueThemePresetNames(builtInShellThemePresets);
