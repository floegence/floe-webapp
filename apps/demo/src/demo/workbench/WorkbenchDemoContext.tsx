import {
  createContext,
  createEffect,
  useContext,
  type Accessor,
  type JSX,
} from 'solid-js';
import { createStore, unwrap } from 'solid-js/store';
import { usePersisted } from '@floegence/floe-webapp-core';
import {
  WORKBENCH_DEFAULT_TEXT_FONT,
  WORKBENCH_TEXT_FONT_OPTIONS,
  sanitizeWorkbenchState,
  type WorkbenchTextAnnotationItem,
  type WorkbenchState,
} from '@floegence/floe-webapp-core/workbench';

export interface WorkbenchDemoContextValue {
  state: Accessor<WorkbenchState>;
  setState: (updater: (prev: WorkbenchState) => WorkbenchState) => void;
}

const WorkbenchDemoContext = createContext<WorkbenchDemoContextValue>();

export const DEMO_WORKBENCH_TEXT_FONT = WORKBENCH_TEXT_FONT_OPTIONS[1] ?? WORKBENCH_TEXT_FONT_OPTIONS[0]!;
export const DEMO_WORKBENCH_TEXT_SIZE = 45;
export const DEMO_WORKBENCH_TEXT_DEFAULTS = {
  font_family: DEMO_WORKBENCH_TEXT_FONT.fontFamily,
  font_size: DEMO_WORKBENCH_TEXT_SIZE,
  font_weight: DEMO_WORKBENCH_TEXT_FONT.fontWeight,
  width: 460,
  height: 108,
} as const;

const LEGACY_DEMO_WORKBENCH_TEXT_SIZE = 34;

function shouldUpgradeDemoTextSeed(annotation: WorkbenchTextAnnotationItem): boolean {
  if (
    annotation.id !== 'wb-seed-text-1' ||
    annotation.text !== 'Release focus' ||
    annotation.updated_at_unix_ms !== annotation.created_at_unix_ms
  ) {
    return false;
  }

  const isLegacySeed =
    annotation.font_size === LEGACY_DEMO_WORKBENCH_TEXT_SIZE &&
    annotation.font_family === WORKBENCH_DEFAULT_TEXT_FONT.fontFamily;
  const isPreviousDemoSeed =
    annotation.font_size === DEMO_WORKBENCH_TEXT_SIZE &&
    annotation.font_family === DEMO_WORKBENCH_TEXT_FONT.fontFamily &&
    annotation.width < DEMO_WORKBENCH_TEXT_DEFAULTS.width;

  return isLegacySeed || isPreviousDemoSeed;
}

export function normalizeWorkbenchDemoState(state: WorkbenchState): WorkbenchState {
  return {
    ...state,
    annotations: (state.annotations ?? []).map((annotation) =>
      shouldUpgradeDemoTextSeed(annotation)
        ? {
          ...annotation,
          ...DEMO_WORKBENCH_TEXT_DEFAULTS,
          width: Math.max(annotation.width, DEMO_WORKBENCH_TEXT_DEFAULTS.width),
          height: Math.max(annotation.height, DEMO_WORKBENCH_TEXT_DEFAULTS.height),
        }
        : annotation
    ),
  };
}

export function WorkbenchDemoProvider(props: { children: JSX.Element }) {
  const [persistedState, setPersistedState] = usePersisted<WorkbenchState>(
    'demo.workbench.layered-state.v1',
    normalizeWorkbenchDemoState(sanitizeWorkbenchState(undefined))
  );

  const [store, setStore] = createStore<WorkbenchState>(
    normalizeWorkbenchDemoState(sanitizeWorkbenchState(persistedState()))
  );

  createEffect(() => {
    setPersistedState(sanitizeWorkbenchState(unwrap(store)));
  });

  const state: Accessor<WorkbenchState> = () => store;

  const setState = (updater: (prev: WorkbenchState) => WorkbenchState) => {
    const next = updater(unwrap(store));
    setStore(sanitizeWorkbenchState(next));
  };

  const value: WorkbenchDemoContextValue = { state, setState };

  return (
    <WorkbenchDemoContext.Provider value={value}>
      {props.children}
    </WorkbenchDemoContext.Provider>
  );
}

export function useWorkbenchDemo(): WorkbenchDemoContextValue {
  const context = useContext(WorkbenchDemoContext);
  if (!context) {
    throw new Error('useWorkbenchDemo must be used within WorkbenchDemoProvider');
  }
  return context;
}
