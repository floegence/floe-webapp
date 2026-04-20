import {
  DEFAULT_WORKBENCH_VIEWPORT,
  type WorkbenchProjectedRect,
  type WorkbenchState,
  type WorkbenchViewport,
  type WorkbenchWidgetDefinition,
  type WorkbenchWidgetItem,
  type WorkbenchWidgetRenderMode,
  type WorkbenchWidgetSurfaceMetrics,
  type WorkbenchWidgetType,
} from './types';
import {
  createWorkbenchFilterState,
  getWidgetEntry,
  isValidWorkbenchWidgetType,
  resolveWorkbenchWidgetDefinitions,
} from './widgets/widgetRegistry';

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

  return {
    widgetId: input.widgetId,
    worldX: input.worldX,
    worldY: input.worldY,
    worldWidth: input.worldWidth,
    worldHeight: input.worldHeight,
    screenX: input.viewport.x + input.worldX * viewportScale,
    screenY: input.viewport.y + input.worldY * viewportScale,
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
  filters: Partial<Record<WorkbenchWidgetType, boolean>> | undefined,
  widgetDefinitions?: readonly WorkbenchWidgetDefinition[]
): Record<WorkbenchWidgetType, boolean> {
  return createWorkbenchFilterState(widgetDefinitions, filters);
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

  return {
    version: 1,
    widgets,
    viewport: sanitizeViewport(state.viewport),
    locked: typeof state.locked === 'boolean' ? state.locked : false,
    filters: sanitizeFilters(state.filters, widgetDefinitions),
    selectedWidgetId,
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
  };
}

export const WORKBENCH_CANVAS_ZOOM_STEP = 1.18;
export const WORKBENCH_CONTEXT_MENU_WIDTH_PX = 200;

export interface WorkbenchRenderLayerMap {
  byWidgetId: ReadonlyMap<string, number>;
  topRenderLayer: number;
}

function compareWorkbenchWidgetRenderOrder(
  left: WorkbenchWidgetItem,
  right: WorkbenchWidgetItem,
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
  widgets: readonly WorkbenchWidgetItem[],
): WorkbenchRenderLayerMap {
  const ordered = [...widgets].sort(compareWorkbenchWidgetRenderOrder);
  const byWidgetId = new Map<string, number>();

  for (const [index, widget] of ordered.entries()) {
    byWidgetId.set(widget.id, index + 1);
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
  filters: Record<WorkbenchWidgetType, boolean>
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

export function clampScale(scale: number, min = 0.45, max = 2.2): number {
  return Math.max(min, Math.min(max, scale));
}

export function estimateContextMenuHeight(actionCount: number, separatorCount = 0): number {
  return 16 + Math.max(1, actionCount) * 32 + Math.max(0, separatorCount) * 9;
}
