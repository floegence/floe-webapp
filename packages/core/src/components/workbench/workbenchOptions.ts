import type {
  WorkbenchBackgroundMaterial,
  WorkbenchStickyNoteColor,
} from './types';

export const WORKBENCH_TEXT_COLOR_OPTIONS = [
  '#6b7280',
  '#64748b',
  '#71717a',
  '#78716c',
  '#7770a0',
  '#8a6b6b',
] as const;

export const WORKBENCH_DEFAULT_TEXT_COLOR = WORKBENCH_TEXT_COLOR_OPTIONS[0];

export const WORKBENCH_TEXT_FONT_OPTIONS = [
  {
    id: 'serif',
    label: 'Serif',
    fontFamily: 'ui-serif, Georgia, serif',
    fontWeight: 760,
  },
  {
    id: 'sans',
    label: 'Sans',
    fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: 800,
  },
  {
    id: 'round',
    label: 'Round',
    fontFamily: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", ui-sans-serif, sans-serif',
    fontWeight: 800,
  },
  {
    id: 'mono',
    label: 'Mono',
    fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
    fontWeight: 800,
  },
  {
    id: 'condensed',
    label: 'Cond',
    fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
    fontWeight: 700,
  },
] as const;

export type WorkbenchTextFontOption = typeof WORKBENCH_TEXT_FONT_OPTIONS[number];

export const WORKBENCH_DEFAULT_TEXT_FONT = WORKBENCH_TEXT_FONT_OPTIONS[0];

export function resolveWorkbenchTextFontOption(
  fontFamily: unknown,
): WorkbenchTextFontOption {
  const normalizedFamily = String(fontFamily ?? '').trim();
  return WORKBENCH_TEXT_FONT_OPTIONS.find((option) => option.fontFamily === normalizedFamily)
    ?? WORKBENCH_DEFAULT_TEXT_FONT;
}

export const WORKBENCH_REGION_FILL_OPTIONS = [
  '#9da8a1',
  '#a79d8e',
  '#8fa1aa',
  '#a78f86',
  '#9ca184',
  '#9993a7',
] as const;

export const WORKBENCH_DEFAULT_REGION_FILL = WORKBENCH_REGION_FILL_OPTIONS[0];

export const WORKBENCH_BACKGROUND_MATERIALS = [
  'solid',
  'dotted',
  'grid',
  'hatched',
  'glass',
] as const satisfies readonly WorkbenchBackgroundMaterial[];

export const WORKBENCH_DEFAULT_BACKGROUND_MATERIAL = 'dotted' satisfies WorkbenchBackgroundMaterial;

export const WORKBENCH_STICKY_NOTE_COLORS = [
  'amber',
  'sage',
  'azure',
  'coral',
  'rose',
] as const satisfies readonly WorkbenchStickyNoteColor[];

export const WORKBENCH_DEFAULT_STICKY_NOTE_COLOR = 'amber' satisfies WorkbenchStickyNoteColor;
