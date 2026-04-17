import {
  DEFAULT_FILTERS,
  DEFAULT_WORKBENCH_VIEWPORT,
  type WorkbenchState,
  type WorkbenchViewport,
  type WorkbenchWidgetItem,
  type WorkbenchWidgetType,
  WORKBENCH_WIDGET_TYPES,
} from './types';

export function createWorkbenchId(): string {
  const crypto = globalThis.crypto;
  if (crypto && typeof crypto.randomUUID === 'function') {
    return `wb-${crypto.randomUUID()}`;
  }
  return `wb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
  filters: Partial<Record<WorkbenchWidgetType, boolean>> | undefined
): Record<WorkbenchWidgetType, boolean> {
  if (!filters) return { ...DEFAULT_FILTERS };
  const result = { ...DEFAULT_FILTERS };
  for (const type of WORKBENCH_WIDGET_TYPES) {
    if (typeof filters[type] === 'boolean') {
      result[type] = filters[type];
    }
  }
  return result;
}

function isValidWidgetType(type: unknown): type is WorkbenchWidgetType {
  return typeof type === 'string' && WORKBENCH_WIDGET_TYPES.includes(type as WorkbenchWidgetType);
}

export function sanitizeWorkbenchState(input: unknown): WorkbenchState {
  const state = input as Partial<WorkbenchState> | undefined;
  if (!state || state.version !== 1 || !Array.isArray(state.widgets)) {
    return createDefaultWorkbenchState();
  }

  const widgets: WorkbenchWidgetItem[] = state.widgets
    .filter(
      (w): w is WorkbenchWidgetItem =>
        !!w &&
        typeof w.id === 'string' &&
        isValidWidgetType(w.type) &&
        typeof w.title === 'string'
    )
    .map((w) => ({
      id: w.id,
      type: w.type,
      title: w.title,
      x: Number.isFinite(w.x) ? w.x : 0,
      y: Number.isFinite(w.y) ? w.y : 0,
      width: Number.isFinite(w.width) && w.width > 0 ? w.width : 300,
      height: Number.isFinite(w.height) && w.height > 0 ? w.height : 200,
      z_index: Number.isFinite(w.z_index) && w.z_index >= 0 ? w.z_index : 1,
      created_at_unix_ms: Number.isFinite(w.created_at_unix_ms) ? w.created_at_unix_ms : Date.now(),
    }));

  return {
    version: 1,
    widgets,
    viewport: sanitizeViewport(state.viewport),
    locked: typeof state.locked === 'boolean' ? state.locked : false,
    filters: sanitizeFilters(state.filters),
    selectedWidgetId:
      typeof state.selectedWidgetId === 'string' ? state.selectedWidgetId : null,
  };
}

export function createDefaultWorkbenchState(): WorkbenchState {
  const now = Date.now();
  return {
    version: 1,
    widgets: [
      {
        id: 'wb-seed-terminal',
        type: 'terminal',
        title: 'dev · terminal',
        x: 80,
        y: 80,
        width: 480,
        height: 300,
        z_index: 1,
        created_at_unix_ms: now - 3600000,
      },
      {
        id: 'wb-seed-files',
        type: 'file-browser',
        title: 'project · files',
        x: 600,
        y: 80,
        width: 360,
        height: 380,
        z_index: 2,
        created_at_unix_ms: now - 3000000,
      },
      {
        id: 'wb-seed-monitor',
        type: 'system-monitor',
        title: 'host · system monitor',
        x: 80,
        y: 420,
        width: 420,
        height: 260,
        z_index: 3,
        created_at_unix_ms: now - 2400000,
      },
      {
        id: 'wb-seed-logs',
        type: 'log-viewer',
        title: 'services · logs',
        x: 540,
        y: 500,
        width: 520,
        height: 240,
        z_index: 4,
        created_at_unix_ms: now - 1800000,
      },
      {
        id: 'wb-seed-code',
        type: 'code-editor',
        title: 'Counter.tsx',
        x: 1000,
        y: 180,
        width: 500,
        height: 340,
        z_index: 5,
        created_at_unix_ms: now - 1200000,
      },
    ],
    viewport: { ...DEFAULT_WORKBENCH_VIEWPORT },
    locked: false,
    filters: { ...DEFAULT_FILTERS },
    selectedWidgetId: null,
  };
}

export const WORKBENCH_CANVAS_ZOOM_STEP = 1.18;
export const WORKBENCH_CONTEXT_MENU_WIDTH_PX = 200;

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
