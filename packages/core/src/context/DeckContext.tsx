import { createEffect, createSignal, type Accessor } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { createSimpleContext } from './createSimpleContext';
import { debouncedSave, load } from '../utils/persist';
import type { GridPosition } from '../utils/gridCollision';
import { findFreePosition, hasCollision, constrainPosition } from '../utils/gridCollision';

/**
 * Widget instance on the deck
 */
export interface DeckWidget {
  id: string;
  type: string; // References WidgetDefinition.type
  position: GridPosition;
  config?: Record<string, unknown>;
  title?: string;
}

/**
 * Deck layout (saveable)
 */
export interface DeckLayout {
  id: string;
  name: string;
  widgets: DeckWidget[];
  isPreset?: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Drag state for a widget being moved
 */
export interface DragState {
  widgetId: string;
  originalPosition: GridPosition;
  currentPosition: GridPosition;
  /** Pixel offset for smooth visual following */
  pixelOffset: { x: number; y: number };
  startX: number;
  startY: number;
}

/**
 * Resize state for a widget being resized
 */
export interface ResizeState {
  widgetId: string;
  edge: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  originalPosition: GridPosition;
  currentPosition: GridPosition;
  startX: number;
  startY: number;
}

interface DeckStore {
  layouts: DeckLayout[];
  activeLayoutId: string;
  editMode: boolean;
}

export interface DeckContextValue {
  // Layout management
  layouts: Accessor<DeckLayout[]>;
  activeLayoutId: Accessor<string>;
  activeLayout: Accessor<DeckLayout | undefined>;
  setActiveLayout: (id: string) => void;
  createLayout: (name: string, widgets?: DeckWidget[]) => DeckLayout;
  duplicateLayout: (id: string, newName: string) => DeckLayout | undefined;
  deleteLayout: (id: string) => void;
  renameLayout: (id: string, name: string) => void;

  // Edit mode
  editMode: Accessor<boolean>;
  setEditMode: (enabled: boolean) => void;
  toggleEditMode: () => void;

  // Widget management
  addWidget: (type: string, position?: Partial<GridPosition>, config?: Record<string, unknown>) => string | undefined;
  removeWidget: (widgetId: string) => void;
  updateWidgetPosition: (widgetId: string, position: GridPosition) => void;
  updateWidgetConfig: (widgetId: string, config: Record<string, unknown>) => void;
  updateWidgetTitle: (widgetId: string, title: string) => void;
  /** Change widget type while preserving position */
  changeWidgetType: (widgetId: string, newType: string) => void;

  // Drag state
  dragState: Accessor<DragState | null>;
  startDrag: (widgetId: string, startX: number, startY: number) => void;
  updateDrag: (currentPosition: GridPosition, pixelOffset: { x: number; y: number }) => void;
  endDrag: (commit: boolean) => void;

  // Resize state
  resizeState: Accessor<ResizeState | null>;
  startResize: (
    widgetId: string,
    edge: ResizeState['edge'],
    startX: number,
    startY: number
  ) => void;
  updateResize: (currentPosition: GridPosition) => void;
  endResize: (commit: boolean) => void;

