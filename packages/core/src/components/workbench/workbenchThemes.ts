/**
 * Workbench theme catalog.
 *
 * Themes customise the canvas surface, atmosphere, grid, widget chrome,
 * body treatment, dock, typography, and focus accent via `data-workbench-theme`
 * on `.workbench-surface`. Theme-specific CSS overrides live in
 * `workbench-themes.css`.
 *
 * The `default` theme is a no-op: it inherits the app's global theme tokens
 * (`--background`, `--card`, `--border`, `--primary`, ...), so swapping to
 * `default` reproduces the look before this theme system existed.
 */
export const WORKBENCH_THEME_IDS = [
  'default',
  'vibrancy',
  'mica',
  'midnight',
  'aurora',
  'terminal',
] as const;

export type WorkbenchThemeId = (typeof WORKBENCH_THEME_IDS)[number];

export interface WorkbenchThemePreview {
  /** CSS value applied to the theme swatch's outer frame (represents canvas). */
  canvas: string;
  /** CSS value for the swatch's inner card (represents a widget). */
  widget: string;
  /** Solid CSS color for the selected/active indicator in the preview. */
  accent: string;
}

export interface WorkbenchThemeMeta {
  id: WorkbenchThemeId;
  label: string;
  description: string;
  preview: WorkbenchThemePreview;
}

export const WORKBENCH_THEMES: readonly WorkbenchThemeMeta[] = [
  {
    id: 'default',
    label: 'System',
    description: 'Inherits the current app theme tokens.',
    preview: {
      canvas: 'color-mix(in srgb, var(--background, #fafafa) 92%, var(--muted, #f0f0f0) 8%)',
      widget: 'var(--card, #ffffff)',
      accent: 'var(--primary, #3b82f6)',
    },
  },
  {
    id: 'vibrancy',
    label: 'macOS Vibrancy',
    description: 'Traffic-light glass windows over a soft wallpaper.',
    preview: {
      canvas: 'linear-gradient(135deg, #d8e1f2 0%, #ead7ee 100%)',
      widget: 'rgba(255, 255, 255, 0.76)',
      accent: '#3478f6',
    },
  },
  {
    id: 'mica',
    label: 'Fluent Mica',
    description: 'Mica wallpaper bleed, taskbar chrome, ice-blue accent.',
    preview: {
      canvas: 'linear-gradient(135deg, #eef2f7 0%, #f4e7eb 48%, #e7effc 100%)',
      widget: 'rgba(255, 255, 255, 0.84)',
      accent: '#0078d4',
    },
  },
  {
    id: 'midnight',
    label: 'Midnight Studio',
    description: 'Near-monochrome canvas, indigo accent, Geist-flavoured.',
    preview: {
      canvas: '#f5f5f7',
      widget: '#ffffff',
      accent: '#5e6ad2',
    },
  },
  {
    id: 'aurora',
    label: 'Aurora Glass',
    description: 'Indigo-violet dream gradient with heavy glass.',
    preview: {
      canvas: 'linear-gradient(135deg, #eadbfa 0%, #ffd8e2 100%)',
      widget: 'rgba(255, 255, 255, 0.58)',
      accent: '#6366f1',
    },
  },
  {
    id: 'terminal',
    label: 'Terminal Chic',
    description: 'Paper canvas, neon accent, monospace details.',
    preview: {
      canvas: '#f7f4ed',
      widget: '#ffffff',
      accent: '#d63384',
    },
  },
];

export const DEFAULT_WORKBENCH_THEME: WorkbenchThemeId = 'default';

export function isWorkbenchThemeId(value: unknown): value is WorkbenchThemeId {
  return typeof value === 'string' && (WORKBENCH_THEME_IDS as readonly string[]).includes(value);
}

export function workbenchThemeMeta(id: WorkbenchThemeId): WorkbenchThemeMeta {
  return WORKBENCH_THEMES.find((theme) => theme.id === id) ?? WORKBENCH_THEMES[0];
}
