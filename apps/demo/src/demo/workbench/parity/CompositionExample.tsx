import { createSignal, onCleanup, onMount } from 'solid-js';
import { render } from 'solid-js/web';
import {
  WorkbenchSurface,
  createDefaultWorkbenchState,
  type WorkbenchState,
  type WorkbenchSelection,
  type WorkbenchCompositionMessages,
} from '@floegence/floe-webapp-core/workbench';
import { builtInShellThemePresets } from '@floegence/floe-webapp-core';
import fixtures from './reference-fixtures.json';
import './example.css';

const params = new URLSearchParams(location.search);
const locale = params.get('lang') === 'en-US' ? 'en-US' : 'zh-CN';
const copy = fixtures.copy[locale] as Record<string, string>;
const definitions =
  params.get('sample') === 'regions'
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
for (const entry of definitions) {
  const item = entry as unknown as Record<string, string | number>;
  const geometry = {
    id: String(item.id),
    x: Number(item.x),
    y: Number(item.y),
    width: Number(item.w),
    height: Number(item.h),
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
const aliases: Record<string, string> = {
  stickyTitle: 'noteTitleLabel',
  stickyBody: 'noteBodyLabel',
  textContent: 'freeTextLabel',
  regionName: 'regionTitle',
  addName: 'addRegionName',
  clearName: 'clearRegionName',
  editName: 'regionTitle',
  solid: 'area',
  hatched: 'hatch',
  solidDescription: 'areaDescription',
  hatchedDescription: 'hatchDescription',
  heading: 'headingText',
  body: 'bodyText',
};
const messages: Partial<WorkbenchCompositionMessages> = { ...copy };
for (const [key, value] of Object.entries(aliases))
  (messages as Record<string, string>)[key] = copy[value];
Object.assign(
  messages,
  locale === 'zh-CN'
    ? {
        stickyColor: '使用便笺颜色：{value}',
        useStickyMaterial: '使用便笺材质：{value}',
        regionColor: '使用区域颜色：{value}',
        useRegionMaterial: '使用区域材质：{value}',
        dragSticky: '移动便笺',
        resizeSticky: '调整便笺大小',
        deleteSticky: '删除便笺',
        deleteRegion: '删除区域',
        deleteText: '删除文字',
        moveText: '移动文字',
        more: '更多选项',
        opacity: '不透明度',
      }
    : {}
);
const theme =
  builtInShellThemePresets.find((p) => p.name === params.get('theme')) ??
  builtInShellThemePresets.find((p) => p.name === 'paper')!;
document.documentElement.dataset.floeShellTheme = theme.name;
document.documentElement.classList.add(theme.mode ?? 'light');
document.documentElement.dataset.floeSurfaceStyle = params.get('surface') ?? 'standard';
document.documentElement.lang = locale;
const [state, setState] = createSignal<WorkbenchState>(initial);
const selection = (id: string): WorkbenchSelection | null =>
  initial.stickyNotes?.some((n) => n.id === id)
    ? { kind: 'sticky_note', id }
    : initial.annotations?.some((n) => n.id === id)
      ? { kind: 'annotation', id }
      : initial.backgroundLayers?.some((n) => n.id === id)
        ? { kind: 'background_layer', id }
        : null;
function frame() {
  const id = params.get('object') ?? 'blank-region';
  const object = [
    ...initial.stickyNotes!,
    ...initial.annotations!,
    ...initial.backgroundLayers!,
  ].find((n) => n.id === id);
  const scale = Number(params.get('scale') || '.8');
  if (object)
    setState((s) => ({
      ...s,
      viewport: {
        x: innerWidth / 2 - (object.x + object.width / 2) * scale,
        y: Math.max(260, innerHeight / 2 - (object.height * scale) / 2) - object.y * scale,
        scale,
      },
      selectedObject: selection(id),
    }));
}
Object.assign(window, {
  compositionExample: { state, setState, themes: builtInShellThemePresets },
});
function Example() {
  onMount(() => {
    frame();
    const timer = setTimeout(() => {
      if (params.get('tools') === 'style')
        document.querySelector<HTMLButtonElement>('.workbench-treatment-trigger')?.click();
    }, 250);
    window.addEventListener('resize', frame);
    onCleanup(() => {
      clearTimeout(timer);
      window.removeEventListener('resize', frame);
    });
  });
  return (
    <WorkbenchSurface
      state={state}
      setState={setState}
      widgetDefinitions={[]}
      compositionMessages={messages}
    />
  );
}
render(() => <Example />, document.getElementById('root')!);