  // Utilities
  getWidgetMinConstraints: (type: string) => { minColSpan: number; minRowSpan: number };
}

const STORAGE_KEY = 'deck';

// Default presets (24-column grid, 40px row height)
const DEFAULT_PRESETS: DeckLayout[] = [
  {
    id: 'preset-default',
    name: 'Default',
    isPreset: true,
    widgets: [
      { id: 'w1', type: 'metrics', position: { col: 0, row: 0, colSpan: 12, rowSpan: 6 } },
      { id: 'w2', type: 'terminal', position: { col: 12, row: 0, colSpan: 12, rowSpan: 6 } },
      { id: 'w3', type: 'metrics', position: { col: 0, row: 6, colSpan: 24, rowSpan: 6 } },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'preset-focus',
    name: 'Focus',
    isPreset: true,
    widgets: [
      { id: 'w1', type: 'terminal', position: { col: 0, row: 0, colSpan: 24, rowSpan: 12 } },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'preset-monitoring',
    name: 'Monitoring',
    isPreset: true,
    widgets: [
      { id: 'w1', type: 'metrics', position: { col: 0, row: 0, colSpan: 12, rowSpan: 6 } },
      { id: 'w2', type: 'metrics', position: { col: 12, row: 0, colSpan: 12, rowSpan: 6 } },
      { id: 'w3', type: 'metrics', position: { col: 0, row: 6, colSpan: 12, rowSpan: 6 } },
      { id: 'w4', type: 'metrics', position: { col: 12, row: 6, colSpan: 12, rowSpan: 6 } },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'preset-development',
    name: 'Development',
    isPreset: true,
    widgets: [
      { id: 'w1', type: 'terminal', position: { col: 0, row: 0, colSpan: 12, rowSpan: 6 } },
      { id: 'w2', type: 'terminal', position: { col: 12, row: 0, colSpan: 12, rowSpan: 6 } },
      { id: 'w3', type: 'metrics', position: { col: 0, row: 6, colSpan: 24, rowSpan: 6 } },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const DEFAULT_STATE: DeckStore = {
  layouts: DEFAULT_PRESETS,
  activeLayoutId: 'preset-default',
  editMode: false,
};

// Widget type to constraints mapping (24-column grid, 40px row height)
const DEFAULT_CONSTRAINTS: Record<string, { minColSpan: number; minRowSpan: number }> = {
  metrics: { minColSpan: 6, minRowSpan: 4 },
  terminal: { minColSpan: 8, minRowSpan: 4 },
};

export const { Provider: DeckProvider, use: useDeck } =
  createSimpleContext<DeckContextValue>({
    name: 'Deck',
    init: createDeckService,
  });

export function createDeckService(): DeckContextValue {
  // Load persisted state (merge with presets to ensure presets exist)
  const persisted = load<Partial<DeckStore>>(STORAGE_KEY, {});

  // Merge persisted layouts with presets (presets always come first, user layouts appended)
  const userLayouts = (persisted.layouts ?? []).filter((l) => !l.isPreset);
  const initialLayouts = [...DEFAULT_PRESETS, ...userLayouts];

  const initialState: DeckStore = {
    layouts: initialLayouts,
    activeLayoutId: persisted.activeLayoutId ?? DEFAULT_STATE.activeLayoutId,
    editMode: false,
  };

  const [store, setStore] = createStore<DeckStore>(initialState);

  // Drag/resize state (not persisted)
  const [dragState, setDragState] = createSignal<DragState | null>(null);
  const [resizeState, setResizeState] = createSignal<ResizeState | null>(null);

  // Persist layout changes
  createEffect(() => {
    const state = {
      layouts: store.layouts,
      activeLayoutId: store.activeLayoutId,
    };
    debouncedSave(STORAGE_KEY, state);
  });

  // Helper to get current layout
  const getActiveLayout = () => store.layouts.find((l) => l.id === store.activeLayoutId);

  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    // Layout management
    layouts: () => store.layouts,
    activeLayoutId: () => store.activeLayoutId,
    activeLayout: getActiveLayout,

    setActiveLayout: (id: string) => {
      if (store.layouts.some((l) => l.id === id)) {
        setStore('activeLayoutId', id);
      }
    },

    createLayout: (name: string, widgets?: DeckWidget[]) => {
      const layout: DeckLayout = {
        id: generateId(),
        name,
        widgets: widgets ?? [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setStore(
        produce((s) => {
          s.layouts.push(layout);
          s.activeLayoutId = layout.id;
        })
      );
      return layout;
    },

    duplicateLayout: (id: string, newName: string) => {
      const source = store.layouts.find((l) => l.id === id);
      if (!source) return undefined;

      const layout: DeckLayout = {
        id: generateId(),
        name: newName,
        widgets: source.widgets.map((w) => ({ ...w, id: generateId() })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setStore(
        produce((s) => {
          s.layouts.push(layout);
          s.activeLayoutId = layout.id;
        })
      );
      return layout;
    },

    deleteLayout: (id: string) => {
      const layout = store.layouts.find((l) => l.id === id);
      if (!layout || layout.isPreset) return; // Cannot delete presets

      setStore(
        produce((s) => {
          const idx = s.layouts.findIndex((l) => l.id === id);
          if (idx !== -1) {
            s.layouts.splice(idx, 1);
            // Switch to default if deleting active
            if (s.activeLayoutId === id) {
              s.activeLayoutId = 'preset-default';
            }
          }
        })
      );
    },

    renameLayout: (id: string, name: string) => {
      const layout = store.layouts.find((l) => l.id === id);
      if (!layout || layout.isPreset) return; // Cannot rename presets

      setStore(
        produce((s) => {
          const l = s.layouts.find((l) => l.id === id);
          if (l) {
            l.name = name;
            l.updatedAt = Date.now();
          }
        })
      );
    },

    // Edit mode
    editMode: () => store.editMode,
    setEditMode: (enabled: boolean) => setStore('editMode', enabled),
    toggleEditMode: () => setStore('editMode', !store.editMode),

    // Widget management
    addWidget: (type: string, position?: Partial<GridPosition>, config?: Record<string, unknown>) => {
      const layout = getActiveLayout();
      if (!layout) return undefined;

      const constraints = DEFAULT_CONSTRAINTS[type] ?? { minColSpan: 2, minRowSpan: 2 };
      const defaultSpan = {
        colSpan: position?.colSpan ?? Math.max(constraints.minColSpan, 4),
        rowSpan: position?.rowSpan ?? Math.max(constraints.minRowSpan, 3),
      };

      // Find free position if not specified
      const finalPosition: GridPosition =
        position?.col !== undefined && position?.row !== undefined
          ? constrainPosition({ ...defaultSpan, col: position.col, row: position.row }, constraints.minColSpan, constraints.minRowSpan)
          : findFreePosition(layout.widgets, defaultSpan.colSpan, defaultSpan.rowSpan);

      const widgetId = generateId();
      const widget: DeckWidget = {
        id: widgetId,
        type,
        position: finalPosition,
        config,
      };

      setStore(
        produce((s) => {
          const l = s.layouts.find((l) => l.id === s.activeLayoutId);
          if (l) {
            l.widgets.push(widget);
            l.updatedAt = Date.now();
          }
        })
      );

      return widgetId;
    },

    removeWidget: (widgetId: string) => {
      setStore(
        produce((s) => {
          const l = s.layouts.find((l) => l.id === s.activeLayoutId);
          if (l) {
            const idx = l.widgets.findIndex((w) => w.id === widgetId);
            if (idx !== -1) {
              l.widgets.splice(idx, 1);
              l.updatedAt = Date.now();
            }
          }
        })
      );
    },

    updateWidgetPosition: (widgetId: string, position: GridPosition) => {
      setStore(
        produce((s) => {
          const l = s.layouts.find((l) => l.id === s.activeLayoutId);
          if (l) {
            const w = l.widgets.find((w) => w.id === widgetId);
            if (w) {
              // Check for collisions before committing
              if (!hasCollision(position, l.widgets, widgetId)) {
                w.position = position;
                l.updatedAt = Date.now();
              }
            }
          }
        })
      );
    },

    updateWidgetConfig: (widgetId: string, config: Record<string, unknown>) => {
      setStore(
        produce((s) => {
          const l = s.layouts.find((l) => l.id === s.activeLayoutId);
          if (l) {
            const w = l.widgets.find((w) => w.id === widgetId);
            if (w) {
              w.config = { ...w.config, ...config };
              l.updatedAt = Date.now();
            }
          }
        })
      );
    },

    updateWidgetTitle: (widgetId: string, title: string) => {
      setStore(
        produce((s) => {
          const l = s.layouts.find((l) => l.id === s.activeLayoutId);
          if (l) {
            const w = l.widgets.find((w) => w.id === widgetId);
            if (w) {
              w.title = title;
              l.updatedAt = Date.now();
            }
          }
        })
      );
    },

    changeWidgetType: (widgetId: string, newType: string) => {
      setStore(
        produce((s) => {
          const l = s.layouts.find((l) => l.id === s.activeLayoutId);
          if (l) {
            const w = l.widgets.find((w) => w.id === widgetId);
            if (w) {
              w.type = newType;
              // Clear config when changing type as it may not be compatible
              w.config = undefined;
              // Clear custom title to use new widget's default name
              w.title = undefined;
              l.updatedAt = Date.now();
            }
          }
        })
      );
    },

    // Drag state
    dragState,
    startDrag: (widgetId: string, startX: number, startY: number) => {
      const layout = getActiveLayout();
      const widget = layout?.widgets.find((w) => w.id === widgetId);
      if (!widget) return;

      setDragState({
        widgetId,
        originalPosition: { ...widget.position },
        currentPosition: { ...widget.position },
        pixelOffset: { x: 0, y: 0 },
        startX,
        startY,
      });
    },
    updateDrag: (currentPosition: GridPosition, pixelOffset: { x: number; y: number }) => {
      setDragState((prev) => (prev ? { ...prev, currentPosition, pixelOffset } : null));
    },
    endDrag: (commit: boolean) => {
      const state = dragState();
      if (!state) return;

      if (commit) {
        const layout = getActiveLayout();
        if (layout && !hasCollision(state.currentPosition, layout.widgets, state.widgetId)) {
          setStore(
            produce((s) => {
              const l = s.layouts.find((l) => l.id === s.activeLayoutId);
              if (l) {
                const w = l.widgets.find((w) => w.id === state.widgetId);
                if (w) {
                  w.position = state.currentPosition;
                  l.updatedAt = Date.now();
                }
              }
            })
          );
        }
      }

      setDragState(null);
    },

    // Resize state
    resizeState,
    startResize: (widgetId, edge, startX, startY) => {
      const layout = getActiveLayout();
      const widget = layout?.widgets.find((w) => w.id === widgetId);
      if (!widget) return;

      setResizeState({
        widgetId,
        edge,
        originalPosition: { ...widget.position },
        currentPosition: { ...widget.position },
        startX,
        startY,
      });
    },
    updateResize: (currentPosition: GridPosition) => {
      setResizeState((prev) => (prev ? { ...prev, currentPosition } : null));
    },
    endResize: (commit: boolean) => {
      const state = resizeState();
      if (!state) return;

      if (commit) {
        const layout = getActiveLayout();
        if (layout && !hasCollision(state.currentPosition, layout.widgets, state.widgetId)) {
          setStore(
            produce((s) => {
              const l = s.layouts.find((l) => l.id === s.activeLayoutId);
              if (l) {
                const w = l.widgets.find((w) => w.id === state.widgetId);
                if (w) {
                  w.position = state.currentPosition;
                  l.updatedAt = Date.now();
                }
              }
            })
          );
        }
      }

      setResizeState(null);
    },

    // Utilities
    getWidgetMinConstraints: (type: string) => {
      return DEFAULT_CONSTRAINTS[type] ?? { minColSpan: 2, minRowSpan: 2 };
    },
  };
}
