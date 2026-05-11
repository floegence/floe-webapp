import {
  DEFAULT_WORKBENCH_VIEWPORT,
  WORKBENCH_BACKGROUND_REGION_FILTER_ID,
  WORKBENCH_LAYER_COMPONENT_FILTER_IDS,
  type WorkbenchAnnotationItem,
  type WorkbenchBackgroundLayer,
  type WorkbenchBackgroundMaterial,
  type WorkbenchDockToolId,
  type WorkbenchInteractionMode,
  type WorkbenchProjectedSurfaceScaleBehavior,
  type WorkbenchProjectedRect,
  type WorkbenchSelection,
  type WorkbenchState,
  type WorkbenchStickyNoteColor,
  type WorkbenchStickyNoteItem,
  type WorkbenchTextAnnotationAlign,
  type WorkbenchTextAnnotationItem,
  type WorkbenchViewport,
  type WorkbenchWidgetDefinition,
  type WorkbenchWidgetItem,
  type WorkbenchWidgetRenderMode,
  type WorkbenchWidgetSurfaceMetrics,
} from './types';
import {
  WORKBENCH_BACKGROUND_MATERIALS,
  WORKBENCH_DEFAULT_BACKGROUND_MATERIAL,
  WORKBENCH_DEFAULT_REGION_FILL,
  WORKBENCH_DEFAULT_STICKY_NOTE_COLOR,
  WORKBENCH_DEFAULT_TEXT_COLOR,
  WORKBENCH_DEFAULT_TEXT_FONT,
  WORKBENCH_REGION_FILL_OPTIONS,
  WORKBENCH_STICKY_NOTE_COLORS,
  WORKBENCH_TEXT_COLOR_OPTIONS,
  resolveWorkbenchTextFontOption,
} from './workbenchOptions';
import {
  createWorkbenchFilterState,
  getWidgetEntry,
  isValidWorkbenchWidgetType,
  resolveWorkbenchWidgetDefinitions,
} from './widgets/widgetRegistry';
import { DEFAULT_WORKBENCH_THEME, isWorkbenchThemeId } from './workbenchThemes';

