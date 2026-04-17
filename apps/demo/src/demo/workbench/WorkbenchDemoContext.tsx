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
  sanitizeWorkbenchState,
  type WorkbenchState,
} from '@floegence/floe-webapp-core/workbench';

export interface WorkbenchDemoContextValue {
  state: Accessor<WorkbenchState>;
  setState: (updater: (prev: WorkbenchState) => WorkbenchState) => void;
}

const WorkbenchDemoContext = createContext<WorkbenchDemoContextValue>();

export function WorkbenchDemoProvider(props: { children: JSX.Element }) {
  const [persistedState, setPersistedState] = usePersisted<WorkbenchState>(
    'demo.workbench.state.v1',
    sanitizeWorkbenchState(undefined)
  );

  const [store, setStore] = createStore<WorkbenchState>(
    sanitizeWorkbenchState(persistedState())
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
