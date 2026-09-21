import { createContext, untrack, useContext, type Accessor, type JSX } from 'solid-js';

export interface ViewActivationContextValue {
  id: string;
  /** Immediate presentation visibility. Custom providers default to their active accessor. */
  visible?: Accessor<boolean>;
  /** Activation effects may wait until after the visible content paints. */
  active: Accessor<boolean>;
  activationSeq: Accessor<number>;
}

const ViewActivationContext = createContext<Required<ViewActivationContextValue>>();

export interface ViewActivationProviderProps {
  value: ViewActivationContextValue;
  children: JSX.Element;
}

export function ViewActivationProvider(props: ViewActivationProviderProps) {
  const parent = useContext(ViewActivationContext);
  const local = untrack(() => props.value);
  const localVisible = local.visible ?? local.active;
  const value = {
    ...local,
    visible: () => (parent?.visible() ?? true) && localVisible(),
  };
  return (
    <ViewActivationContext.Provider value={value}>
      {props.children}
    </ViewActivationContext.Provider>
  );
}

export function useViewActivation(): Required<ViewActivationContextValue> {
  const ctx = useContext(ViewActivationContext);
  if (!ctx) {
    throw new Error('ViewActivationContext not found. Wrap your view with <ViewActivationProvider />.');
  }
  return ctx;
}
