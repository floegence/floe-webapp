import { createContext, useContext, type Accessor, type JSX } from 'solid-js';

export type DialogPlacementMode = 'auto' | 'global';

export interface DialogPlacementProviderProps {
  /** Resolve dialogs from their nearest surface host, or force document-level modal placement. */
  mode: DialogPlacementMode;
  /** Default stacking layer for global dialogs in this placement scope. */
  globalZIndex?: number;
  children: JSX.Element;
}

interface DialogPlacementContextValue {
  mode: Accessor<DialogPlacementMode>;
  globalZIndex: Accessor<number | undefined>;
}

const DEFAULT_DIALOG_PLACEMENT: DialogPlacementContextValue = {
  mode: () => 'auto',
  globalZIndex: () => undefined,
};

const DialogPlacementContext = createContext<DialogPlacementContextValue>(DEFAULT_DIALOG_PLACEMENT);

export function DialogPlacementProvider(props: DialogPlacementProviderProps) {
  const value: DialogPlacementContextValue = {
    mode: () => props.mode,
    globalZIndex: () => props.globalZIndex,
  };

  return (
    <DialogPlacementContext.Provider value={value}>
      {props.children}
    </DialogPlacementContext.Provider>
  );
}

export function useDialogPlacement(): DialogPlacementContextValue {
  return useContext(DialogPlacementContext);
}
