import { createContext, createMemo, onCleanup, useContext, type JSX } from 'solid-js';

export interface WorkbenchWidgetHeaderProps {
  /** Actions rendered once in the owning widget's title bar. */
  actions: JSX.Element;
  /** Full title or resource location displayed on title hover. */
  titleTooltip?: string;
}

export const WorkbenchWidgetHeaderContext =
  createContext<(contribution: WorkbenchWidgetHeaderProps) => () => void>();

/** Contribute title-bar presentation from a widget body without moving its state. */
export function WorkbenchWidgetHeader(props: WorkbenchWidgetHeaderProps): JSX.Element {
  const register = useContext(WorkbenchWidgetHeaderContext);
  if (!register)
    throw new Error('WorkbenchWidgetHeader must be rendered inside a Workbench widget');
  // Resolve JSX under the body owner so actions retain its providers and cleanup.
  const actions = createMemo(() => props.actions);
  const titleTooltip = createMemo(() => props.titleTooltip);
  onCleanup(
    register({
      get actions() {
        return actions();
      },
      get titleTooltip() {
        return titleTooltip();
      },
    })
  );
  return null;
}
