import {
  createDefaultWorkbenchState,
  type WorkbenchState,
} from '@floegence/floe-webapp-core/workbench';
import fixtures from './reference-fixtures.json';

export type CompositionSample = 'composition' | 'regions';

/** Editable example scenes rendered by the shared Workbench components. */
export function createCompositionSample(
  sample: CompositionSample,
  locale: 'en-US' | 'zh-CN' = 'en-US'
): WorkbenchState {
  const copy = fixtures.copy[locale] as Record<string, string>;
  const definitions =
    sample === 'regions'
      ? fixtures.definitions.regionDefinitions
      : fixtures.definitions.compositionDefinitions;
  const colorFills: Record<string, string> = {
    amber: '#a79d8e',
    sage: '#9da8a1',
    azure: '#8fa1aa',
    coral: '#a78f86',
    rose: '#b58fa2',
    graphite: '#999999',
  };
  const size: Record<string, number> = { title: 48, headingText: 30, bodyText: 18, caption: 14 };
  const family = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif';
  const initial = createDefaultWorkbenchState();
  initial.widgets = [];
  initial.stickyNotes = [];
  initial.backgroundLayers = [];
  initial.annotations = [];
  initial.mode = 'background';
  initial.theme = 'default';
  initial.viewport = { x: 0, y: 0, scale: 1 };
  initial.selectedObject = null;
  initial.selectedWidgetId = null;
  for (const entry of definitions) {
    const item = entry as unknown as Record<string, string | number>;
    const geometry = {
      id: String(item.id),
      x: Number(item.x),
      y: Number(item.y),
      width: Number(item.w),
      height: Number(locale === 'en-US' ? (item.hEn ?? item.h) : item.h),
      z_index: 1,
      created_at_unix_ms: 1,
      updated_at_unix_ms: 1,
    };
    if (item.kind === 'sticky')
      initial.stickyNotes.push({
        ...geometry,
        kind: 'sticky_note',
        title: copy[`${item.prefix}Title`],
        body: copy[`${item.prefix}Body`],
        color: item.color as 'sage',
        material: item.treatment as 'tint',
      });
    if (item.kind === 'region')
      initial.backgroundLayers.push({
        ...geometry,
        name: copy[String(item.nameKey)] ?? '',
        fill: colorFills[String(item.color)]!,
        material: ({ area: 'solid', frame: 'frame', hatch: 'hatched' } as const)[
          item.treatment as 'area'
        ],
        opacity: 1,
      });
    if (item.kind === 'text')
      initial.annotations.push({
        ...geometry,
        kind: 'text',
        text: copy[String(item.textKey)],
        font_family: family,
        font_size: size[item.level],
        font_weight: ['title', 'headingText'].includes(String(item.level)) ? 560 : 400,
        color: '#6b7280',
        align: 'left',
      });
  }
  return initial;
}