export function createWorkbenchId(): string {
  const crypto = globalThis.crypto;
  if (crypto && typeof crypto.randomUUID === 'function') {
    return `wb-${crypto.randomUUID()}`;
  }
  return `wb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function resolveWorkbenchWidgetRenderMode(
  definition: WorkbenchWidgetDefinition,
): WorkbenchWidgetRenderMode {
  return definition.renderMode ?? 'canvas_scaled';
}

export function resolveWorkbenchProjectedSurfaceScaleBehavior(
  definition: WorkbenchWidgetDefinition,
): WorkbenchProjectedSurfaceScaleBehavior {
  return definition.projectedSurfaceScaleBehavior ?? 'stable_transform';
}

export interface CreateWorkbenchProjectedRectInput {
  widgetId: string;
  worldX: number;
  worldY: number;
  worldWidth: number;
  worldHeight: number;
  viewport: WorkbenchViewport;
}

export function createWorkbenchProjectedRect(
  input: CreateWorkbenchProjectedRectInput,
): WorkbenchProjectedRect {
  const viewportScale =
    Number.isFinite(input.viewport.scale) && input.viewport.scale > 0 ? input.viewport.scale : 1;
  const devicePixelRatio =
    typeof window !== 'undefined' &&
    Number.isFinite(window.devicePixelRatio) &&
    window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1;
  const screenX =
    Math.round((input.viewport.x + input.worldX * viewportScale) * devicePixelRatio) /
    devicePixelRatio;
  const screenY =
    Math.round((input.viewport.y + input.worldY * viewportScale) * devicePixelRatio) /
    devicePixelRatio;

  return {
    widgetId: input.widgetId,
    worldX: input.worldX,
    worldY: input.worldY,
    worldWidth: input.worldWidth,
    worldHeight: input.worldHeight,
    screenX,
    screenY,
    screenWidth: input.worldWidth * viewportScale,
    screenHeight: input.worldHeight * viewportScale,
    viewportScale,
  };
}

export function createWorkbenchWidgetSurfaceMetrics(
  input: CreateWorkbenchProjectedRectInput & { ready: boolean },
): WorkbenchWidgetSurfaceMetrics {
  return {
    ready: input.ready,
    rect: createWorkbenchProjectedRect(input),
  };
}

export function sanitizeViewport(viewport: Partial<WorkbenchViewport> | undefined): WorkbenchViewport {
  if (!viewport) return { ...DEFAULT_WORKBENCH_VIEWPORT };
  return {
    x: Number.isFinite(viewport.x) ? viewport.x! : 0,
    y: Number.isFinite(viewport.y) ? viewport.y! : 0,
    scale: Number.isFinite(viewport.scale) && viewport.scale! > 0 ? viewport.scale! : 1,
  };
}

export function sanitizeFilters(
  filters: Partial<Record<string, boolean>> | undefined,
  widgetDefinitions?: readonly WorkbenchWidgetDefinition[]
): Record<string, boolean> {
  const next = createWorkbenchFilterState(widgetDefinitions, filters);
  for (const id of WORKBENCH_LAYER_COMPONENT_FILTER_IDS) {
    next[id] = typeof filters?.[id] === 'boolean' ? Boolean(filters[id]) : true;
  }
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function compact(value: unknown): string {
  return String(value ?? '').trim();
}

function finiteNumber(value: unknown, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function positiveNumber(value: unknown, fallback: number): number {
  const next = finiteNumber(value, fallback);
  return next > 0 ? next : fallback;
}

function normalizeObjectId(value: unknown, prefix: string): string {
  const id = compact(value);
  return id.length > 0 && id.length <= 128 ? id : `${prefix}-${createWorkbenchId()}`;
}

function sanitizeWorkbenchMode(value: unknown): WorkbenchInteractionMode {
  return value === 'annotation' || value === 'background' ? value : 'work';
}

function sanitizeActiveTool(value: unknown, mode: WorkbenchInteractionMode): WorkbenchDockToolId {
  const tool = compact(value);
  if (tool) return tool as WorkbenchDockToolId;
  if (mode === 'annotation' || mode === 'background') return WORKBENCH_BACKGROUND_REGION_FILTER_ID;
  return 'select';
}

function sanitizeStringOption<T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
): T {
  const next = compact(value);
  return options.includes(next as T) ? next as T : fallback;
}

function sanitizeStickyNoteColor(value: unknown): WorkbenchStickyNoteColor {
  return sanitizeStringOption(value, WORKBENCH_STICKY_NOTE_COLORS, WORKBENCH_DEFAULT_STICKY_NOTE_COLOR);
}

function sanitizeStickyNote(value: unknown): WorkbenchStickyNoteItem | null {
  if (!isRecord(value)) return null;
  const now = Date.now();
  const id = normalizeObjectId(value.id, 'sticky');
  return {
    id,
    kind: 'sticky_note',
    body: compact(value.body) || 'Untitled note',
    color: sanitizeStickyNoteColor(value.color),
    x: finiteNumber(value.x, 0),
    y: finiteNumber(value.y, 0),
    width: positiveNumber(value.width, 260),
    height: positiveNumber(value.height, 190),
    z_index: Math.max(0, Math.trunc(finiteNumber(value.z_index, 1))),
    created_at_unix_ms: Math.max(0, Math.trunc(finiteNumber(value.created_at_unix_ms, now))),
    updated_at_unix_ms: Math.max(0, Math.trunc(finiteNumber(value.updated_at_unix_ms, now))),
  };
}

function sanitizeStickyNotes(value: unknown): WorkbenchStickyNoteItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((entry) => sanitizeStickyNote(entry))
    .filter((entry): entry is WorkbenchStickyNoteItem => {
      if (!entry || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
}

const TEXT_ALIGNS: readonly WorkbenchTextAnnotationAlign[] = ['left', 'center', 'right'];

function sanitizeTextAlign(value: unknown): WorkbenchTextAnnotationAlign {
  return TEXT_ALIGNS.includes(value as WorkbenchTextAnnotationAlign)
    ? value as WorkbenchTextAnnotationAlign
    : 'left';
}

function sanitizeTextAnnotation(value: unknown): WorkbenchTextAnnotationItem | null {
  if (!isRecord(value)) return null;
  const now = Date.now();
  const font = resolveWorkbenchTextFontOption(value.font_family);
  return {
    id: normalizeObjectId(value.id, 'text'),
    kind: 'text',
    text: compact(value.text) || 'Text',
    font_family: font.fontFamily,
    font_size: Math.max(8, Math.min(160, Math.round(finiteNumber(value.font_size, 28)))),
    font_weight: font.fontWeight,
    color: sanitizeStringOption(value.color, WORKBENCH_TEXT_COLOR_OPTIONS, WORKBENCH_DEFAULT_TEXT_COLOR),
    align: sanitizeTextAlign(value.align),
    x: finiteNumber(value.x, 0),
    y: finiteNumber(value.y, 0),
    width: positiveNumber(value.width, 280),
    height: positiveNumber(value.height, 84),
    z_index: Math.max(0, Math.trunc(finiteNumber(value.z_index, 1))),
    created_at_unix_ms: Math.max(0, Math.trunc(finiteNumber(value.created_at_unix_ms, now))),
    updated_at_unix_ms: Math.max(0, Math.trunc(finiteNumber(value.updated_at_unix_ms, now))),
  };
}

function sanitizeAnnotations(value: unknown): WorkbenchAnnotationItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((entry) => sanitizeTextAnnotation(entry))
    .filter((entry): entry is WorkbenchTextAnnotationItem => {
      if (!entry || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
}

function sanitizeBackgroundMaterial(value: unknown): WorkbenchBackgroundMaterial {
  return sanitizeStringOption(
    value,
    WORKBENCH_BACKGROUND_MATERIALS,
    WORKBENCH_DEFAULT_BACKGROUND_MATERIAL,
  );
}

function sanitizeBackgroundLayer(value: unknown): WorkbenchBackgroundLayer | null {
  if (!isRecord(value)) return null;
  const now = Date.now();
  return {
    id: normalizeObjectId(value.id, 'region'),
    name: compact(value.name) || 'Canvas region',
    fill: sanitizeStringOption(value.fill, WORKBENCH_REGION_FILL_OPTIONS, WORKBENCH_DEFAULT_REGION_FILL),
    opacity: Math.max(0.08, Math.min(1, finiteNumber(value.opacity, 0.72))),
    material: sanitizeBackgroundMaterial(value.material),
    x: finiteNumber(value.x, 0),
    y: finiteNumber(value.y, 0),
    width: positiveNumber(value.width, 560),
    height: positiveNumber(value.height, 360),
    z_index: Math.max(0, Math.trunc(finiteNumber(value.z_index, 1))),
    created_at_unix_ms: Math.max(0, Math.trunc(finiteNumber(value.created_at_unix_ms, now))),
    updated_at_unix_ms: Math.max(0, Math.trunc(finiteNumber(value.updated_at_unix_ms, now))),
  };
}

function sanitizeBackgroundLayers(value: unknown): WorkbenchBackgroundLayer[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((entry) => sanitizeBackgroundLayer(entry))
    .filter((entry): entry is WorkbenchBackgroundLayer => {
      if (!entry || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
}

function sanitizeSelection(
  value: unknown,
  widgets: readonly WorkbenchWidgetItem[],
  stickyNotes: readonly WorkbenchStickyNoteItem[],
  annotations: readonly WorkbenchAnnotationItem[],
  backgroundLayers: readonly WorkbenchBackgroundLayer[],
  fallbackWidgetId: string | null,
): WorkbenchSelection | null {
  if (isRecord(value)) {
    const kind = compact(value.kind);
    const id = compact(value.id);
    if (kind === 'widget' && widgets.some((item) => item.id === id)) return { kind, id };
    if (kind === 'sticky_note' && stickyNotes.some((item) => item.id === id)) return { kind, id };
    if (kind === 'annotation' && annotations.some((item) => item.id === id)) return { kind, id };
    if (kind === 'background_layer' && backgroundLayers.some((item) => item.id === id)) {
      return { kind, id };
    }
  }
  return fallbackWidgetId ? { kind: 'widget', id: fallbackWidgetId } : null;
}

export interface SanitizeWorkbenchStateOptions {
  widgetDefinitions?: readonly WorkbenchWidgetDefinition[];
  createFallbackState?: () => WorkbenchState;
}

export function sanitizeWorkbenchState(
  input: unknown,
  options: SanitizeWorkbenchStateOptions = {}
): WorkbenchState {
  const widgetDefinitions = resolveWorkbenchWidgetDefinitions(options.widgetDefinitions);
  const createFallbackState = options.createFallbackState ?? (() => createDefaultWorkbenchState(widgetDefinitions));
  const state = input as Partial<WorkbenchState> | undefined;
  if (!state || state.version !== 1 || !Array.isArray(state.widgets)) {
    return createFallbackState();
  }

  const widgets: WorkbenchWidgetItem[] = state.widgets
    .filter(
      (w): w is WorkbenchWidgetItem =>
        !!w &&
        typeof w.id === 'string' &&
        isValidWorkbenchWidgetType(w.type, widgetDefinitions) &&
        typeof w.title === 'string'
    )
    .map((w) => {
      const entry = getWidgetEntry(w.type, widgetDefinitions);
      return {
        id: w.id,
        type: w.type,
        title: w.title,
        x: Number.isFinite(w.x) ? w.x : 0,
        y: Number.isFinite(w.y) ? w.y : 0,
        width: Number.isFinite(w.width) && w.width > 0 ? w.width : entry.defaultSize.width,
        height: Number.isFinite(w.height) && w.height > 0 ? w.height : entry.defaultSize.height,
        z_index: Number.isFinite(w.z_index) && w.z_index >= 0 ? w.z_index : 1,
        created_at_unix_ms: Number.isFinite(w.created_at_unix_ms) ? w.created_at_unix_ms : Date.now(),
      };
    });

  const selectedWidgetId = typeof state.selectedWidgetId === 'string' && widgets.some((widget) => widget.id === state.selectedWidgetId)
    ? state.selectedWidgetId
    : null;
  const stickyNotes = sanitizeStickyNotes(state.stickyNotes);
  const annotations = sanitizeAnnotations(state.annotations);
  const backgroundLayers = sanitizeBackgroundLayers(state.backgroundLayers);
  const mode = sanitizeWorkbenchMode(state.mode);

  return {
    version: 1,
    widgets,
    viewport: sanitizeViewport(state.viewport),
    locked: typeof state.locked === 'boolean' ? state.locked : false,
    filters: sanitizeFilters(state.filters, widgetDefinitions),
    selectedWidgetId,
    theme: isWorkbenchThemeId(state.theme) ? state.theme : DEFAULT_WORKBENCH_THEME,
    mode,
    activeTool: sanitizeActiveTool(state.activeTool, mode),
    selectedObject: sanitizeSelection(
      state.selectedObject,
      widgets,
      stickyNotes,
      annotations,
      backgroundLayers,
      selectedWidgetId,
    ),
    stickyNotes,
    annotations,
    backgroundLayers,
  };
}

export function createDefaultWorkbenchState(
  widgetDefinitions?: readonly WorkbenchWidgetDefinition[]
): WorkbenchState {
  const definitions = resolveWorkbenchWidgetDefinitions(widgetDefinitions);
  const now = Date.now();
  const seedSpecs: ReadonlyArray<Readonly<{ type: string; title: string; x: number; y: number }>> = [
    { type: 'terminal', title: 'dev · terminal', x: 80, y: 80 },
    { type: 'file-browser', title: 'project · files', x: 600, y: 80 },
    { type: 'system-monitor', title: 'host · system monitor', x: 80, y: 420 },
    { type: 'log-viewer', title: 'services · logs', x: 540, y: 500 },
    { type: 'code-editor', title: 'Counter.tsx', x: 1000, y: 180 },
  ];

  const widgets = seedSpecs
    .filter((seed) => definitions.some((entry) => entry.type === seed.type))
    .map((seed, index) => {
      const entry = getWidgetEntry(seed.type, definitions);
      return {
        id: `wb-seed-${index + 1}`,
        type: seed.type,
        title: seed.title,
        x: seed.x,
        y: seed.y,
        width: entry.defaultSize.width,
        height: entry.defaultSize.height,
        z_index: index + 1,
        created_at_unix_ms: now - (seedSpecs.length - index) * 600000,
      } satisfies WorkbenchWidgetItem;
    });

  return {
    version: 1,
    widgets,
    viewport: { ...DEFAULT_WORKBENCH_VIEWPORT },
    locked: false,
    filters: createWorkbenchFilterState(definitions),
    selectedWidgetId: widgets[0]?.id ?? null,
    theme: DEFAULT_WORKBENCH_THEME,
    mode: 'work',
    activeTool: 'select',
    selectedObject: widgets[0] ? { kind: 'widget', id: widgets[0].id } : null,
    stickyNotes: [
      {
        id: 'wb-seed-sticky-1',
        kind: 'sticky_note',
        body: 'Confirm the rollout checklist before touching production.',
        color: WORKBENCH_DEFAULT_STICKY_NOTE_COLOR,
        x: 930,
        y: 620,
        width: 270,
        height: 170,
        z_index: widgets.length + 1,
        created_at_unix_ms: now - 250000,
        updated_at_unix_ms: now - 250000,
      },
    ],
    annotations: [
      {
        id: 'wb-seed-text-1',
        kind: 'text',
        text: 'Release focus',
        font_family: WORKBENCH_DEFAULT_TEXT_FONT.fontFamily,
        font_size: 34,
        font_weight: WORKBENCH_DEFAULT_TEXT_FONT.fontWeight,
        color: WORKBENCH_DEFAULT_TEXT_COLOR,
        align: 'left',
        x: 588,
        y: 378,
        width: 320,
        height: 82,
        z_index: 1,
        created_at_unix_ms: now - 240000,
        updated_at_unix_ms: now - 240000,
      },
    ],
    backgroundLayers: [
      {
        id: 'wb-seed-region-1',
        name: 'Review lane',
        fill: WORKBENCH_DEFAULT_REGION_FILL,
        opacity: 0.58,
        material: WORKBENCH_DEFAULT_BACKGROUND_MATERIAL,
        x: 512,
        y: 360,
        width: 760,
        height: 520,
        z_index: 1,
        created_at_unix_ms: now - 260000,
        updated_at_unix_ms: now - 260000,
      },
    ],
  };
}

export const WORKBENCH_CANVAS_ZOOM_STEP = 1.18;
export const WORKBENCH_CONTEXT_MENU_WIDTH_PX = 200;
export const WORKBENCH_MIN_SCALE = 0.2;
export const WORKBENCH_MAX_SCALE = 2.2;
export const WORKBENCH_VIEWPORT_FIT_PADDING_PX = 48;

export function createWorkbenchViewportCenteredOnWidget(options: {
  widget: WorkbenchWidgetItem;
  scale: number;
  frameWidth: number;
  frameHeight: number;
}): WorkbenchViewport {
  const nextScale = clampScale(options.scale, WORKBENCH_MIN_SCALE, WORKBENCH_MAX_SCALE);

  return {
    x: options.frameWidth / 2 - (options.widget.x + options.widget.width / 2) * nextScale,
    y: options.frameHeight / 2 - (options.widget.y + options.widget.height / 2) * nextScale,
    scale: nextScale,
  };
}

export function createWorkbenchViewportFitForWidget(options: {
  widget: WorkbenchWidgetItem;
  frameWidth: number;
  frameHeight: number;
  minScale?: number;
  maxScale?: number;
  paddingPx?: number;
}): WorkbenchViewport {
  const minScale = options.minScale ?? WORKBENCH_MIN_SCALE;
  const maxScale = options.maxScale ?? WORKBENCH_MAX_SCALE;
  const paddingPx = options.paddingPx ?? WORKBENCH_VIEWPORT_FIT_PADDING_PX;
  const availableWidth = Math.max(options.frameWidth - paddingPx * 2, 1);
  const availableHeight = Math.max(options.frameHeight - paddingPx * 2, 1);
  const targetScale = clampScale(
    Math.min(
      availableWidth / Math.max(options.widget.width, 1),
      availableHeight / Math.max(options.widget.height, 1),
    ),
    minScale,
    maxScale,
  );

  return createWorkbenchViewportCenteredOnWidget({
    widget: options.widget,
    scale: targetScale,
    frameWidth: options.frameWidth,
    frameHeight: options.frameHeight,
  });
}

export interface WorkbenchRenderLayerMap {
  byWidgetId: ReadonlyMap<string, number>;
  topRenderLayer: number;
}

function compareWorkbenchLayerRenderOrder(
  left: Pick<WorkbenchWidgetItem, 'id' | 'z_index' | 'created_at_unix_ms'>,
  right: Pick<WorkbenchWidgetItem, 'id' | 'z_index' | 'created_at_unix_ms'>,
): number {
  if (left.z_index !== right.z_index) {
    return left.z_index - right.z_index;
  }
  if (left.created_at_unix_ms !== right.created_at_unix_ms) {
    return left.created_at_unix_ms - right.created_at_unix_ms;
  }
  return left.id.localeCompare(right.id);
}

export function createWorkbenchRenderLayerMap(
  widgets: readonly Pick<WorkbenchWidgetItem, 'id' | 'z_index' | 'created_at_unix_ms'>[],
): WorkbenchRenderLayerMap {
  const ordered = [...widgets].sort(compareWorkbenchLayerRenderOrder);
  const byWidgetId = new Map<string, number>();

  for (const [index, item] of ordered.entries()) {
    byWidgetId.set(item.id, index + 1);
  }

  return {
    byWidgetId,
    topRenderLayer: Math.max(ordered.length, 1),
  };
}

export function createContextMenuPosition(options: {
  clientX: number;
  clientY: number;
  menuWidth: number;
  menuHeight: number;
}): { left: number; top: number } {
  const viewWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  let left = options.clientX;
  let top = options.clientY;

  if (left + options.menuWidth > viewWidth) {
    left = Math.max(0, viewWidth - options.menuWidth - 8);
  }
  if (top + options.menuHeight > viewHeight) {
    top = Math.max(0, viewHeight - options.menuHeight - 8);
  }

  return { left, top };
}

export function getTopZIndex(widgets: readonly WorkbenchWidgetItem[]): number {
  return widgets.reduce((max, w) => Math.max(max, w.z_index), 1);
}

/** Spatial navigation: find nearest widget in a direction. */
export function findNearestWidget(
  widgets: readonly WorkbenchWidgetItem[],
  currentId: string | null,
  direction: 'up' | 'down' | 'left' | 'right',
  filters: Record<string, boolean>
): WorkbenchWidgetItem | null {
  const visible = widgets.filter((w) => filters[w.type]);
  if (visible.length === 0) return null;
  if (!currentId) return visible[0] ?? null;

  const current = visible.find((w) => w.id === currentId);
  if (!current) return visible[0] ?? null;

  const cx = current.x + current.width / 2;
  const cy = current.y + current.height / 2;

  let best: WorkbenchWidgetItem | null = null;
  let bestScore = Infinity;

  for (const candidate of visible) {
    if (candidate.id === currentId) continue;

    const dx = candidate.x + candidate.width / 2 - cx;
    const dy = candidate.y + candidate.height / 2 - cy;

    let isInDirection = false;
    switch (direction) {
      case 'up': isInDirection = dy < -10; break;
      case 'down': isInDirection = dy > 10; break;
      case 'left': isInDirection = dx < -10; break;
      case 'right': isInDirection = dx > 10; break;
    }

    if (!isInDirection) continue;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(
      direction === 'up' || direction === 'down' ? Math.abs(dx) : Math.abs(dy),
      direction === 'up' || direction === 'down' ? Math.abs(dy) : Math.abs(dx)
    );

    const score = distance * (1 + angle * 1.5);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

export function clampScale(scale: number, min = WORKBENCH_MIN_SCALE, max = WORKBENCH_MAX_SCALE): number {
  return Math.max(min, Math.min(max, scale));
}

export function estimateContextMenuHeight(actionCount: number, separatorCount = 0): number {
  return 16 + Math.max(1, actionCount) * 32 + Math.max(0, separatorCount) * 9;
}
