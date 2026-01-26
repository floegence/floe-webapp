import { createContext, untrack, useContext, type Accessor, type JSX } from 'solid-js';

export interface ViewActivationContextValue {
  id: string;
  active: Accessor<boolean>;
  activationSeq: Accessor<number>;
}

const ViewActivationContext = createContext<ViewActivationContextValue>();

export interface ViewActivationProviderProps {
  value: ViewActivationContextValue;
  children: JSX.Element;
}

export function ViewActivationProvider(props: ViewActivationProviderProps) {
  const value = untrack(() => props.value);
  return (
    <ViewActivationContext.Provider value={value}>
      {props.children}
    </ViewActivationContext.Provider>
  );
}

export function useViewActivation(): ViewActivationContextValue {
  const ctx = useContext(ViewActivationContext);
  if (!ctx) {
    throw new Error('ViewActivationContext not found. Wrap your view with <ViewActivationProvider />.');
  }
  return ctx;
}
